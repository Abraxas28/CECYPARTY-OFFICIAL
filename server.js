
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const rooms = new Map();

function generarCodigo() {
    let code;

    do {
        code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (rooms.has(code));

    return code;
}

function enviarSalas() {
    for (const socket of io.sockets.sockets.values()) {
        const salas = [...rooms.values()]
            .filter(room => {
                const esMiembro = room.players.some(player => player.id === socket.id);
                return esMiembro || (!room.started && room.players.length < room.maxPlayers);
            })
            .map(room => ({
                code: room.code,
                mapName: room.mapName,
                players: room.players.length,
                playerNames: room.players.map(player => player.name),
                maxPlayers: room.maxPlayers,
                isMember: room.players.some(player => player.id === socket.id),
                isHost: room.hostId === socket.id,
                started: room.started
            }));

        socket.emit("roomList", salas);
    }
}

function eliminarJugador(socket) {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) {
        socket.data.roomCode = null;
        return;
    }

    room.players = room.players.filter(player => player.id !== socket.id);

    socket.leave(code);
    socket.data.roomCode = null;

    if (room.players.length === 0) {
        rooms.delete(code);
        socket.emit("roomClosed");
    } else {
        if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
        }

        io.to(code).emit("playerList", room.players);
    }

    socket.emit("roomLeft");
    enviarSalas();
}

io.on("connection", socket => {
    console.log("Conectado:", socket.id);

    socket.on("getRooms", () => {
        enviarSalas();
    });

    socket.on("createRoom", ({ playerName, mapName }) => {
        if (!playerName || !mapName) return;

        if (socket.data.roomCode) {
            eliminarJugador(socket);
        }

        const code = generarCodigo();

        const room = {
            code,
            mapName,
            hostId: socket.id,
            maxPlayers: 4,
            started: false,
            players: [
                {
                    id: socket.id,
                    name: playerName
                }
            ]
        };

        rooms.set(code, room);
        socket.join(code);
        socket.data.roomCode = code;

        socket.emit("roomCreated", {
            code,
            mapName,
            players: room.players
        });

        enviarSalas();

        console.log("Sala creada:", code);
    });

    socket.on("joinRoom", ({ code, playerName }) => {
        if (!code || !playerName) return;

        code = code.toUpperCase();

        const room = rooms.get(code);

        if (!room) {
            socket.emit("roomError", "Esa partida ya no existe.");
            return;
        }

        if (room.started) {
            socket.emit("roomError", "Esta partida ya comenzó.");
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit("roomError", "La partida está llena.");
            return;
        }

        if (room.players.some(player => player.id === socket.id)) {
            socket.emit("roomError", "Ya estás dentro de esta partida.");
            return;
        }

        if (socket.data.roomCode) {
            eliminarJugador(socket);
        }

        room.players.push({
            id: socket.id,
            name: playerName
        });

        socket.join(code);
        socket.data.roomCode = code;

        io.to(code).emit("playerList", room.players);

        socket.emit("joinedRoom", {
            code,
            mapName: room.mapName,
            players: room.players
        });

        enviarSalas();
    });

    socket.on("leaveRoom", () => {
        eliminarJugador(socket);
    });

    socket.on("configureRoom", ({ code, mapName, maxPlayers }) => {
        const room = rooms.get(code);

        if (!room) {
            socket.emit("roomError", "La partida ya no existe.");
            return;
        }

        if (room.hostId !== socket.id) {
            socket.emit("roomError", "Solo el anfitrión puede configurar la sala.");
            return;
        }

        if (room.started) {
            socket.emit("roomError", "No puedes configurar una partida iniciada.");
            return;
        }

        const capacidad = Number(maxPlayers);

        if (![2, 3, 4].includes(capacidad)) {
            socket.emit("roomError", "La sala debe permitir entre 2 y 4 jugadores.");
            return;
        }

        if (capacidad < room.players.length) {
            socket.emit("roomError", "No puedes establecer un límite menor al número de jugadores actuales.");
            return;
        }

        room.mapName = mapName;
        room.maxPlayers = capacidad;

        io.to(code).emit("roomConfigured", {
            mapName: room.mapName,
            maxPlayers: room.maxPlayers
        });

        enviarSalas();
    });

    socket.on("startRoom", code => {
        const room = rooms.get(code);

        if (!room) {
            socket.emit("roomError", "La partida ya no existe.");
            return;
        }

        if (room.hostId !== socket.id) {
            socket.emit("roomError", "Solo el anfitrión puede iniciar la partida.");
            return;
        }

        if (room.players.length < 2) {
            socket.emit("roomError", "Necesitas al menos 2 jugadores para iniciar.");
            return;
        }

        if (room.started) {
            socket.emit("roomError", "La partida ya comenzó.");
            return;
        }

        room.started = true;

        io.to(code).emit("roomStarted", {
            code: room.code,
            mapName: room.mapName,
            players: room.players
        });

        enviarSalas();
    });

    socket.on("disconnect", () => {
        eliminarJugador(socket);
        console.log("Desconectado:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("CECyParty funcionando en puerto " + PORT);
});

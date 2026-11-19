
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
const TIEMPO_RECONEXION = 2 * 60 * 1000;

function generarCodigo() {
    let code;

    do {
        code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (rooms.has(code));

    return code;
}

function obtenerJugador(room, playerId) {
    return room.players.find(player => player.id === playerId);
}

function listaJugadores(room) {
    return room.players.map(player => ({
        id: player.id,
        name: player.name
    }));
}

function enviarSalas() {
    for (const socket of io.sockets.sockets.values()) {
        const playerId = socket.data.playerId;

        const salas = [...rooms.values()]
            .filter(room => {
                const esMiembro = room.players.some(player => player.id === playerId);

                return esMiembro || (!room.started && room.players.length < room.maxPlayers);
            })
            .map(room => ({
                code: room.code,
                mapName: room.mapName,
                players: room.players.length,
                playerNames: room.players.map(player => player.name),
                maxPlayers: room.maxPlayers,
                isMember: room.players.some(player => player.id === playerId),
                isHost: room.hostId === playerId,
                started: room.started
            }));

        socket.emit("roomList", salas);
    }
}

function eliminarJugadorDeSala(room, player) {
    if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
    }

    room.players = room.players.filter(p => p.id !== player.id);

    if (room.players.length === 0) {
        rooms.delete(room.code);
        return;
    }

    if (room.hostId === player.id) {
        room.hostId = room.players[0].id;
    }

    io.to(room.code).emit("playerList", listaJugadores(room));
}

function eliminarJugador(socket) {
    const playerId = socket.data.playerId;
    const code = socket.data.roomCode;

    if (!playerId || !code) return;

    const room = rooms.get(code);

    socket.leave(code);
    socket.data.roomCode = null;

    if (!room) return;

    const player = obtenerJugador(room, playerId);

    if (!player) return;

    eliminarJugadorDeSala(room, player);

    socket.emit("roomLeft");
    enviarSalas();
}

function recuperarJugador(socket) {
    const playerId = socket.data.playerId;

    if (!playerId) return;

    for (const room of rooms.values()) {
        const player = obtenerJugador(room, playerId);

        if (!player) continue;

        if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
        }

        player.socketId = socket.id;
        socket.data.roomCode = room.code;

        socket.join(room.code);

        socket.emit("roomRestored", {
            code: room.code,
            mapName: room.mapName,
            players: listaJugadores(room),
            maxPlayers: room.maxPlayers,
            isHost: room.hostId === playerId,
            started: room.started
        });

        io.to(room.code).emit("playerList", listaJugadores(room));

        enviarSalas();

        console.log("Jugador reconectado:", player.name, room.code);

        return;
    }

    enviarSalas();
}

io.on("connection", socket => {
    socket.data.playerId = socket.handshake.auth?.playerId || socket.id;

    console.log("Conectado:", socket.id);

    recuperarJugador(socket);

    socket.on("getRooms", () => {
        enviarSalas();
    });

    socket.on("createRoom", ({ playerName, mapName }) => {
        if (!playerName || !mapName) return;

        if (socket.data.roomCode) {
            eliminarJugador(socket);
        }

        const playerId = socket.data.playerId;
        const code = generarCodigo();

        const room = {
            code,
            mapName,
            hostId: playerId,
            maxPlayers: 4,
            started: false,
            players: [
                {
                    id: playerId,
                    socketId: socket.id,
                    name: playerName,
                    disconnectTimer: null
                }
            ]
        };

        rooms.set(code, room);

        socket.join(code);
        socket.data.roomCode = code;

        socket.emit("roomCreated", {
            code,
            mapName,
            players: listaJugadores(room)
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

        const playerId = socket.data.playerId;

        if (room.players.some(player => player.id === playerId)) {
            socket.emit("roomError", "Ya estás dentro de esta partida.");
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit("roomError", "La partida está llena.");
            return;
        }

        if (socket.data.roomCode) {
            eliminarJugador(socket);
        }

        room.players.push({
            id: playerId,
            socketId: socket.id,
            name: playerName,
            disconnectTimer: null
        });

        socket.join(code);
        socket.data.roomCode = code;

        io.to(code).emit("playerList", listaJugadores(room));

        socket.emit("joinedRoom", {
            code,
            mapName: room.mapName,
            players: listaJugadores(room)
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

        if (room.hostId !== socket.data.playerId) {
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

        if (room.hostId !== socket.data.playerId) {
            socket.emit("roomError", "Solo el anfitrión puede iniciar la partida.");
            return;
        }

        const jugadoresConectados = room.players.filter(player => player.socketId).length;

        if (jugadoresConectados < 2) {
            socket.emit("roomError", "Necesitas al menos 2 jugadores conectados para iniciar.");
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
            players: listaJugadores(room)
        });

        enviarSalas();
    });

    socket.on("disconnect", () => {
        const playerId = socket.data.playerId;
        const code = socket.data.roomCode;

        if (!playerId || !code) {
            console.log("Desconectado:", socket.id);
            return;
        }

        const room = rooms.get(code);

        if (!room) return;

        const player = obtenerJugador(room, playerId);

        if (!player || player.socketId !== socket.id) {
            return;
        }

        player.socketId = null;

        player.disconnectTimer = setTimeout(() => {
            const currentRoom = rooms.get(code);

            if (!currentRoom) return;

            const currentPlayer = obtenerJugador(currentRoom, playerId);

            if (!currentPlayer || currentPlayer.socketId !== null) {
                return;
            }

            console.log("Tiempo de reconexión agotado:", currentPlayer.name);

            eliminarJugadorDeSala(currentRoom, currentPlayer);
            enviarSalas();
        }, TIEMPO_RECONEXION);

        console.log("Jugador desconectado temporalmente:", player.name);

        enviarSalas();
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("CECyParty funcionando en puerto " + PORT);
});


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
        code = Math.random().toString(36)
            .substring(2, 7).toUpperCase();
    } while (rooms.has(code));

    return code;
}

function enviarSalas() {
    const salasDisponibles = [...rooms.values()]
        .filter(room => room.players.length < room.maxPlayers)
        .map(room => ({
            code: room.code,
            mapName: room.mapName,
            players: room.players.length,
            maxPlayers: room.maxPlayers
        }));

    io.emit("roomList", salasDisponibles);
}

function eliminarJugador(socket) {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(
        player => player.id !== socket.id
    );

    socket.leave(code);
    socket.data.roomCode = null;

    if (room.players.length === 0) {
        rooms.delete(code);
    } else {
        if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
        }

        io.to(code).emit("playerList", room.players);
    }

    enviarSalas();
}

io.on("connection", socket => {
    console.log("Conectado:", socket.id);

    // El jugador solicita las salas existentes
    socket.on("getRooms", () => {
        enviarSalas();
    });

    // Crear una partida
    socket.on("createRoom", ({ playerName, mapName }) => {
        if (socket.data.roomCode) {
            eliminarJugador(socket);
        }

        const code = generarCodigo();

        const room = {
            code,
            mapName,
            hostId: socket.id,
            maxPlayers: 4,
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

        console.log("Sala creada:", code, mapName);
    });

    // Unirse a una partida
    socket.on("joinRoom", ({ code, playerName }) => {
        code = code.toUpperCase();

        const room = rooms.get(code);

        if (!room) {
            socket.emit("roomError", "Esa partida ya no existe.");
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

    // Salir voluntariamente
    socket.on("leaveRoom", () => {
        eliminarJugador(socket);
    });

    // Desconexión
    socket.on("disconnect", () => {
        eliminarJugador(socket);
        console.log("Desconectado:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("CECyParty funcionando en puerto 3000");
});

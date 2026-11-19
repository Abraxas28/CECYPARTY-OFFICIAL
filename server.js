
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

const GOAL = 500;
const MINIGAME_POINTS = 50;
const MINIGAME_COINS = 10;
const MINIGAME_SECONDS = 12;
const RECONNECT_TIME = 2 * 60 * 1000;

function generarCodigo() {
    let code;

    do {
        code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (rooms.has(code));

    return code;
}

function obtenerRoom(socket) {
    if (!socket.data.roomCode) return null;
    return rooms.get(socket.data.roomCode) || null;
}

function obtenerJugador(room, playerId) {
    return room.players.find(player => player.id === playerId);
}

function obtenerJugadoresConectados(room) {
    return room.players.filter(player => player.socketId !== null);
}

function obtenerEstadoPublico(room) {
    if (!room.game) return null;

    return JSON.parse(JSON.stringify(room.game));
}

function enviarEstado(room) {
    if (!room.game) return;

    io.to(room.code).emit("gameState", obtenerEstadoPublico(room));
}

function enviarSalas() {
    for (const socket of io.sockets.sockets.values()) {
        const playerId = socket.data.playerId;

        const salas = [...rooms.values()]
            .filter(room => {
                const esMiembro = room.players.some(
                    player => player.id === playerId
                );

                return esMiembro ||
                    (!room.started && room.players.length < room.maxPlayers);
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

function iniciarEstadoDePartida(room) {
    const jugadores = obtenerJugadoresConectados(room);

    room.game = {
        phase: "turn",
        round: 1,
        topicIndex: 0,
        turnIndex: 0,

        players: jugadores.map((player, index) => ({
            id: player.id,
            name: player.name,
            points: 0,
            coins: index === 0 ? 65 : 50,
            pos: 0,
            double: false,
            frozen: false,
            shield: false
        })),

        rolledPlayers: [],
        readyPlayers: [],

        minigameScores: {},
        minigameOrder: [],
        minigameIndex: 0,
        currentMinigamePlayerId: null,
        minigameStartedAt: null,
        minigameEndsAt: null
    };

    enviarEstado(room);
}

function iniciarLeccion(room) {
    if (!room.game || room.game.phase !== "turn") return;

    room.game.phase = "lesson";
    room.game.readyPlayers = [];

    io.to(room.code).emit("lessonStarted", {
        round: room.game.round,
        topicIndex: room.game.topicIndex
    });

    enviarEstado(room);

    console.log("Lección iniciada:", room.code);
}

function iniciarMinijuego(room) {
    const game = room.game;

    if (!game || game.phase !== "minigame") return;

    clearTimeout(room.gameTimer);

    game.minigameScores = {};
    game.minigameOrder = game.players.map(player => player.id);
    game.minigameIndex = 0;
    game.currentMinigamePlayerId = null;
    game.minigameStartedAt = Date.now();
    game.minigameEndsAt = Date.now() + MINIGAME_SECONDS * 1000;

    io.to(room.code).emit("minigameStarted", {
        duration: MINIGAME_SECONDS,
        players: game.players.map(player => ({
            id: player.id,
            name: player.name
        })),
        startedAt: game.minigameStartedAt,
        endsAt: game.minigameEndsAt
    });

    enviarEstado(room);

    room.gameTimer = setTimeout(() => {
        finalizarMinijuego(room);
    }, MINIGAME_SECONDS * 1000);

    console.log("Minijuego simultáneo iniciado:", room.code);
}

function finalizarMinijuego(room) {
    const game = room.game;

    if (!game || game.phase !== "minigame") return;

    clearTimeout(room.gameTimer);
    room.gameTimer = null;

    const scores = {};

    for (const player of game.players) {
        scores[player.id] = Number.isInteger(game.minigameScores[player.id])
            ? game.minigameScores[player.id]
            : 0;
    }

    const valores = Object.values(scores);

    const puntuacionMaxima = valores.length
        ? Math.max(...valores)
        : 0;

    const ganadores = game.players.filter(player => {
        return scores[player.id] === puntuacionMaxima &&
            puntuacionMaxima > 0;
    });

    for (const player of ganadores) {
        player.points += MINIGAME_POINTS;
        player.coins += MINIGAME_COINS;
    }

    const ganadorFinal = game.players.find(
        player => player.points >= GOAL
    );

    io.to(room.code).emit("minigameFinished", {
        scores,
        winners: ganadores.map(player => ({
            id: player.id,
            name: player.name
        }))
    });

    if (ganadorFinal) {
        game.phase = "finished";

        io.to(room.code).emit("gameFinished", {
            winner: {
                id: ganadorFinal.id,
                name: ganadorFinal.name,
                points: ganadorFinal.points
            }
        });

        enviarEstado(room);

        console.log("Partida terminada:", ganadorFinal.name);
        return;
    }

    game.phase = "turn";
    game.round++;
    game.topicIndex++;

    game.turnIndex = 0;
    game.rolledPlayers = [];
    game.readyPlayers = [];

    game.minigameScores = {};
    game.minigameOrder = [];
    game.minigameIndex = 0;
    game.currentMinigamePlayerId = null;
    game.minigameStartedAt = null;
    game.minigameEndsAt = null;

    enviarEstado(room);

    console.log("Nueva ronda:", room.code, game.round);
}

function eliminarJugadorPorId(room, playerId) {
    if (!room) return;

    room.players = room.players.filter(
        player => player.id !== playerId
    );

    if (room.game) {
        const game = room.game;

        const indiceAnterior = game.players.findIndex(
            player => player.id === playerId
        );

        game.players = game.players.filter(
            player => player.id !== playerId
        );

        game.readyPlayers = game.readyPlayers.filter(
            id => id !== playerId
        );

        game.rolledPlayers = game.rolledPlayers.filter(
            id => id !== playerId
        );

        game.minigameOrder = game.minigameOrder.filter(
            id => id !== playerId
        );

        delete game.minigameScores[playerId];

        if (indiceAnterior !== -1 &&
            indiceAnterior < game.turnIndex) {
            game.turnIndex = Math.max(0, game.turnIndex - 1);
        }

        if (game.players.length === 0) {
            clearTimeout(room.gameTimer);
            rooms.delete(room.code);
            enviarSalas();
            return;
        }

        if (game.phase === "minigame" &&
            Object.keys(game.minigameScores).length >= game.players.length) {
            finalizarMinijuego(room);
        }

        if (game.phase === "turn" &&
            game.rolledPlayers.length >= game.players.length) {
            iniciarLeccion(room);
        }

        if (game.phase === "lesson" &&
            game.readyPlayers.length >= game.players.length) {
            game.phase = "minigame";
            iniciarMinijuego(room);
        }

        enviarEstado(room);
    }

    if (room.players.length === 0) {
        clearTimeout(room.gameTimer);
        rooms.delete(room.code);
        enviarSalas();
        return;
    }

    if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
    }

    io.to(room.code).emit("playerList", room.players.map(player => ({
        id: player.id,
        name: player.name
    })));

    enviarSalas();
}

function eliminarJugador(socket) {
    const room = obtenerRoom(socket);
    if (!room) return;

    const playerId = socket.data.playerId;
    const player = obtenerJugador(room, playerId);

    if (player && player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
    }

    eliminarJugadorPorId(room, playerId);

    socket.leave(room.code);
    socket.data.roomCode = null;

    socket.emit("roomLeft");
}

function recuperarJugador(socket) {
    const playerId = socket.data.playerId;

    for (const room of rooms.values()) {
        const player = obtenerJugador(room, playerId);

        if (!player) continue;

        if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
        }

        player.socketId = socket.id;

        socket.join(room.code);
        socket.data.roomCode = room.code;

        socket.emit("roomRestored", {
            code: room.code,
            mapName: room.mapName,
            players: room.players.map(player => ({
                id: player.id,
                name: player.name
            })),
            maxPlayers: room.maxPlayers,
            isHost: room.hostId === playerId,
            started: room.started,
            gameState: obtenerEstadoPublico(room)
        });

        io.to(room.code).emit("playerList", room.players.map(player => ({
            id: player.id,
            name: player.name
        })));

        enviarEstado(room);
        enviarSalas();

        console.log("Jugador reconectado:", player.name, room.code);
        return;
    }
}

io.on("connection", socket => {
    socket.data.playerId =
        socket.handshake.auth?.playerId || socket.id;

    console.log("Conectado:", socket.id);

    recuperarJugador(socket);

    socket.on("getRooms", () => {
        enviarSalas();
    });

    socket.on("createRoom", ({ playerName, mapName } = {}) => {
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
            game: null,
            gameTimer: null,

            players: [{
                id: playerId,
                socketId: socket.id,
                name: playerName,
                disconnectTimer: null
            }]
        };

        rooms.set(code, room);

        socket.join(code);
        socket.data.roomCode = code;

        socket.emit("roomCreated", {
            code,
            mapName,
            players: room.players.map(player => ({
                id: player.id,
                name: player.name
            }))
        });

        enviarSalas();

        console.log("Sala creada:", code);
    });

    socket.on("joinRoom", ({ code, playerName } = {}) => {
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

        const playerId = socket.data.playerId;

        if (room.players.some(player => player.id === playerId)) {
            socket.emit("roomError", "Ya estás dentro de esta partida.");
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

        io.to(code).emit("playerList", room.players.map(player => ({
            id: player.id,
            name: player.name
        })));

        socket.emit("joinedRoom", {
            code,
            mapName: room.mapName,
            players: room.players.map(player => ({
                id: player.id,
                name: player.name
            }))
        });

        enviarSalas();
    });

    socket.on("leaveRoom", () => {
        eliminarJugador(socket);
    });

    socket.on("configureRoom", ({ code, mapName, maxPlayers } = {}) => {
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

        if (obtenerJugadoresConectados(room).length < 2) {
            socket.emit("roomError", "Necesitas al menos 2 jugadores conectados para iniciar.");
            return;
        }

        if (room.started) {
            socket.emit("roomError", "La partida ya comenzó.");
            return;
        }

        room.started = true;

        iniciarEstadoDePartida(room);

        io.to(code).emit("roomStarted", {
            code: room.code,
            mapName: room.mapName,
            players: room.players.map(player => ({
                id: player.id,
                name: player.name
            })),
            gameState: obtenerEstadoPublico(room)
        });

        enviarSalas();
    });

    socket.on("rollDice", () => {
        const room = obtenerRoom(socket);
        if (!room || !room.game) return;

        const game = room.game;
        const playerId = socket.data.playerId;

        if (game.phase !== "turn") {
            socket.emit("gameError", "No puedes tirar el dado en este momento.");
            return;
        }

        const player = game.players[game.turnIndex];

        if (!player || player.id !== playerId) {
            socket.emit("gameError", "No es tu turno.");
            return;
        }

        if (game.rolledPlayers.includes(playerId)) {
            socket.emit("gameError", "Ya tiraste el dado en esta ronda.");
            return;
        }

        const dice = Math.floor(Math.random() * 6) + 1;
        const oldPosition = player.pos;

        player.pos += dice;

        game.rolledPlayers.push(playerId);
        game.turnIndex++;

        const siguiente = game.players.find(
            player => !game.rolledPlayers.includes(player.id)
        );

        if (siguiente) {
            game.turnIndex = game.players.indexOf(siguiente);
        }

        io.to(room.code).emit("diceRolled", {
            playerId,
            playerName: player.name,
            dice,
            oldPosition,
            newPosition: player.pos
        });

        if (game.rolledPlayers.length >= game.players.length) {
            iniciarLeccion(room);
        } else {
            enviarEstado(room);
        }
    });

    socket.on("lessonReady", () => {
        const room = obtenerRoom(socket);
        if (!room || !room.game) return;

        const game = room.game;
        const playerId = socket.data.playerId;

        if (game.phase !== "lesson") {
            socket.emit("gameError", "No estamos en la fase de preparación.");
            return;
        }

        if (!game.players.some(player => player.id === playerId)) return;
        if (game.readyPlayers.includes(playerId)) return;

        game.readyPlayers.push(playerId);

        io.to(room.code).emit("playerReady", {
            playerId,
            readyCount: game.readyPlayers.length,
            totalPlayers: game.players.length
        });

        enviarEstado(room);

        if (game.readyPlayers.length >= game.players.length) {
            game.phase = "minigame";
            iniciarMinijuego(room);
        }
    });

    socket.on("submitMinigameResult", ({ score } = {}) => {
        const room = obtenerRoom(socket);
        if (!room || !room.game) return;

        const game = room.game;
        const playerId = socket.data.playerId;

        if (game.phase !== "minigame") {
            socket.emit("gameError", "El minijuego no está activo.");
            return;
        }

        if (!game.players.some(player => player.id === playerId)) return;

        if (Date.now() > game.minigameEndsAt) {
            socket.emit("gameError", "El tiempo del minijuego terminó.");
            return;
        }

        if (!Number.isInteger(score) || score < 0 || score > 100) {
            socket.emit("gameError", "La puntuación enviada no es válida.");
            return;
        }

        if (Object.prototype.hasOwnProperty.call(game.minigameScores, playerId)) {
            return;
        }

        game.minigameScores[playerId] = score;

        io.to(room.code).emit("minigamePlayerFinished", {
            playerId,
            score,
            submitted: Object.keys(game.minigameScores).length,
            total: game.players.length
        });

        enviarEstado(room);

        if (Object.keys(game.minigameScores).length >= game.players.length) {
            finalizarMinijuego(room);
        }
    });

    socket.on("disconnect", () => {
        const room = obtenerRoom(socket);
        const playerId = socket.data.playerId;

        if (room) {
            const player = obtenerJugador(room, playerId);

            if (player && player.socketId === socket.id) {
                player.socketId = null;

                clearTimeout(player.disconnectTimer);

                player.disconnectTimer = setTimeout(() => {
                    const currentRoom = rooms.get(room.code);
                    if (!currentRoom) return;

                    const currentPlayer = obtenerJugador(
                        currentRoom,
                        playerId
                    );

                    if (currentPlayer && currentPlayer.socketId === null) {
                        eliminarJugadorPorId(currentRoom, playerId);
                    }
                }, RECONNECT_TIME);
            }

            enviarSalas();
        }

        console.log("Desconectado:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("CECyParty funcionando en puerto " + PORT);
});

"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const MINIGAME_POINTS = 50;

const GOAL = 500;
const PLAYER_SECONDS = 12;
const RECONNECT_TIME = 120000;

const rooms = new Map();
const playerRooms = new Map();

const MAPS = [
    "Bosque Químico",
    "Galaxia Gravitacional",
    "Laboratorio del Caos",
    "Isla Termodinámica",
    "Reino Molecular",
    "Ciudad Eléctrica",
    "Pirámides de la Materia",
    "Océano de las Presiones",
    "Valle de los Elementos",
    "Montañas de la Gravedad"
];

const SHOP_ITEMS = {
    double: 30,
    freeze: 50,
    points: 80,
    shield: 40
};

function generarCodigo() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code;

    do {
        code = "";

        for (let i = 0; i < 5; i++) {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }
    } while (rooms.has(code));

    return code;
}

function getPlayerId(socket) {
    return String(
        socket.handshake.auth?.playerId ||
        socket.id
    );
}

function getRoom(socket) {
    const playerId = socket.data.playerId;
    const code = playerRooms.get(playerId);

    if (!code) return null;

    return rooms.get(code) || null;
}

function getPlayer(room, playerId) {
    return room.players.find(player => player.id === playerId);
}

function getConnectedPlayers(room) {
    return room.players.filter(player => player.connected);
}

function publicPlayers(room) {
    return room.players
        .filter(player => player.connected)
        .map(player => ({
            id: player.id,
            name: player.name,
            points: player.points,
            coins: player.coins,
            pos: player.pos,
            double: player.double,
            frozen: player.frozen,
            shield: player.shield,
            connected: true
        }));
}

function sendRoomList() {
    for (const socket of io.sockets.sockets.values()) {
        const playerId = socket.data.playerId;
        const currentRoomCode = playerRooms.get(playerId);

        const availableRooms = [];

        for (const room of rooms.values()) {
            if (room.started) continue;

            availableRooms.push({
                code: room.code,
                mapName: room.mapName,
                players: room.players.length,
                playerNames: room.players.map(player => player.name),
                maxPlayers: room.maxPlayers,
                hostId: room.hostId,
                isMember: currentRoomCode === room.code,
                isHost: room.hostId === playerId,
                started: room.started
            });
        }

        socket.emit("roomList", availableRooms);
    }
}

function sendPlayerList(room) {
    io.to(room.code).emit("playerList", publicPlayers(room));
    sendRoomList();
}

function getGameState(room) {
    const game = room.game;

    if (!game) return null;

    return {
        phase: game.phase,
        turnIndex: game.turnIndex,

        activePlayerId: game.phase === "minigame"
            ? game.minigame?.activePlayerId || null
            : room.players[game.turnIndex]?.id || null,

        turnsTaken: game.turnsTaken,
        round: game.round,
        topicIndex: game.topicIndex,

        readyPlayers: Array.from(game.ready),

        hasRolled: game.hasRolled,
        winnerId: game.winnerId,

        minigame: game.minigame ? {
            participants: [...game.minigame.participants],
            scores: { ...game.minigame.scores },
            endsAt: game.minigame.endsAt
        } : null,

        players: publicPlayers(room)
    };
}

function sendGameState(room) {
    if (!room.game) return;

    io.to(room.code).emit("gameState", getGameState(room));
}

function clearRoomTimers(room) {
    if (!room.game) return;

    if (room.game.advanceTimer) {
        clearTimeout(room.game.advanceTimer);
        room.game.advanceTimer = null;
    }

    if (room.game.minigame?.timer) {
        clearTimeout(room.game.minigame.timer);
        room.game.minigame.timer = null;
    }
}

function createPlayer(playerId, name, coins = 50) {
    return {
        id: playerId,
        name: String(name || "Jugador").slice(0, 20),

        socketId: null,
        connected: true,
        disconnectTimer: null,

        points: 0,
        coins,
        pos: 0,

        double: false,
        frozen: false,
        shield: false
    };
}

function createGame() {
    return {
        phase: "turn",
        turnIndex: 0,
        turnsTaken: 0,

        round: 1,
        topicIndex: 0,

        ready: new Set(),
        hasRolled: false,

        winnerId: null,

        advanceTimer: null,
        minigame: null
    };
}

function createRoom(socket, data) {
    const playerId = socket.data.playerId;

    const playerName = data?.playerName || "Jugador";

    const mapName = MAPS.includes(data?.mapName)
        ? data.mapName
        : MAPS[0];

    if (playerRooms.has(playerId)) {
        socket.emit("roomError", "Ya perteneces a una partida.");
        return;
    }

    const code = generarCodigo();

    const room = {
        code,
        mapName,
        hostId: playerId,
        maxPlayers: MAX_PLAYERS,
        started: false,
        players: [
            createPlayer(playerId, playerName, 65)
        ],
        game: null
    };

    room.players[0].socketId = socket.id;

    rooms.set(code, room);
    playerRooms.set(playerId, code);

    socket.join(code);

    socket.emit("roomCreated", {
        code,
        mapName
    });

    sendPlayerList(room);
}

function joinRoom(socket, data) {
    const playerId = socket.data.playerId;

    const code = String(data?.code || "")
        .trim()
        .toUpperCase();

    const playerName = data?.playerName || "Jugador";

    if (playerRooms.has(playerId)) {
        const existingCode = playerRooms.get(playerId);

        if (existingCode === code) {
            restorePlayer(socket, playerId, rooms.get(code));
            return;
        }

        socket.emit("roomError", "Ya perteneces a otra partida.");
        return;
    }

    const room = rooms.get(code);

    if (!room) {
        socket.emit("roomError", "La partida no existe.");
        return;
    }

    if (room.started) {
        socket.emit("roomError", "La partida ya comenzó.");
        return;
    }

    if (room.players.length >= room.maxPlayers) {
        socket.emit("roomError", "La partida está llena.");
        return;
    }

    const player = createPlayer(playerId, playerName);

    player.socketId = socket.id;

    room.players.push(player);
    playerRooms.set(playerId, code);

    socket.join(code);

    socket.emit("joinedRoom", {
        code,
        mapName: room.mapName
    });

    sendPlayerList(room);
}

function restorePlayer(socket, playerId, room) {
    if (!room) return;

    const player = getPlayer(room, playerId);

    if (!player) return;

    if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = null;
    }

    player.connected = true;
    player.socketId = socket.id;

    socket.join(room.code);

    socket.emit("roomRestored", {
        code: room.code,
        mapName: room.mapName,
        players: publicPlayers(room),
        gameState: getGameState(room)
    });

    sendPlayerList(room);

    if (room.started) {
        sendGameState(room);
    }
}

function configureRoom(socket, data) {
    const room = getRoom(socket);

    if (!room || room.started) return;

    if (room.hostId !== socket.data.playerId) {
        socket.emit(
            "roomError",
            "Solo el anfitrión puede configurar la partida."
        );
        return;
    }

    if (MAPS.includes(data?.mapName)) {
        room.mapName = data.mapName;
    }

    if (Number.isInteger(data?.maxPlayers)) {
        const requestedCapacity = Math.min(
            MAX_PLAYERS,
            Math.max(MIN_PLAYERS, data.maxPlayers)
        );

        if (requestedCapacity < room.players.length) {
            socket.emit(
                "roomError",
                "La capacidad no puede ser menor que los jugadores actuales."
            );
            return;
        }

        room.maxPlayers = requestedCapacity;
    }

    io.to(room.code).emit("roomConfigured", {
        code: room.code,
        mapName: room.mapName,
        maxPlayers: room.maxPlayers
    });

    sendPlayerList(room);
}

function startRoom(socket) {
    const room = getRoom(socket);

    if (!room || room.started) return;

    if (room.hostId !== socket.data.playerId) {
        socket.emit(
            "roomError",
            "Solo el anfitrión puede iniciar la partida."
        );
        return;
    }

    if (getConnectedPlayers(room).length < MIN_PLAYERS) {
        socket.emit(
            "roomError",
            "Se necesitan al menos 2 jugadores."
        );
        return;
    }

    room.started = true;
    room.game = createGame();

    io.to(room.code).emit("roomStarted", {
        code: room.code,
        mapName: room.mapName,
        players: publicPlayers(room)
    });

    sendGameState(room);
    startCurrentTurn(room);

    sendRoomList();
}

function finishGame(room, winner, reason = "points") {
    if (!room.game || room.game.phase === "finished") return;

    clearRoomTimers(room);

    room.game.phase = "finished";
    room.game.winnerId = winner.id;

    io.to(room.code).emit("gameFinished", {
        winnerId: winner.id,
        winnerName: winner.name,
        reason,
        players: publicPlayers(room)
    });

    sendGameState(room);
}

function checkWinner(room) {
    if (!room.game) return false;

    const winner = room.players
        .filter(player => player.points >= GOAL)
        .sort((a, b) => b.points - a.points)[0];

    if (!winner) return false;

    finishGame(room, winner);

    return true;
}

function startLesson(room) {
    if (!room.game || room.game.phase === "finished") return;

    const connected = getConnectedPlayers(room);

    if (connected.length === 0) return;

    room.game.phase = "lesson";
    room.game.ready = new Set();

    io.to(room.code).emit("lessonStarted", {
        topicIndex: room.game.topicIndex,
        round: room.game.round
    });

    sendGameState(room);
}

function checkLessonReady(room) {
    if (!room.game || room.game.phase !== "lesson") return;

    const connected = getConnectedPlayers(room);

    if (connected.length === 0) return;

    const everyoneReady = connected.every(player =>
        room.game.ready.has(player.id)
    );

    if (everyoneReady) {
        startMinigame(room);
    }
}

function lessonReady(socket) {
    const room = getRoom(socket);

    if (!room || !room.started || !room.game) return;
    if (room.game.phase !== "lesson") return;

    const player = getPlayer(room, socket.data.playerId);

    if (!player || !player.connected) return;

    room.game.ready.add(player.id);

    io.to(room.code).emit("playerReady", {
        playerId: player.id,
        readyPlayers: Array.from(room.game.ready)
    });

    sendGameState(room);
    checkLessonReady(room);
}

function startMinigame(room) {
    if (!room.game || room.game.phase !== "lesson") return;

    const participants = getConnectedPlayers(room)
        .map(player => player.id);

    if (participants.length === 0) return;

    const endsAt = Date.now() + PLAYER_SECONDS * 1000;

    room.game.phase = "minigame";

    room.game.minigame = {
        participants,
        scores: {},
        endsAt,
        timer: null
    };

    io.to(room.code).emit("minigameStarted", {
        topicIndex: room.game.topicIndex,
        participants,
        duration: PLAYER_SECONDS,
        endsAt
    });

    sendGameState(room);

    room.game.minigame.timer = setTimeout(() => {
        finishMinigame(room);
    }, PLAYER_SECONDS * 1000);
}

function submitMinigameResult(socket, data) {
    const room = getRoom(socket);

    if (!room || !room.game) return;
    if (room.game.phase !== "minigame") return;

    const playerId = socket.data.playerId;
    const minigame = room.game.minigame;

    if (!minigame) return;

    if (!minigame.participants.includes(playerId)) return;

    if (Object.prototype.hasOwnProperty.call(minigame.scores, playerId)) {
        return;
    }

    const player = getPlayer(room, playerId);

    if (!player || !player.connected) return;

    const score = Math.max(
        0,
        Math.min(100, Math.floor(Number(data?.score) || 0))
    );

    minigame.scores[playerId] = score;

    io.to(room.code).emit("minigamePlayerFinished", {
        playerId,
        playerName: player.name,
        score
    });

    sendGameState(room);

    const everyoneSubmitted = minigame.participants.every(id =>
        Object.prototype.hasOwnProperty.call(minigame.scores, id)
    );

    if (everyoneSubmitted) {
        finishMinigame(room);
    }
}

function finishMinigame(room) {
    if (!room.game || room.game.phase !== "minigame") return;

    const minigame = room.game.minigame;

    if (!minigame) return;

    if (minigame.timer) {
        clearTimeout(minigame.timer);
        minigame.timer = null;
    }

    for (const playerId of minigame.participants) {
        if (!Object.prototype.hasOwnProperty.call(minigame.scores, playerId)) {
            minigame.scores[playerId] = 0;
        }
    }

    const connectedParticipants = minigame.participants
        .map(id => getPlayer(room, id))
        .filter(player => player && player.connected);

    const highestScore = connectedParticipants.length
        ? Math.max(
            ...connectedParticipants.map(player =>
                minigame.scores[player.id] || 0
            )
        )
        : 0;

    const winners = connectedParticipants
        .filter(player =>
            (minigame.scores[player.id] || 0) === highestScore
        )
        .map(player => player.id);

    for (const playerId of winners) {
        const player = getPlayer(room, playerId);

        if (!player) continue;

        player.points += MINIGAME_POINTS;
        player.coins += 10;
    }

    const results = minigame.participants.map(playerId => {
        const player = getPlayer(room, playerId);

        return {
            playerId,
            playerName: player?.name || "Jugador",
            score: minigame.scores[playerId] || 0,
            winner: winners.includes(playerId)
        };
    });

    io.to(room.code).emit("minigameFinished", {
        scores: minigame.scores,
        results,
        winners,
        highestScore,
        pointsAwarded: MINIGAME_POINTS,
        coinsAwarded: 10,
        players: publicPlayers(room)
    });

    if (checkWinner(room)) return;

    room.game.phase = "turn";
    room.game.minigame = null;
    room.game.ready = new Set();

    room.game.topicIndex++;
    room.game.round++;

    room.game.turnIndex = 0;
    room.game.turnsTaken = 0;
    room.game.hasRolled = false;

    sendGameState(room);
    startCurrentTurn(room);
}

function startCurrentTurn(room) {
    if (!room.game || room.game.phase !== "turn") return;

    const game = room.game;
    const totalPlayers = room.players.length;

    if (totalPlayers === 0) return;

    let checked = 0;

    while (
        checked < totalPlayers &&
        game.turnsTaken < totalPlayers
    ) {
        const player = room.players[game.turnIndex];

        if (!player || !player.connected || player.frozen) {
            if (player?.frozen) {
                player.frozen = false;
            }

            if (player) {
                io.to(room.code).emit("turnSkipped", {
                    playerId: player.id,
                    playerName: player.name
                });
            }

            game.turnsTaken++;
            game.turnIndex = (game.turnIndex + 1) % totalPlayers;

            checked++;
            continue;
        }

        game.hasRolled = false;

        io.to(room.code).emit("turnStarted", {
            playerId: player.id,
            playerName: player.name,
            round: game.round,
            turnsTaken: game.turnsTaken
        });

        sendGameState(room);

        return;
    }

    if (game.turnsTaken >= totalPlayers) {
        startLesson(room);
    }
}

function advanceTurn(room) {
    if (!room.game || room.game.phase !== "turn") return;

    const game = room.game;

    if (game.advanceTimer) {
        clearTimeout(game.advanceTimer);
        game.advanceTimer = null;
    }

    game.turnsTaken++;

    if (game.turnsTaken >= room.players.length) {
        startLesson(room);
        return;
    }

    game.turnIndex =
        (game.turnIndex + 1) % room.players.length;

    game.hasRolled = false;

    startCurrentTurn(room);
}

function rollDice(socket) {
    const room = getRoom(socket);

    if (!room || !room.started || !room.game) return;
    if (room.game.phase !== "turn") return;

    const playerId = socket.data.playerId;
    const player = getPlayer(room, playerId);
    const game = room.game;

    if (!player || !player.connected) return;
    if (room.players[game.turnIndex]?.id !== playerId) return;
    if (game.hasRolled) return;

    const dice = Math.floor(Math.random() * 6) + 1;

    const bonusDice = player.double
        ? Math.floor(Math.random() * 6) + 1
        : 0;

    const total = dice + bonusDice;

    player.double = false;
    player.pos += total;

    let tileType = "blue";
    let message = "";
    let coinsChange = 0;

    if (player.pos % 8 === 5) {
        tileType = "red";

        if (player.shield) {
            player.shield = false;
            message = "¡Tu escudo te protegió!";
        } else {
            player.coins = Math.max(0, player.coins - 8);
            coinsChange = -8;
            message = "Perdiste 8 monedas.";
        }
    } else if (player.pos % 9 === 4) {
        tileType = "event";

        player.coins += 15;
        coinsChange = 15;

        message = "¡Casilla especial! Ganaste 15 monedas.";
    } else {
        player.coins += 10;
        coinsChange = 10;

        message = "¡Ganaste 10 monedas!";
    }

    game.hasRolled = true;

    io.to(room.code).emit("diceResult", {
        playerId,
        playerName: player.name,
        dice,
        bonusDice,
        total,
        position: player.pos,
        tileType,
        coinsChange,
        message,
        players: publicPlayers(room)
    });

    sendGameState(room);

    game.advanceTimer = setTimeout(() => {
        advanceTurn(room);
    }, 1800);
}

function buyItem(socket, data) {
    const room = getRoom(socket);

    if (!room || !room.started || !room.game) return;
    if (room.game.phase !== "turn") return;

    const playerId = socket.data.playerId;
    const player = getPlayer(room, playerId);
    const game = room.game;

    if (!player || !player.connected) return;
    if (room.players[game.turnIndex]?.id !== playerId) return;
    if (game.hasRolled) return;

    const itemId = data?.itemId || data?.item;
    const cost = SHOP_ITEMS[itemId];

    if (!cost) {
        socket.emit("roomError", "Objeto no válido.");
        return;
    }

    if (player.coins < cost) {
        socket.emit("roomError", "No tienes suficientes monedas.");
        return;
    }

    player.coins -= cost;

    let effect = "";
    let targetName = null;

    if (itemId === "double") {
        player.double = true;
        effect = "Tu próximo lanzamiento tendrá un dado adicional.";
    }

    if (itemId === "freeze") {
        const currentIndex = room.players.findIndex(
            p => p.id === playerId
        );

        const nextPlayer = room.players[
            (currentIndex + 1) % room.players.length
        ];

        nextPlayer.frozen = true;

        targetName = nextPlayer.name || null;
        effect = `${targetName || "El siguiente jugador"} perderá su próximo turno.`;
    }

    if (itemId === "points") {
        player.points += 35;
        effect = "¡Has conseguido 35 puntos!";
    }

    if (itemId === "shield") {
        player.shield = true;
        effect = "Estás protegido de la próxima casilla roja.";
    }

    io.to(room.code).emit("itemPurchased", {
        playerId,
        playerName: player.name,
        itemId,
        cost,
        effect,
        targetName,
        players: publicPlayers(room)
    });

    if (checkWinner(room)) return;

    sendGameState(room);
}

function removePlayer(room, playerId) {
    const index = room.players.findIndex(
        player => player.id === playerId
    );

    if (index === -1) return;

    const player = room.players[index];

    if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
    }

    const game = room.game;

    const wasCurrentPlayer = game &&
        game.phase === "turn" &&
        game.turnIndex === index;

    const hadRolled = wasCurrentPlayer && game.hasRolled;

    room.players.splice(index, 1);
    playerRooms.delete(playerId);

    if (room.players.length === 0) {
        clearRoomTimers(room);
        rooms.delete(room.code);
        sendRoomList();
        return;
    }

    if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
    }

    if (game && room.started && game.phase !== "finished") {
        if (room.players.length < MIN_PLAYERS) {
            finishGame(room, room.players[0], "abandon");
            sendPlayerList(room);
            return;
        }

        if (game.phase === "minigame" && game.minigame) {
            game.minigame.participants =
                game.minigame.participants.filter(id => id !== playerId);

            delete game.minigame.scores[playerId];

            const allDone = game.minigame.participants.every(id =>
                Object.prototype.hasOwnProperty.call(game.minigame.scores, id)
            );

            if (allDone) {
                finishMinigame(room);
                sendPlayerList(room);
                return;
            }
        }
    }

    if (game && game.phase === "turn") {
        if (index < game.turnIndex) {
            game.turnIndex--;
        } else if (index === game.turnIndex) {
            game.turnIndex = index % room.players.length;
        }

        if (wasCurrentPlayer) {
            if (game.advanceTimer) {
                clearTimeout(game.advanceTimer);
                game.advanceTimer = null;
            }

            if (hadRolled) {
                game.turnsTaken++;

                if (game.turnsTaken >= room.players.length) {
                    startLesson(room);
                } else {
                    startCurrentTurn(room);
                }
            } else {
                startCurrentTurn(room);
            }
        }
    }

    sendPlayerList(room);

    if (room.started) {
        sendGameState(room);

        if (game?.phase === "lesson") {
            checkLessonReady(room);
        }
    }
}

function leaveRoom(socket) {
    const playerId = socket.data.playerId;
    const room = getRoom(socket);

    if (!room) return;

    socket.emit("roomLeft", {
        code: room.code
    });

    socket.leave(room.code);

    removePlayer(room, playerId);
}

function handleDisconnect(socket) {
    const playerId = socket.data.playerId;
    const room = getRoom(socket);

    if (!room) return;

    const player = getPlayer(room, playerId);

    if (!player || player.socketId !== socket.id) return;

    player.connected = false;
    player.socketId = null;

    player.disconnectTimer = setTimeout(() => {
        removePlayer(room, playerId);
    }, RECONNECT_TIME);

    if (room.started && room.game) {
        if (
            room.game.phase === "turn" &&
            room.players[room.game.turnIndex]?.id === playerId
        ) {
            advanceTurn(room);
        }

        if (room.game.phase === "lesson") {
            checkLessonReady(room);
        }

        sendGameState(room);
    }

    sendPlayerList(room);
}

io.on("connection", socket => {
    socket.data.playerId = getPlayerId(socket);

    const playerId = socket.data.playerId;
    const previousRoomCode = playerRooms.get(playerId);

    if (previousRoomCode) {
        const previousRoom = rooms.get(previousRoomCode);

        if (previousRoom) {
            restorePlayer(socket, playerId, previousRoom);
        }
    }

    socket.on("getRooms", () => {
        sendRoomList();
    });

    socket.on("createRoom", data => {
        createRoom(socket, data || {});
    });

    socket.on("joinRoom", data => {
        joinRoom(socket, data || {});
    });

    socket.on("configureRoom", data => {
        configureRoom(socket, data || {});
    });

    socket.on("startRoom", () => {
        startRoom(socket);
    });

    socket.on("leaveRoom", ack => {
        leaveRoom(socket);

        if (typeof ack === "function") {
            ack();
        }
    });

    socket.on("rollDice", () => {
        rollDice(socket);
    });

    socket.on("buyItem", data => {
        buyItem(socket, data || {});
    });

    socket.on("lessonReady", () => {
        lessonReady(socket);
    });

    socket.on("submitMinigameResult", data => {
        submitMinigameResult(socket, data || {});
    });

    socket.on("disconnect", () => {
        handleDisconnect(socket);
    });
});

app.get("/", (req, res) => {
    res.send("CECyParty Server funcionando correctamente.");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("CECyParty funcionando en puerto " + PORT);
});

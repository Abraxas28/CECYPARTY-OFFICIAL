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
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

const MINIGAME_POINTS = 50;

const GOAL = 500;
const PLAYER_SECONDS = 12;
const THERMO_SECONDS = 110;
const FORCE_MINIGAME = null;
const THERMO_SIM_SECONDS = 60;
const THERMO_TICK = 50;

const THERMO_PRESETS = {
    easy: { t1: -10, t2: 70, m1: 2, c1: 1, m2: 2, c2: 1, smin: 22, smax: 38, lmin: -22, lmax: 52, k: 0.55 },
    medium: { t1: -10, t2: 80, m1: 3, c1: 1, m2: 2, c2: 1, smin: 22, smax: 31, lmin: -18, lmax: 46, k: 0.62 },
    hard: { t1: -15, t2: 95, m1: 2, c1: 2, m2: 3, c2: 0.8, smin: 23, smax: 30, lmin: -20, lmax: 44, k: 0.72 }
};
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

function getRoomListForPlayer(playerId) {
    const currentRoomCode = playerRooms.get(playerId);
    const availableRooms = [];

    for (const room of rooms.values()) {
        const isMember = currentRoomCode === room.code;

        if (room.started && !isMember) continue;

        availableRooms.push({
            code: room.code,
            mapName: room.mapName,
            players: room.players.length,
            playerNames: room.players.map(player => player.name),
            maxPlayers: room.maxPlayers,
            hostId: room.hostId,
            isMember,
            isHost: room.hostId === playerId,
            started: room.started,
            finished: room.game?.phase === "finished"
        });
    }

    return availableRooms;
}

function sendRoomList() {
    for (const socket of io.sockets.sockets.values()) {
        socket.emit("roomList", getRoomListForPlayer(socket.data.playerId));
    }
}

function cleanupPlayerMembership(playerId) {
    const code = playerRooms.get(playerId);
    if (!code) return;

    const room = rooms.get(code);

    if (!room) {
        playerRooms.delete(playerId);
        return;
    }

    const player = getPlayer(room, playerId);

    if (!player) {
        playerRooms.delete(playerId);
        return;
    }

    if (room.game?.phase === "finished") {
        removePlayer(room, playerId);
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
            : game.currentPlayerId || null,

        turnsTaken: game.turnsTaken,
        round: game.round,
        topicIndex: game.topicIndex,

        readyPlayers: Array.from(game.ready),

        hasRolled: game.hasRolled,
        winnerId: game.winnerId,

        minigame: game.minigame ? {
            participants: [...game.minigame.participants],
            scores: { ...game.minigame.scores },
            endsAt: game.minigame.endsAt,
            type: game.minigame.type,
            level: game.minigame.level,
            teams: publicThermoTeams(room)
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

    if (room.game.minigame?.interval) {
        clearInterval(room.game.minigame.interval);
        room.game.minigame.interval = null;
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
        turnOrder: [],
        turnCursor: 0,
        currentPlayerId: null,

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

    cleanupPlayerMembership(playerId);

    if (playerRooms.has(playerId)) {
        socket.emit("roomError", "Ya perteneces a una partida. Sal de tu sala actual antes de crear otra.");
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

    cleanupPlayerMembership(playerId);

    if (playerRooms.has(playerId)) {
        const existingCode = playerRooms.get(playerId);

        if (existingCode === code) {
            restorePlayer(socket, playerId, rooms.get(code));
            return;
        }

        socket.emit("roomError", "Sigues dentro de la sala " + existingCode + ". Usa 'Salir de la sala' para poder unirte a otra.");
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
    room.game.turnOrder = getConnectedPlayers(room).map(player => player.id);

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
    room.game.currentPlayerId = null;
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

function createThermoTeams(participants, level) {
    const preset = THERMO_PRESETS[level] || THERMO_PRESETS.easy;
    const teams = [];

    for (let i = 0; i < participants.length; i += 2) {
        const members = participants.slice(i, i + 2);

        teams.push({
            id: teams.length,
            friend: members[0],
            oven: members[1],
            t1: preset.t1,
            t2: preset.t2,
            valve: 0,
            res: 0.5,
            hold: 0,
            need: 3.2,
            time: 0,
            stab: 0,
            phase: "sim",
            outcome: null,
            signal: null,
            calc: {},
            done: false
        });
    }

    return teams;
}

function thermoHumans(team) {
    return [team.friend, team.oven].filter(Boolean);
}

function publicThermoTeams(room) {
    const teams = room.game?.minigame?.teams;

    if (!teams) return null;

    return teams.map(team => ({
        id: team.id,
        friend: team.friend
            ? { id: team.friend, name: getPlayer(room, team.friend)?.name || "Jugador" }
            : null,
        oven: { id: team.oven, name: getPlayer(room, team.oven)?.name || "Jugador" }
    }));
}

function stepThermoTeam(team, p, dt) {
    team.time += dt;

    team.t1 -= 0.55 * (1 - team.res * 0.45) * dt;

    const k = (1.15 - team.res * 0.75) * p.k;
    const dq = team.valve / 100 * k * Math.max(0, team.t2 - team.t1) * dt * 1.65;

    team.t1 += dq / (p.m1 * p.c1);
    team.t2 -= dq / (p.m2 * p.c2);

    const safe1 = team.t1 >= p.smin && team.t1 <= p.smax;
    const safe2 = team.t2 >= p.smin && team.t2 <= p.smax;

    if (Math.abs(team.t2 - team.t1) <= 2.2 && safe1 && safe2) {
        team.hold += dt;
        team.stab = Math.min(600, team.stab + dt * 180);
    } else {
        team.hold = Math.max(0, team.hold - dt * 0.7);

        if (safe1) {
            team.stab = Math.min(600, team.stab + dt * 35);
        }
    }

    if (team.hold >= team.need) return "win";
    if (team.t1 <= p.lmin) return "freeze";
    if (team.t1 >= p.lmax) return "overheat";
    if (team.time >= THERMO_SIM_SECONDS) return "timeout";

    return null;
}

function sendThermoState(room, team) {
    const state = {
        teamId: team.id,
        t1: team.t1,
        t2: team.t2,
        valve: team.valve,
        res: team.res,
        hold: team.hold,
        need: team.need,
        time: team.time,
        stab: Math.round(team.stab),
        phase: team.phase,
        outcome: team.outcome,
        signal: team.signal,
        targetTemp: team.targetTemp,
        friend: team.friend,
        oven: team.oven
    };

    for (const id of thermoHumans(team)) {
        const player = getPlayer(room, id);

        if (player?.connected && player.socketId) {
            io.to(player.socketId).emit("thermoState", state);
        }
    }
}

function tickThermo(room) {
    const minigame = room.game?.minigame;

    if (!minigame || minigame.type !== "thermo") return;
    if (room.game.phase !== "minigame") return;

    const preset = THERMO_PRESETS[minigame.level] || THERMO_PRESETS.easy;

    for (const team of minigame.teams) {
        if (team.phase !== "sim") continue;

        const outcome = stepThermoTeam(team, preset, THERMO_TICK / 1000);

        if (outcome) {
            team.phase = "calc";
            team.outcome = outcome;

            if (outcome === "win") {
                team.stab = Math.max(600, team.stab);
            }
        }

        sendThermoState(room, team);
    }

    const winningTeam = minigame.teams.find(team => team.outcome === "win");
    if (winningTeam) {
        for (const team of minigame.teams) {
            const score = team.id === winningTeam.id ? 100 : thermoTeamScore(team);
            for (const id of thermoHumans(team)) minigame.scores[id] = score;
        }
        finishMinigame(room);
    }
}

function thermoTeamScore(team) {
    const humans = thermoHumans(team);
    const unit = humans.length === 2 ? 1 : 2;

    let calcPoints = 0;

    for (const id of humans) {
        if (Object.prototype.hasOwnProperty.call(team.calc, id)) {
            calcPoints += (team.calc[id] ? 200 : 50) * unit;
        }
    }

    return Math.max(0, Math.min(100, Math.round((team.stab + calcPoints) / 10)));
}

function checkThermoTeamDone(room, team) {
    const minigame = room.game?.minigame;

    if (!minigame || team.phase !== "calc" || team.done) return;

    const humans = thermoHumans(team);

    if (humans.length === 0) return;

    const everyoneAnswered = humans.every(id =>
        Object.prototype.hasOwnProperty.call(team.calc, id)
    );

    if (!everyoneAnswered) return;

    team.done = true;

    const score = thermoTeamScore(team);

    for (const id of humans) {
        minigame.scores[id] = score;
    }

    const everyoneScored = minigame.participants.every(id =>
        Object.prototype.hasOwnProperty.call(minigame.scores, id)
    );

    if (everyoneScored) {
        finishMinigame(room);
    }
}

function finalizeThermo(room, minigame) {
    if (minigame.type !== "thermo") return;

    if (minigame.interval) {
        clearInterval(minigame.interval);
        minigame.interval = null;
    }

    for (const team of minigame.teams) {
        const score = thermoTeamScore(team);

        for (const id of thermoHumans(team)) {
            if (!Object.prototype.hasOwnProperty.call(minigame.scores, id)) {
                minigame.scores[id] = score;
            }
        }
    }
}

function findThermoTeam(socket) {
    const room = getRoom(socket);
    const minigame = room?.game?.minigame;

    if (!room || !minigame || minigame.type !== "thermo") return {};
    if (room.game.phase !== "minigame") return {};

    const id = socket.data.playerId;
    const team = minigame.teams.find(t => t.friend === id || t.oven === id);

    return { room, team, id };
}

function thermoInput(socket, data) {
    const { team, id } = findThermoTeam(socket);

    if (!team || team.phase !== "sim") return;

    if (team.oven === id) {
        const valve = Number(data?.valve);

        if (Number.isFinite(valve)) {
            team.valve = Math.max(0, Math.min(100, valve));
        }
    }

    if (team.friend === id) {
        const res = Number(data?.res);

        if ([0.2, 0.5, 0.85].includes(res)) {
            team.res = res;
        }

        if (data?.signal === "more" || data?.signal === "stop") {
            team.signal = { type: data.signal, at: Date.now() };
        }

        const targetTemp = Number(data?.targetTemp);
        if (Number.isFinite(targetTemp) && targetTemp >= -50 && targetTemp <= 150) {
            team.targetTemp = targetTemp;
        }
    }
}

function thermoCalc(socket, data) {
    const { room, team, id } = findThermoTeam(socket);

    if (!team) return;
    if (Object.prototype.hasOwnProperty.call(team.calc, id)) return;

    team.calc[id] = data?.correct === true;

    if (team.phase === "calc") checkThermoTeamDone(room, team);
}

function getMinigameConfig(room) {
    const round = room.game.round;

    const type = FORCE_MINIGAME || (round % 2 === 0 ? "thermo" : "runner");

    if (type === "thermo") {
        const index = Math.max(0, Math.min(2, Math.floor(round / 2) - 1));

        return {
            type: "thermo",
            level: ["easy", "medium", "hard"][index],
            duration: THERMO_SECONDS
        };
    }

    return {
        type: "runner",
        level: null,
        duration: PLAYER_SECONDS
    };
}

function startMinigame(room) {
    if (!room.game || room.game.phase !== "lesson") return;

    const participants = getConnectedPlayers(room)
        .map(player => player.id);

    if (participants.length === 0) return;

    let config = getMinigameConfig(room);

    if (config.type === "thermo" && participants.length !== 4) {
        config = { type: "runner", level: null, duration: PLAYER_SECONDS };
    }

    const endsAt = Date.now() + config.duration * 1000;

    room.game.phase = "minigame";

    const minigame = {
        participants,
        scores: {},
        endsAt,
        type: config.type,
        level: config.level,
        teams: config.type === "thermo"
            ? createThermoTeams(participants, config.level)
            : null,
        timer: null,
        interval: null
    };

    room.game.minigame = minigame;

    io.to(room.code).emit("minigameStarted", {
        topicIndex: room.game.topicIndex,
        participants,
        type: config.type,
        level: config.level,
        teams: publicThermoTeams(room),
        duration: config.duration,
        endsAt
    });

    sendGameState(room);

    if (config.type === "thermo") {
        minigame.interval = setInterval(() => tickThermo(room), THERMO_TICK);
    }

    minigame.timer = setTimeout(() => {
        finishMinigame(room);
    }, config.duration * 1000);
}

function submitMinigameResult(socket, data) {
    const room = getRoom(socket);

    if (!room || !room.game) return;
    if (room.game.phase !== "minigame") return;

    const playerId = socket.data.playerId;
    const minigame = room.game.minigame;

    if (!minigame) return;

    if (minigame.type === "thermo") return;

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

    finalizeThermo(room, minigame);

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

    let winners = connectedParticipants
        .filter(player =>
            (minigame.scores[player.id] || 0) === highestScore
        )
        .map(player => player.id);

    if (
        minigame.type === "thermo" &&
        minigame.teams.length === 1 &&
        minigame.teams[0].outcome !== "win"
    ) {
        winners = [];
    }

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
    room.game.turnOrder = getConnectedPlayers(room).map(player => player.id);
    room.game.turnCursor = 0;
    room.game.currentPlayerId = null;
    room.game.hasRolled = false;

    sendGameState(room);
    startCurrentTurn(room);
}

function startCurrentTurn(room) {
    if (!room.game || room.game.phase !== "turn") return;

    const game = room.game;

    if (!Array.isArray(game.turnOrder)) {
        game.turnOrder = getConnectedPlayers(room).map(player => player.id);
        game.turnCursor = 0;
    }

    game.currentPlayerId = null;

    while (game.turnCursor < game.turnOrder.length) {
        const playerId = game.turnOrder[game.turnCursor];
        const player = getPlayer(room, playerId);

        if (!player || !player.connected) {
            game.turnCursor++;
            game.turnsTaken = game.turnCursor;
            continue;
        }

        if (player.frozen) {
            player.frozen = false;

            io.to(room.code).emit("turnSkipped", {
                playerId: player.id,
                playerName: player.name
            });

            game.turnCursor++;
            game.turnsTaken = game.turnCursor;
            continue;
        }

        game.turnIndex = room.players.findIndex(
            current => current.id === player.id
        );
        game.currentPlayerId = player.id;
        game.hasRolled = false;
        game.turnsTaken = game.turnCursor;

        io.to(room.code).emit("turnStarted", {
            playerId: player.id,
            playerName: player.name,
            round: game.round,
            turnsTaken: game.turnsTaken
        });

        sendGameState(room);
        return;
    }

    game.turnsTaken = game.turnOrder.length;
    game.currentPlayerId = null;
    startLesson(room);
}

function advanceTurn(room) {
    if (!room.game || room.game.phase !== "turn") return;

    const game = room.game;

    if (!game.currentPlayerId) return;

    if (game.advanceTimer) {
        clearTimeout(game.advanceTimer);
        game.advanceTimer = null;
    }

    game.currentPlayerId = null;
    game.turnCursor++;
    game.turnsTaken = game.turnCursor;
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
    if (game.currentPlayerId !== playerId) return;
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
    if (game.currentPlayerId !== playerId) return;
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

    if (index === -1) {
        if (playerRooms.get(playerId) === room.code) {
            playerRooms.delete(playerId);
        }
        return;
    }

    const player = room.players[index];

    if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
    }

    const game = room.game;
    const turnOrderIndex = game && game.phase === "turn"
        ? game.turnOrder.indexOf(playerId)
        : -1;

    const wasCurrentPlayer = game &&
        game.phase === "turn" &&
        game.currentPlayerId === playerId;

    room.players.splice(index, 1);
    playerRooms.delete(playerId);

    if (game && game.phase === "turn" && turnOrderIndex !== -1) {
        if (turnOrderIndex < game.turnCursor) {
            game.turnCursor = Math.max(0, game.turnCursor - 1);
        } else if (turnOrderIndex === game.turnCursor && wasCurrentPlayer) {
            if (game.advanceTimer) {
                clearTimeout(game.advanceTimer);
                game.advanceTimer = null;
            }

            game.currentPlayerId = null;
            game.hasRolled = false;
        }

        game.turnOrder.splice(turnOrderIndex, 1);
        game.turnsTaken = game.turnCursor;
    }

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

            if (game.minigame.type === "thermo") {
                for (const team of game.minigame.teams) {
                    if (team.oven === playerId || team.friend === playerId) {
                        const teammateId = team.oven === playerId
                            ? team.friend
                            : team.oven;

                        team.phase = "calc";
                        team.outcome = "timeout";
                        team.done = true;

                        if (teammateId && game.minigame.participants.includes(teammateId)) {
                            game.minigame.scores[teammateId] = 0;
                        }
                    }

                    delete team.calc[playerId];
                }

                game.minigame.teams =
                    game.minigame.teams.filter(team =>
                        team.friend && team.oven &&
                        team.friend !== playerId && team.oven !== playerId
                    );

                game.minigame.teams.forEach(team =>
                    checkThermoTeamDone(room, team)
                );

                if (game.phase !== "minigame") {
                    sendPlayerList(room);
                    return;
                }
            }

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
        if (game.currentPlayerId) {
            game.turnIndex = room.players.findIndex(
                current => current.id === game.currentPlayerId
            );
        }

        if (wasCurrentPlayer || !game.currentPlayerId) {
            startCurrentTurn(room);
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

    if (!room) {
        playerRooms.delete(playerId);
        socket.emit("roomLeft", { code: null });
        sendRoomList();
        return;
    }

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
            room.game.currentPlayerId === playerId
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
        socket.emit("roomList", getRoomListForPlayer(socket.data.playerId));
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

    socket.on("thermoInput", data => {
        thermoInput(socket, data || {});
    });

    socket.on("thermoCalc", data => {
        thermoCalc(socket, data || {});
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

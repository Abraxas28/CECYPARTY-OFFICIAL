const socket = io("http://localhost:3000");


function crearPartida(nombre) {

    socket.emit("createRoom", nombre);

}

// Unirse a una partida
function unirsePartida(codigo, nombre) {

    socket.emit("joinRoom", {
        code: codigo.toUpperCase(),
        playerName: nombre
    });

}

// Cuando se crea una sala
socket.on("roomCreated", (data) => {

    console.log("Sala creada:", data.code);
    console.log("Jugadores:", data.players);

});

// Cuando cambia la lista de jugadores
socket.on("playerList", (players) => {

    console.log("Jugadores conectados:", players);

});

socket.on("roomError", (message) => {

    alert(message);

});
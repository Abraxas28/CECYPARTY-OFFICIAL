<?php
require_once 'conexion.php';
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link
        href="https://fonts.googleapis.com/css2?family=Krub:wght@200;300;400;500;600;700&family=Sansita:wght@400;700;800;900&display=swap"
        rel="stylesheet">

    <link rel="stylesheet" href="includes/nav.css">
    <link rel="stylesheet" href="menu.css">

    <title>Menu de juego - Cecyparty</title>
</head>

<body>

    <header>
        <h1>Cecyparty</h1>

        <div class="perfil-container">
            <button class="perfil-btn" onclick="togglePerfil()">
                <img class="perfil" src="ab552e65f0dd4ebb7c8e1daecb2774ae.jpg" alt="foto-de-perfil">
            </button>

            <div class="menu-perfil" id="menuPerfil">
                <div class="perfil-titulo">
                    <strong>Mi cuenta</strong>
                    <span>Gestiona tu sesión</span>
                </div>

                <a href="cambiar_cuenta.php" class="opcion-perfil">
                    <span>👤</span>
                    Cambiar cuenta
                </a>

                <div class="separador-perfil"></div>

                <a href="cerrar_sesion.php" class="opcion-perfil cerrar">
                    <span>🚪</span>
                    Cerrar sesión
                </a>
            </div>
        </div>
    </header>

    <div class="layout">

        <nav class="sidebar">

            <a href="menu.php" class="nav-item active">
                <span>⌂</span>
                <span>Inicio</span>
            </a>

            <a href="tienda.php" class="nav-item">
                <span>♙</span>
                <span>Tienda</span>
            </a>

            <a href="progreso.php" class="nav-item">
                <span>◉</span>
                <span>Progreso</span>
            </a>

            <a href="ayuda.php" class="nav-item">
                <span>▣</span>
                <span>Ayuda</span>
            </a>

            <a href="configuracion.php" class="nav-item configuracion">
                <span>⚙</span>
                <span>Configuración</span>
            </a>

        </nav>


        <main class="content">

            <h2>Menú de partidas</h2>

            <p class="subtitulo">
                Encuentra una partida o crea tu propia aventura.
            </p>

            <section class="salas-online">
                <h2>Partidas disponibles</h2>

                <div class="acciones-partidas">
                    <button class="btn-refresh" onclick="actualizarPartidas()">
                        Actualizar partidas
                    </button>
                </div>

                <div id="listaSalas">
                    <p>Buscando partidas...</p>
                </div>
            </section>

            <section class="crear-partida">
                <h2>Crear una partida</h2>

                <div class="datos-jugador">
                    <input type="text" id="nombreJugador" placeholder="Escribe tu nombre" maxlength="20">
                </div>

                <div class="seleccion-mapa">
                    <h3>Selecciona un mapa</h3>

                    <select id="mapaPartida">
                        <option value="Bosque Químico">Bosque Químico</option>
                        <option value="Galaxia Gravitacional">Galaxia Gravitacional</option>
                        <option value="Laboratorio del Caos">Laboratorio del Caos</option>
                        <option value="Isla Termodinámica">Isla Termodinámica</option>
                        <option value="Reino Molecular">Reino Molecular</option>
                        <option value="Ciudad Eléctrica">Ciudad Eléctrica</option>
                        <option value="Pirámides de la Materia">Pirámides de la Materia</option>
                        <option value="Océano de las Presiones">Océano de las Presiones</option>
                        <option value="Valle de los Elementos">Valle de los Elementos</option>
                        <option value="Montañas de la Gravedad">Montañas de la Gravedad</option>
                    </select>
                </div>

                <button class="btn-partida" onclick="crearPartida()">
                    Crear partida
                </button>
            </section>

            <div class="mascota-cecyparty">
                <img src="img/gato_emocionado-removebg-preview.png" alt="Gatito emocionado">
            </div>

        </main>


    </div>

    <div class="pantalla-carga" id="pantallaCarga">
        <div class="loader"></div>
        <h2>Preparando partidas...</h2>
        <p>Estamos preparando tu próxima aventura</p>
    </div>


    <script src="http://localhost:3000/socket.io/socket.io.js"></script>

    <script>
        const socket = io("http://localhost:3000");

        const listaSalas = document.getElementById("listaSalas");
        const nombreJugador = document.getElementById("nombreJugador");
        const mapaPartida = document.getElementById("mapaPartida");

        let codigoSalaActual = null;

        function togglePerfil() {
            document.getElementById("menuPerfil").classList.toggle("mostrar");
        }

        document.addEventListener("click", function (event) {
            const contenedor = document.querySelector(".perfil-container");

            if (!contenedor.contains(event.target)) {
                document.getElementById("menuPerfil").classList.remove("mostrar");
            }
        });

        socket.on("connect", () => {
            actualizarPartidas();
        });

        socket.on("connect_error", () => {
            listaSalas.textContent = "No se pudo conectar con el servidor.";
        });

        function actualizarPartidas() {
            if (!socket.connected) {
                listaSalas.textContent = "Conectando con el servidor...";
                return;
            }

            socket.emit("getRooms");
        }

        function crearPartida() {
            const nombre = nombreJugador.value.trim();
            const mapa = mapaPartida.value;

            if (!nombre) {
                alert("Escribe tu nombre antes de crear una partida.");
                nombreJugador.focus();
                return;
            }

            socket.emit("createRoom", {
                playerName: nombre,
                mapName: mapa
            });
        }

        function unirsePartida(codigo) {
            const nombre = nombreJugador.value.trim();

            if (!nombre) {
                alert("Escribe tu nombre antes de unirte.");
                nombreJugador.focus();
                return;
            }

            socket.emit("joinRoom", {
                code: codigo,
                playerName: nombre
            });
        }

        socket.on("roomList", (salas) => {
            listaSalas.replaceChildren();

            if (!salas || salas.length === 0) {
                const mensaje = document.createElement("p");
                mensaje.textContent = "No hay partidas disponibles. ¡Crea una!";
                listaSalas.appendChild(mensaje);
                return;
            }

            salas.forEach((sala) => {
                const tarjeta = document.createElement("div");
                tarjeta.className = "tarjeta-partida";

                const informacion = document.createElement("div");
                informacion.className = "partida-info";

                const titulo = document.createElement("h3");
                titulo.textContent = sala.mapName || "Mapa desconocido";

                const codigo = document.createElement("p");
                codigo.textContent = "Código: " + sala.code;

                const jugadores = document.createElement("p");
                const cantidad = sala.players ? sala.players.length : 0;
                const maximo = sala.maxPlayers || 4;

                jugadores.textContent = "Jugadores: " + cantidad + "/" + maximo;

                const boton = document.createElement("button");
                boton.className = "btn-partida";
                boton.textContent = "Unirse a la partida";
                boton.addEventListener("click", () => {
                    unirsePartida(sala.code);
                });

                informacion.appendChild(titulo);
                informacion.appendChild(codigo);
                informacion.appendChild(jugadores);
                informacion.appendChild(boton);
                tarjeta.appendChild(informacion);

                listaSalas.appendChild(tarjeta);
            });
        });

        socket.on("roomCreated", (data) => {
            codigoSalaActual = data.code;

            alert("¡Partida creada! Código: " + data.code);

            actualizarPartidas();
        });

        socket.on("joinedRoom", (data) => {
            codigoSalaActual = data.code;

            alert("Te uniste a la partida " + data.code);

            actualizarPartidas();
        });

        socket.on("playerList", () => {
            actualizarPartidas();
        });

        socket.on("roomError", (message) => {
            alert(message);
        });

        socket.on("roomClosed", () => {
            codigoSalaActual = null;
            actualizarPartidas();
        });
    </script>
</body>

</html>


</body>

</html>
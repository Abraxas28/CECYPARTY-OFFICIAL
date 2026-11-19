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
        href="https://fonts.googleapis.com/css2?family=Krub:wght@200;300;400;500;600;700&family=Sansita:wght@400;700;800;900&family=Fredoka:wght@400;600;700&display=swap"
        rel="stylesheet">

    <link rel="stylesheet" href="includes/nav.css">
    <link rel="stylesheet" href="css/tienda.css">
    <link rel="stylesheet" href="menu.css">

    <title>Tienda - Cecyparty</title>
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

            <a href="menu.php" class="nav-item">
                <span>⌂</span>
                <span>Inicio</span>
            </a>

            <a href="tienda.php" class="nav-item active">
                <span>🛍</span>
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

            <h2>Tienda Cecyparty</h2>

            <p class="subtitulo">
                Personaliza tu avatar y consigue nuevos artículos para destacar.
            </p>

            <div class="tienda-contenido">

                <section class="catalogo">

                    <div class="pestanas" id="pestanas"></div>

                    <section class="seccion" id="gorros" data-titulo="Gorros">

                        <div class="item" data-nombre="Gorra Newton" data-precio="50">
                            <img src="img/ropa/gorros/gorro1.svg" alt="Gorra Newton">
                        </div>

                        <div class="item" data-nombre="Birrete Sabio" data-precio="80">
                            <img src="img/ropa/gorros/gorro2.svg" alt="Birrete Sabio">
                        </div>

                        <div class="item" data-nombre="Casco Cohete" data-precio="120">
                            <img src="img/ropa/gorros/gorro3.svg" alt="Casco Cohete">
                        </div>

                        <div class="item" data-nombre="Sombrero Mago" data-precio="150">
                            <img src="img/ropa/gorros/gorro4.svg" alt="Sombrero Mago">
                        </div>

                    </section>

                    <section class="seccion" id="playeras" data-titulo="Playeras">

                        <div class="item" data-nombre="Bata Curie" data-precio="100">
                            <img src="img/ropa/playeras/playera1.svg" alt="Bata Curie">
                        </div>

                        <div class="item" data-nombre="Playera Party" data-precio="40">
                            <img src="img/ropa/playeras/playera2.svg" alt="Playera Party">
                        </div>

                        <div class="item" data-nombre="Sudadera Átomo" data-precio="130">
                            <img src="img/ropa/playeras/playera3.svg" alt="Sudadera Átomo">
                        </div>

                        <div class="item" data-nombre="Camisa Newton" data-precio="70">
                            <img src="img/ropa/playeras/playera4.svg" alt="Camisa Newton">
                        </div>

                    </section>

                    <section class="seccion" id="pantalones" data-titulo="Pantalones">

                        <div class="item" data-nombre="Jeans Fricción" data-precio="80">
                            <img src="img/ropa/pantalones/pantalon1.svg" alt="Jeans Fricción">
                        </div>

                        <div class="item" data-nombre="Pants Inercia" data-precio="60">
                            <img src="img/ropa/pantalones/pantalon2.svg" alt="Pants Inercia">
                        </div>

                        <div class="item" data-nombre="Falda Galaxia" data-precio="90">
                            <img src="img/ropa/pantalones/pantalon3.svg" alt="Falda Galaxia">
                        </div>

                        <div class="item" data-nombre="Cargo Lab" data-precio="100">
                            <img src="img/ropa/pantalones/pantalon4.svg" alt="Cargo Lab">
                        </div>

                    </section>

                    <section class="seccion" id="accesorios" data-titulo="Accesorios de cara">

                        <div class="item" data-nombre="Lentes Einstein" data-precio="70">
                            <img src="img/ropa/accesorios/accesorio1.svg" alt="Lentes Einstein">
                        </div>

                        <div class="item" data-nombre="Gafas Láser" data-precio="110">
                            <img src="img/ropa/accesorios/accesorio2.svg" alt="Gafas Láser">
                        </div>

                        <div class="item" data-nombre="Googles Lab" data-precio="90">
                            <img src="img/ropa/accesorios/accesorio3.svg" alt="Googles Lab">
                        </div>

                        <div class="item" data-nombre="Antifaz Rayo" data-precio="100">
                            <img src="img/ropa/accesorios/accesorio4.svg" alt="Antifaz Rayo">
                        </div>

                    </section>

                    <section class="seccion" id="epica" data-titulo="Épica / Festivos">

                        <div class="item" data-nombre="Traje Astronauta" data-precio="250">
                            <img src="img/ropa/epica/epica1.svg" alt="Traje Astronauta">
                        </div>

                        <div class="item" data-nombre="Disfraz Catrina" data-precio="200">
                            <img src="img/ropa/epica/epica2.svg" alt="Disfraz Catrina">
                        </div>

                        <div class="item" data-nombre="Capa Supernova" data-precio="300">
                            <img src="img/ropa/epica/epica3.svg" alt="Capa Supernova">
                        </div>

                        <div class="item" data-nombre="Alas Eléctricas" data-precio="350">
                            <img src="img/ropa/epica/epica4.svg" alt="Alas Eléctricas">
                        </div>

                    </section>

                </section>

                <aside class="vista-avatar">

                    <div class="avatar-titulo">
                        <h3>Tu avatar</h3>
                        <span>Vista previa</span>
                    </div>

                    <div class="marco-avatar">
                        <img id="avatarImg" alt="Avatar">
                    </div>



                    <div class="detalle">
                        <b id="detNombre">Elige una prenda</b>
                    </div>

                    <button type="button" id="cambiarAvatar" class="btn">
                        Cambiar Avatar
                    </button>

                    <button class="btn" id="comprar" disabled>
                        COMPRAR
                    </button>

                </aside>

            </div>

        </main>

    </div>

    <div class="aviso" id="aviso"></div>

    <?php
    $archivosAvatar = glob(__DIR__ . '/avatares/*.{png,jpg,jpeg,webp}', GLOB_BRACE);
    $listaAvatares = array_map(function ($archivo) {
        return 'avatares/' . basename($archivo);
    }, $archivosAvatar);
    ?>

    <script>
        window.LISTA_AVATARES = <?= json_encode($listaAvatares) ?>;
    </script>
    <script src="js/tienda.js"></script>

    <script src="js/tienda.js"></script>

    <script>
        function togglePerfil() {
            document.getElementById('menuPerfil').classList.toggle('mostrar');
        }

        document.addEventListener('click', function (event) {
            const contenedor = document.querySelector('.perfil-container');

            if (!contenedor.contains(event.target)) {
                document.getElementById('menuPerfil').classList.remove('mostrar');
            }
        });
    </script>

</body>

</html>
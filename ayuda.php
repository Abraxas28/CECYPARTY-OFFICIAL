
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

    <link href="https://fonts.googleapis.com/css2?family=Krub:wght@200;300;400;500;600;700&family=Sansita:wght@400;700;800;900&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="includes/nav.css">
    <link rel="stylesheet" href="ayuda.css">

    <title>Ayuda - Cecyparty</title>
</head>

<body>

    <header>
        <h1>Cecyparty</h1>

        <div class="perfil-container">
            <button class="perfil-btn" onclick="togglePerfil()">
                <img class="perfil" src="ab552e65f0dd4ebb7c8e1daecb2774ae.jpg" alt="Foto de perfil">
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

            <a href="avatar.php" class="nav-item">
                <span>♙</span>
                <span>Avatar</span>
            </a>

            <a href="progreso.php" class="nav-item">
                <span>◉</span>
                <span>Progreso</span>
            </a>

            <a href="ayuda.php" class="nav-item active">
                <span>▣</span>
                <span>Ayuda</span>
            </a>

            <a href="configuracion.php" class="nav-item configuracion">
                <span>⚙</span>
                <span>Configuración</span>
            </a>

        </nav>

        <main class="content">

            <section class="bienvenida-ayuda">
                <div class="bienvenida-texto">
                    <span class="etiqueta-ayuda">CENTRO DE AYUDA</span>

                    <h2>¡Bienvenido a Cecyparty!</h2>

                    <p>
                        ¿Tienes dudas sobre cómo funciona la plataforma?
                        ¡No te preocupes! Aquí encontrarás toda la información
                        necesaria para comenzar tu aventura, aprender y
                        disfrutar de nuestras partidas.
                    </p>

                    <a href="#preguntas" class="btn-ayuda">
                        Resolver mis dudas
                    </a>
                </div>

                <div class="bienvenida-decoracion">
                    <span>?</span>
                </div>
            </section>


            <section class="seccion-ayuda">

                <div class="titulo-seccion">
                    <span class="numero-seccion">01</span>

                    <div>
                        <h2>¿Qué es Cecyparty?</h2>
                        <p>Conoce nuestra plataforma educativa.</p>
                    </div>
                </div>

                <div class="bloque-informacion">
                    <div class="texto-informacion">
                        <h3>Aprender también puede ser divertido</h3>

                        <p>
                            Cecyparty es una plataforma educativa que combina
                            el aprendizaje con la diversión de los videojuegos.
                            Su objetivo es ofrecer una experiencia diferente
                            en la que los estudiantes puedan poner en práctica
                            sus conocimientos mientras exploran distintos
                            escenarios y participan en desafíos.
                        </p>

                        <p>
                            A través de diferentes mundos, actividades y
                            partidas, podrás descubrir conceptos relacionados
                            con distintas áreas de estudio, resolver retos
                            y aprender de una manera más dinámica.
                        </p>
                    </div>

                    <div class="espacio-imagen">
                        <img src="img/ayuda/conejo.jpg" alt="Imagen de introducción a Cecyparty">
                    </div>
                </div>

            </section>


            <section class="seccion-ayuda">

                <div class="titulo-seccion">
                    <span class="numero-seccion">02</span>

                    <div>
                        <h2>¿Qué aprenderás?</h2>
                        <p>Explora las áreas educativas disponibles.</p>
                    </div>
                </div>

                <div class="bloque-informacion">
                    <div class="espacio-imagen">
                        <img src="img/ayuda/dinosauria_confundida.jpg" alt="Áreas de aprendizaje">
                    </div>

                    <div class="texto-informacion">
                        <h3>Explora diferentes áreas del conocimiento</h3>

                        <p>
                            Durante tu experiencia en Cecyparty encontrarás
                            diferentes escenarios relacionados con temas
                            educativos.
                        </p>

                        <div class="lista-aprendizaje">

                            <div class="aprendizaje-item">
                                <span>⚗️</span>
                                <div>
                                    <strong>Química</strong>
                                    <p>
                                        Conoce los elementos, las sustancias,
                                        las moléculas y las transformaciones
                                        de la materia.
                                    </p>
                                </div>
                            </div>

                            <div class="aprendizaje-item">
                                <span>⚡</span>
                                <div>
                                    <strong>Física</strong>
                                    <p>
                                        Descubre conceptos como la energía,
                                        el movimiento, la gravedad y las fuerzas.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

            </section>


            <section class="seccion-ayuda">

                <div class="titulo-seccion">
                    <span class="numero-seccion">03</span>

                    <div>
                        <h2>¿Cómo acceder a las partidas?</h2>
                        <p>Sigue estos sencillos pasos para comenzar a jugar.</p>
                    </div>
                </div>

                <div class="pasos-container">

                    <div class="paso">
                        <div class="paso-numero">1</div>

                        <div class="paso-contenido">
                            <h3>Inicia sesión</h3>

                            <p>
                                Ingresa a Cecyparty utilizando tu cuenta.
                                Si todavía no tienes una, primero debes
                                completar el proceso de registro.
                            </p>

                            <div class="espacio-imagen imagen-paso">
                                <img src="img/ayuda/hola.jpg" alt="Pantalla de inicio de sesión">
                            </div>
                        </div>
                    </div>


                    <div class="paso">
                        <div class="paso-numero">2</div>

                        <div class="paso-contenido">
                            <h3>Entra al menú de partidas</h3>

                            <p>
                                Una vez dentro de tu cuenta, dirígete a la
                                sección de Inicio. Allí encontrarás los
                                diferentes mundos disponibles.
                            </p>

                            <div class="espacio-imagen imagen-paso">
                                <img src="img/ayuda/venada_sentada.jpg" alt="Menú de partidas">
                            </div>
                        </div>
                    </div>


                    <div class="paso">
                        <div class="paso-numero">3</div>

                        <div class="paso-contenido">
                            <h3>Selecciona un mundo</h3>

                            <p>
                                Explora las tarjetas disponibles y elige
                                la partida que más te interese. Cada mundo
                                cuenta con una temática y características
                                diferentes.
                            </p>

                            <div class="espacio-imagen imagen-paso">
                                <img src="imagenes/ayuda/seleccionar-mundo.jpg" alt="Selección de un mundo">
                            </div>
                        </div>
                    </div>


                    <div class="paso">
                        <div class="paso-numero">4</div>

                        <div class="paso-contenido">
                            <h3>¡Comienza tu aventura!</h3>

                            <p>
                                Presiona el botón para jugar y sigue las
                                indicaciones que aparezcan en pantalla.
                                Prepárate para explorar, aprender y superar
                                los desafíos.
                            </p>

                            <div class="espacio-imagen imagen-paso">
                                <img src="imagenes/ayuda/partida.jpg" alt="Ejemplo de una partida">
                            </div>
                        </div>
                    </div>

                </div>

            </section>


            <section class="seccion-ayuda">

                <div class="titulo-seccion">
                    <span class="numero-seccion">04</span>

                    <div>
                        <h2>Preguntas frecuentes</h2>
                        <p>Encuentra respuestas a las dudas más comunes.</p>
                    </div>
                </div>

                <div class="preguntas-container" id="preguntas">

                    <details class="pregunta">
                        <summary>
                            ¿Cómo puedo crear una cuenta?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Dirígete a la página de registro, completa los
                            datos solicitados y selecciona la opción para
                            crear tu cuenta. Una vez registrado, podrás
                            iniciar sesión y acceder a Cecyparty.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Cómo puedo acceder a una partida?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Inicia sesión, entra a la sección de Inicio y
                            selecciona el mundo que quieras explorar.
                            Después, presiona el botón "Jugar ahora"
                            para continuar.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Necesito tener conocimientos previos?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            No es necesario ser un experto. La plataforma
                            está pensada para que puedas aprender y reforzar
                            tus conocimientos mientras participas en las
                            actividades.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Puedo cambiar mi avatar?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            ¡Claro! Dirígete a la sección Avatar desde el
                            menú lateral para consultar las opciones de
                            personalización disponibles.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Cómo puedo consultar mi progreso?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Entra a la sección Progreso desde el menú
                            lateral. Allí podrás consultar la información
                            de tu avance, de acuerdo con las funciones
                            disponibles en la plataforma.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Qué hago si una partida no carga?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Comprueba tu conexión a internet, actualiza la
                            página e intenta acceder nuevamente. Si el
                            problema continúa, comunícalo al responsable
                            de la plataforma.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Puedo jugar con otras personas?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Las partidas pueden incluir a varios jugadores.
                            Consulta las indicaciones de cada mundo para
                            conocer sus condiciones de participación.
                        </p>
                    </details>


                    <details class="pregunta">
                        <summary>
                            ¿Qué hago si olvidé mi contraseña?
                            <span class="icono-pregunta">+</span>
                        </summary>

                        <p>
                            Utiliza la opción de recuperación de contraseña,
                            si está habilitada en la página de inicio de
                            sesión. También puedes solicitar ayuda al
                            responsable de la plataforma.
                        </p>
                    </details>

                </div>

            </section>


            <section class="contacto-ayuda">

                <div class="contacto-icono">💬</div>

                <div class="contacto-texto">
                    <h2>¿Todavía tienes dudas?</h2>

                    <p>
                        Si no encontraste la respuesta que buscabas,
                        solicita ayuda al responsable de Cecyparty.
                        ¡Estamos para ayudarte!
                    </p>
                </div>

            </section>


            <footer class="footer-ayuda">
                <p>© <?php echo date("Y"); ?> Cecyparty. Todos los derechos reservados.</p>
                <span>Aprender nunca fue tan divertido. 🌱</span>
            </footer>

        </main>

    </div>


    <script>
        function togglePerfil() {
            document.getElementById('menuPerfil').classList.toggle('mostrar');
        }

        document.addEventListener('click', function(event) {
            const contenedor = document.querySelector('.perfil-container');

            if (!contenedor.contains(event.target)) {
                document.getElementById('menuPerfil').classList.remove('mostrar');
            }
        });

        const preguntas = document.querySelectorAll('.pregunta');

        preguntas.forEach(pregunta => {
            pregunta.addEventListener('toggle', function() {
                if (this.open) {
                    preguntas.forEach(otraPregunta => {
                        if (otraPregunta !== this) {
                            otraPregunta.removeAttribute('open');
                        }
                    });
                }
            });
        });
    </script>

</body>
</html>

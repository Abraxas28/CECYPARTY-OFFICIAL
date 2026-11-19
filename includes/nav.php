
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

        <a href="menu.php" class="nav-item <?= basename($_SERVER['PHP_SELF']) == 'menu.php' ? 'active' : '' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>
            </svg>
            <span>Inicio</span>
        </a>

        <a href="tienda.php" class="nav-item <?= basename($_SERVER['PHP_SELF']) == 'tienda.php' ? 'active' : '' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z"/>
            </svg>
            <span>Tienda</span>
        </a>

        <a href="progreso.php" class="nav-item <?= basename($_SERVER['PHP_SELF']) == 'progreso.php' ? 'active' : '' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="8"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="8"
                    stroke-dasharray="238.76" stroke-dashoffset="59.69" transform="rotate(-90 50 50)"/>
                <path d="M42 35 L57 50 L42 65" fill="none" stroke="currentColor" stroke-width="6"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Progreso</span>
        </a>

        <a href="ayuda.php" class="nav-item <?= basename($_SERVER['PHP_SELF']) == 'ayuda.php' ? 'active' : '' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 3h-9C6.67 3 6 3.67 6 4.5v15c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zm-4.25 14h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>Ayuda</span>
        </a>

        <a href="configuracion.php" class="nav-item configuracion <?= basename($_SERVER['PHP_SELF']) == 'configuracion.php' ? 'active' : '' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.07-.94 0-.32-.02-.64-.07-.94l2.03-1.58-1.92-3.32-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54h-3.84l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54h3.84l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96 1.92-3.32zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>
            </svg>
            <span>Configuración</span>
        </a>

    </nav>

    <main class="content">
        <?php if (isset($contenido)): ?>
            <?= $contenido ?>
        <?php endif; ?>
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
</script>

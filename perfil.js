 function togglePerfil() {
        document.getElementById('menuPerfil').classList.toggle('mostrar');
    }

    document.addEventListener('click', function(event) {
        const contenedor = document.querySelector('.perfil-container');
        const menu = document.getElementById('menuPerfil');

        if (!contenedor.contains(event.target)) {
            menu.classList.remove('mostrar');
        }
    });
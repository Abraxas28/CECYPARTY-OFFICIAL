// Perfil
var PERFIL = {
  nombre: "Venada_Lab",
  foto: "avatares/venada.jpg",
};

// Datos guardados
var saldo = Number(localStorage.getItem("cp3_saldo") || 500);
var comprados = JSON.parse(localStorage.getItem("cp3_comprados") || "[]");
var puestos = JSON.parse(localStorage.getItem("cp3_puestos") || "{}");

var secciones = Array.prototype.slice.call(
  document.querySelectorAll(".seccion"),
);
var actual = secciones[0];
var elegido = null;

// Perfil
var fotoPerfil = document.getElementById("fotoPerfil");
var nombrePerfil = document.getElementById("nombrePerfil");
var avatarImg = document.getElementById("avatarImg");

if (fotoPerfil) fotoPerfil.src = PERFIL.foto;
if (nombrePerfil) nombrePerfil.textContent = PERFIL.nombre;
if (avatarImg) avatarImg.src = PERFIL.foto;

var listaAvatares = window.LISTA_AVATARES || [];
var indiceAvatar = listaAvatares.indexOf(PERFIL.foto);

if (indiceAvatar < 0) indiceAvatar = 0;

var botonCambiarAvatar = document.getElementById("cambiarAvatar");

if (botonCambiarAvatar) {
  botonCambiarAvatar.onclick = function () {
    if (listaAvatares.length === 0) {
      avisar("No se encontraron avatares");
      return;
    }

    indiceAvatar = (indiceAvatar + 1) % listaAvatares.length;

    PERFIL.foto = listaAvatares[indiceAvatar];

    if (avatarImg) avatarImg.src = PERFIL.foto;
    if (fotoPerfil) fotoPerfil.src = PERFIL.foto;

    avisar("¡Avatar cambiado!");
  };
}

// Preparar prendas
secciones.forEach(function (s) {
  Array.prototype.slice
    .call(s.querySelectorAll(".item"))
    .forEach(function (it, i) {
      it.dataset.clave = s.id + i;

      if (!it.querySelector(".nombre")) {
        it.insertAdjacentHTML(
          "beforeend",
          '<div class="nombre">' + it.dataset.nombre + "</div>",
        );
      }

      if (!it.querySelector(".precio")) {
        it.insertAdjacentHTML("beforeend", '<div class="precio"></div>');
      }

      if (i === 0 && !it.querySelector(".etiqueta")) {
        it.insertAdjacentHTML(
          "beforeend",
          '<span class="etiqueta">NUEVO</span>',
        );
      }

      it.onclick = function () {
        elegido = it;
        dibujar();
      };
    });
});

// Pestañas
function dibujarPestanas() {
  var cont = document.getElementById("pestanas");
  cont.innerHTML = "";

  secciones.forEach(function (s) {
    var b = document.createElement("button");

    b.className = "pestana" + (s === actual ? " activa" : "");
    b.textContent =
      s.dataset.titulo + " (" + s.querySelectorAll(".item").length + ")";

    b.onclick = function () {
      actual = s;
      elegido = null;
      dibujar();
    };

    cont.appendChild(b);
  });
}

// Dibujar tienda
function dibujar() {
  dibujarPestanas();

  var saldoElemento = document.getElementById("saldo");
  if (saldoElemento) saldoElemento.textContent = saldo;

  secciones.forEach(function (s) {
    s.style.display = s === actual ? "grid" : "none";

    Array.prototype.slice
      .call(s.querySelectorAll(".item"))
      .forEach(function (it) {
        var tengo = comprados.indexOf(it.dataset.clave) >= 0;
        var puesto = puestos[s.id] === it.dataset.clave;

        it.classList.toggle("elegido", it === elegido);
        it.classList.toggle("puesto", puesto);

        var precio = it.querySelector(".precio");

        if (puesto) {
          precio.textContent = "Equipado";
        } else if (tengo) {
          precio.textContent = "Tuyo";
        } else {
          precio.innerHTML =
            '<img class="icono-moneda" src="img/iconos/moneda.svg" alt="Monedas">' +
            it.dataset.precio;
        }
      });
  });

  dibujarBoton();
}

// Botón de compra
function dibujarBoton() {
  var btn = document.getElementById("comprar");
  var detNombre = document.getElementById("detNombre");

  if (!btn || !detNombre) return;

  if (!elegido) {
    detNombre.textContent = "Elige una prenda";
    btn.disabled = true;
    btn.textContent = "COMPRAR";
    return;
  }

  var clave = elegido.dataset.clave;
  var precio = Number(elegido.dataset.precio);
  var tengo = comprados.indexOf(clave) >= 0;

  detNombre.textContent = elegido.dataset.nombre;
  btn.disabled = false;

  if (tengo) {
    btn.textContent = puestos[actual.id] === clave ? "QUITAR" : "EQUIPAR";

    btn.onclick = function () {
      puestos[actual.id] = puestos[actual.id] === clave ? null : clave;

      guardar();
      dibujar();
    };
  } else {
    btn.textContent = "COMPRAR";

    btn.onclick = function () {
      if (saldo < precio) {
        avisar("Te faltan monedas");
        return;
      }

      saldo -= precio;
      comprados.push(clave);

      guardar();
      dibujar();
      avisar("¡Compraste " + elegido.dataset.nombre + "!");
    };
  }
}

// Guardar datos
function guardar() {
  localStorage.setItem("cp3_saldo", saldo);
  localStorage.setItem("cp3_comprados", JSON.stringify(comprados));
  localStorage.setItem("cp3_puestos", JSON.stringify(puestos));
}

// Avisos
function avisar(t) {
  var a = document.getElementById("aviso");

  if (!a) return;

  a.textContent = t;
  a.classList.add("ver");

  setTimeout(function () {
    a.classList.remove("ver");
  }, 2200);
}

dibujar();

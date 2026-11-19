// inicio
var barra = document.getElementById("barra");
var porc = document.getElementById("porc");
var texto = document.getElementById("texto");
var carga = document.getElementById("carga");
var corredor = document.getElementById("corredor");
var frame = document.getElementById("frameAvatar");
var video = document.getElementById("videoAvatar");

// video avatar (ruta)
var VIDEO_AVATAR = "";

var mensajes = [
  "Cargando tema...",
  "Mezclando ingredientes...",
  "Preparando acertijos...",
  "Ajustando la gravedad...",
  "¡Casi listo!",
];

// globos
var colores = [
  "#E8676B",
  "#F2B45A",
  "#5B93D0",
  "#F4D75E",
  "#7F67D6",
  "#86E84C",
];
for (var i = 0; i < 8; i++) {
  var g = document.createElement("div");
  g.className = "globo";
  g.style.background = colores[i % colores.length];
  g.style.left = 5 + i * 12 + "%";
  g.style.animationDuration = 9 + Math.random() * 6 + "s";
  g.style.animationDelay = -Math.random() * 10 + "s";
  carga.appendChild(g);
}

// burbujas
for (var b = 0; b < 8; b++) {
  var bu = document.createElement("div");
  var t = 10 + Math.random() * 18;
  bu.className = "burbuja";
  bu.style.width = bu.style.height = t + "px";
  bu.style.left = 46 + Math.random() * 8 + "%";
  bu.style.top = "30%";
  bu.style.animationDuration = 2 + Math.random() * 2 + "s";
  bu.style.animationDelay = -Math.random() * 3 + "s";
  carga.appendChild(bu);
}

// avatar
if (VIDEO_AVATAR) {
  video.src = VIDEO_AVATAR;
  video.style.display = "block";
  frame.style.display = "none";
  video.play();
} else {
  var cuadro = 1;

  setInterval(function () {
    cuadro = cuadro === 1 ? 2 : 1;
    frame.src = "img/avatar_corriendo" + cuadro + ".png";
  }, 500);
}

// avance
var avance = 0;
var timer = setInterval(function () {
  avance += 0.4 + Math.random() * 1.6;
  if (avance > 100) avance = 100;
  var p = Math.floor(avance);
  barra.style.width = avance + "%";
  porc.textContent = p + "%";
  corredor.style.left = avance + "%";
  corredor.style.transform = "translateX(-" + avance + "%)";
  texto.textContent = mensajes[Math.min(Math.floor(avance / 21), 4)];

  // decisión
  if (avance >= 100) {
    clearInterval(timer);
    texto.textContent = "¡Listo para jugar!";
    document.getElementById("entrar").style.display = "inline-block";
  }
}, 100);

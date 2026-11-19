<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CECyT Party - Cargando</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/pantalla_carga.css">
</head>
<body>
<!-- inicio -->
<div class="carga" id="carga">

  <!-- poción -->
  <img class="pocion" src="img/pocion_sin_fondo.png" alt="Poción">

  <!-- texto -->
  <div class="estado"><div class="bolita"></div><span id="texto">Cargando tema...</span></div>

  <!-- botón entrar -->
  <button class="btn" id="entrar" onclick="location.href='tienda.html'">Entrar</button>

  <!-- barra -->
  <div class="zona-barra">
    <div class="pista">
      <div class="corredor" id="corredor">
        <!-- video avatar -->
        <video id="videoAvatar" muted loop playsinline></video>
        <!-- avatar corriendo -->
        <img id="frameAvatar" src="img/avatar_corriendo1.png" alt="Avatar corriendo">
      </div>
    </div>
    <div class="barra-caja">
      <div class="barra" id="barra"></div>
      <span class="porcentaje" id="porc">0%</span>
    </div>
  </div>

  <!-- volver -->
  <a class="btn volver" href="index.html">← Volver al inicio</a>
</div>
<script src="js/carga.js"></script>
</body>
</html>

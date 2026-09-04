// Cargamos las variables de entorno del archivo .env.
require("dotenv").config();

// Importamos la app de Express.
const app = require("./src/app");

// Definimos el puerto.
// Si no existe PORT en .env, usará 3001.
const PORT = process.env.PORT || 3001;

/**
 * Iniciamos el servidor.
 *
 * 0.0.0.0 permite que otros dispositivos
 * de la misma red, como el celular,
 * puedan conectarse a esta API.
 */
app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `API de Vibra la vida corriendo en el puerto ${PORT}`
  );

  console.log(
    `Desde esta laptop: http://localhost:${PORT}`
  );

  console.log(
    `Desde el celular: http://192.168.174.16:${PORT}`
  );
});
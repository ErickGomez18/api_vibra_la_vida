// Cargamos las variables de entorno del archivo .env.
require("dotenv").config();

// Importamos la app de Express.
const app = require("./src/app");

// Definimos el puerto.
// Render asignará PORT automáticamente.
// Si no existe, usará 3001 en local.
const PORT = process.env.PORT || 3001;

/**
 * Iniciamos el servidor.
 *
 * 0.0.0.0 permite que Render y otros dispositivos
 * puedan conectarse correctamente al servidor.
 */
app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `API de Vibra la vida corriendo en el puerto ${PORT}`
  );

  console.log(
    `Servidor iniciado correctamente`
  );
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { init } = require('./db');

for (const k of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`Falta la variable de entorno ${k}`);
    process.exit(1);
  }
}

const app = express();
app.use(cors({
  origin: 'https://horarios-sos.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ servicio: 'horarios-sos-api', estado: 'ok' }));

app.use('/api', require('./routes/usuarios'));
app.use('/api/clases', require('./routes/clases'));
app.use('/api/horarios', require('./routes/horarios'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
init()
  .then(() => app.listen(PORT, () => console.log(`API escuchando en el puerto ${PORT}`)))
  .catch((e) => { console.error('No se pudo inicializar la base de datos:', e.message); process.exit(1); });

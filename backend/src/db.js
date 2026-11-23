const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
// La URL externa de Render (*.render.com) exige SSL; la interna no.
const usaSsl = (url && /\.render\.com/.test(url)) || process.env.PGSSL === 'true';

const pool = new Pool({
  connectionString: url,
  ssl: usaSsl ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      correo        TEXT PRIMARY KEY,
      nombre        TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      carrera       TEXT NOT NULL,
      codigo        TEXT NOT NULL,
      semestre      TEXT NOT NULL,
      creado        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS clases (
      id             TEXT NOT NULL,
      usuario_correo TEXT NOT NULL REFERENCES usuarios(correo)
                       ON UPDATE CASCADE ON DELETE CASCADE,
      nombre         TEXT NOT NULL,
      sede           TEXT NOT NULL,
      dia            TEXT NOT NULL,
      inicio         TEXT NOT NULL,
      fin            TEXT NOT NULL,
      color          TEXT,
      PRIMARY KEY (usuario_correo, id)
    );

    CREATE TABLE IF NOT EXISTS horarios (
      id             TEXT NOT NULL,
      usuario_correo TEXT NOT NULL REFERENCES usuarios(correo)
                       ON UPDATE CASCADE ON DELETE CASCADE,
      nombre         TEXT NOT NULL,
      clases         JSONB NOT NULL DEFAULT '[]',
      PRIMARY KEY (usuario_correo, id)
    );
  `);
}

module.exports = { pool, init };

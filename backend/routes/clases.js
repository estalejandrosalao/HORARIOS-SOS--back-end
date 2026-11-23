const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { requiereAuth } = require('../auth');
const { validarClase, haySolape } = require('../validators');

const router = express.Router();
router.use(requiereAuth);

const hacerAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fila = (r) => ({ id: r.id, nombre: r.nombre, sede: r.sede, dia: r.dia, inicio: r.inicio, fin: r.fin, color: r.color });

router.get('/', hacerAsync(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM clases WHERE usuario_correo=$1 ORDER BY dia, inicio', [req.usuario.correo]
  );
  res.json(rows.map(fila));
}));

router.post('/', hacerAsync(async (req, res) => {
  const { error, clase } = validarClase(req.body);
  if (error) return res.status(400).json({ error });
  clase.id = clase.id || crypto.randomUUID();

  const { rows: delDia } = await pool.query(
    'SELECT * FROM clases WHERE usuario_correo=$1 AND dia=$2', [req.usuario.correo, clase.dia]
  );
  const choque = delDia.find((o) => o.id !== clase.id && haySolape(clase, o));
  if (choque) {
    return res.status(409).json({
      error: `Cruce de horario con "${choque.nombre}" (${choque.dia} ${choque.inicio}-${choque.fin})`,
    });
  }
  try {
    await pool.query(
      `INSERT INTO clases (id, usuario_correo, nombre, sede, dia, inicio, fin, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [clase.id, req.usuario.correo, clase.nombre, clase.sede, clase.dia, clase.inicio, clase.fin, clase.color]
    );
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe una clase con ese id' });
    throw e;
  }
  res.status(201).json(clase);
}));

router.delete('/:id', hacerAsync(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM clases WHERE id=$1 AND usuario_correo=$2', [req.params.id, req.usuario.correo]
  );
  if (!rowCount) return res.status(404).json({ error: 'Clase no encontrada' });
  res.json({ mensaje: 'Clase eliminada' });
}));

module.exports = router;

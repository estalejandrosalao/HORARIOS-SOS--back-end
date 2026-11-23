const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { requiereAuth } = require('../auth');
const { esTextoNoVacio, validarClase, haySolape } = require('../validators');

const router = express.Router();
router.use(requiereAuth);

const hacerAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fila = (r) => ({ id: r.id, nombre: r.nombre, clases: r.clases });

router.get('/', hacerAsync(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM horarios WHERE usuario_correo=$1 ORDER BY nombre', [req.usuario.correo]
  );
  res.json(rows.map(fila));
}));

router.post('/', hacerAsync(async (req, res) => {
  const { id, nombre, clases } = req.body || {};
  if (!esTextoNoVacio(nombre)) return res.status(400).json({ error: 'El nombre del horario es obligatorio' });
  if (!Array.isArray(clases)) return res.status(400).json({ error: '"clases" debe ser una lista' });

  const limpias = [];
  for (const c of clases) {
    const { error, clase } = validarClase(c);
    if (error) return res.status(400).json({ error: `Clase inválida en el horario: ${error}` });
    clase.id = clase.id || crypto.randomUUID();
    limpias.push(clase);
  }
  for (let i = 0; i < limpias.length; i++) {
    for (let j = i + 1; j < limpias.length; j++) {
      if (haySolape(limpias[i], limpias[j])) {
        return res.status(409).json({
          error: `Cruce de horario entre "${limpias[i].nombre}" y "${limpias[j].nombre}" (${limpias[i].dia})`,
        });
      }
    }
  }

  const horario = { id: id ? String(id) : crypto.randomUUID(), nombre: nombre.trim(), clases: limpias };
  try {
    await pool.query(
      'INSERT INTO horarios (id, usuario_correo, nombre, clases) VALUES ($1,$2,$3,$4::jsonb)',
      [horario.id, req.usuario.correo, horario.nombre, JSON.stringify(horario.clases)]
    );
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un horario con ese id' });
    throw e;
  }
  res.status(201).json(horario);
}));

router.delete('/:id', hacerAsync(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM horarios WHERE id=$1 AND usuario_correo=$2', [req.params.id, req.usuario.correo]
  );
  if (!rowCount) return res.status(404).json({ error: 'Horario no encontrado' });
  res.json({ mensaje: 'Horario eliminado' });
}));

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { firmarToken, requiereAuth } = require('../auth');
const {
  esTextoNoVacio, normalizarCorreo, correoValido, passwordValida, DOMINIO,
} = require('../validators');

const router = express.Router();

const publico = (u) => ({
  nombre: u.nombre, correo: u.correo, carrera: u.carrera, codigo: u.codigo, semestre: u.semestre,
});

const hacerAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Registro
router.post('/usuarios', hacerAsync(async (req, res) => {
  const { nombre, correo, password, carrera, codigo, semestre } = req.body || {};
  if (!esTextoNoVacio(nombre)) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!correoValido(correo)) return res.status(400).json({ error: `El correo debe terminar en ${DOMINIO}` });
  if (!passwordValida(password)) return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  if (!esTextoNoVacio(carrera)) return res.status(400).json({ error: 'La carrera es obligatoria' });
  if (!esTextoNoVacio(String(codigo ?? ''))) return res.status(400).json({ error: 'El código es obligatorio' });
  if (!esTextoNoVacio(String(semestre ?? ''))) return res.status(400).json({ error: 'El semestre es obligatorio' });

  const email = normalizarCorreo(correo);
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (correo, nombre, password_hash, carrera, codigo, semestre)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [email, nombre.trim(), hash, carrera.trim(), String(codigo).trim(), String(semestre).trim()]
    );
    res.status(201).json({ usuario: publico(rows[0]), token: firmarToken(email) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    throw e;
  }
}));

// Login
router.post('/login', hacerAsync(async (req, res) => {
  const { correo, password } = req.body || {};
  if (!correoValido(correo) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Correo o contraseña inválidos' });
  }
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE correo=$1', [normalizarCorreo(correo)]);
  const u = rows[0];
  const ok = u && (await bcrypt.compare(password, u.password_hash));
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  res.json({ token: firmarToken(u.correo), usuario: publico(u) });
}));

// Solo el dueño de la cuenta puede modificarla.
function soloDueno(req, res, next) {
  const correoUrl = normalizarCorreo(decodeURIComponent(req.params.correo));
  if (correoUrl !== req.usuario.correo) {
    return res.status(403).json({ error: 'No puedes modificar a otro usuario' });
  }
  req.correoActual = correoUrl;
  next();
}

// Editar perfil
router.put('/usuarios/:correo', requiereAuth, soloDueno, hacerAsync(async (req, res) => {
  const { nombre, codigo, correo, carrera, semestre } = req.body || {};
  if (!esTextoNoVacio(nombre)) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!correoValido(correo)) return res.status(400).json({ error: `El correo debe terminar en ${DOMINIO}` });
  if (!esTextoNoVacio(carrera)) return res.status(400).json({ error: 'La carrera es obligatoria' });
  if (!esTextoNoVacio(String(codigo ?? ''))) return res.status(400).json({ error: 'El código es obligatorio' });
  if (!esTextoNoVacio(String(semestre ?? ''))) return res.status(400).json({ error: 'El semestre es obligatorio' });

  const nuevo = normalizarCorreo(correo);
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre=$1, codigo=$2, correo=$3, carrera=$4, semestre=$5
       WHERE correo=$6 RETURNING *`,
      [nombre.trim(), String(codigo).trim(), nuevo, carrera.trim(), String(semestre).trim(), req.correoActual]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Si cambió el correo, el token anterior ya no sirve: se entrega uno nuevo.
    res.json({ usuario: publico(rows[0]), token: firmarToken(rows[0].correo) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    throw e;
  }
}));

// Cambiar contraseña
router.put('/usuarios/:correo/password', requiereAuth, soloDueno, hacerAsync(async (req, res) => {
  const { correo, nuevaPassword, confirmarPassword } = req.body || {};
  if (correo !== undefined && normalizarCorreo(correo) !== req.correoActual) {
    return res.status(400).json({ error: 'El correo no coincide con el de la ruta' });
  }
  if (!passwordValida(nuevaPassword)) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  }
  if (nuevaPassword !== confirmarPassword) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }
  const hash = await bcrypt.hash(nuevaPassword, 10);
  const { rowCount } = await pool.query('UPDATE usuarios SET password_hash=$1 WHERE correo=$2', [hash, req.correoActual]);
  if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ mensaje: 'Contraseña actualizada' });
}));

module.exports = router;

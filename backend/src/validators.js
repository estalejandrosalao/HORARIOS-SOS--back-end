const SEDES = ['Calle 100', 'Campus Cajicá', 'Sede Medicina'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DOMINIO = '@unimilitar.edu.co';

const norm = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const SEDES_MAP = Object.fromEntries(SEDES.map((s) => [norm(s), s]));
const DIAS_MAP = Object.fromEntries(DIAS.map((d) => [norm(d), d]));

const esTextoNoVacio = (v) => typeof v === 'string' && v.trim().length > 0;

function normalizarCorreo(correo) {
  return typeof correo === 'string' ? correo.trim().toLowerCase() : '';
}

function correoValido(correo) {
  const c = normalizarCorreo(correo);
  return c.length > DOMINIO.length && c.endsWith(DOMINIO) && !/\s/.test(c) &&
    /^[^@]+@unimilitar\.edu\.co$/.test(c);
}

function passwordValida(p) {
  return typeof p === 'string' && p.length >= 8;
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const horaValida = (h) => typeof h === 'string' && HORA_RE.test(h) && h >= '07:00' && h <= '23:00';

// Devuelve { error } o { clase } con los valores normalizados.
function validarClase(c) {
  if (!c || typeof c !== 'object') return { error: 'La clase es inválida' };
  if (!esTextoNoVacio(c.nombre)) return { error: 'El nombre de la clase es obligatorio' };

  const sede = SEDES_MAP[norm(c.sede ?? '')];
  if (!sede) return { error: `Sede inválida. Opciones: ${SEDES.join(', ')}` };

  const dia = DIAS_MAP[norm(c.dia ?? '')];
  if (!dia) return { error: `Día inválido. Opciones: ${DIAS.join(', ')}` };

  if (!horaValida(c.inicio)) return { error: 'La hora de inicio debe estar entre 07:00 y 23:00 (formato HH:MM)' };
  if (!horaValida(c.fin)) return { error: 'La hora de fin debe estar entre 07:00 y 23:00 (formato HH:MM)' };
  if (c.fin <= c.inicio) return { error: 'La hora de fin debe ser mayor que la de inicio' };

  const clase = {
    nombre: c.nombre.trim(),
    sede,
    dia,
    inicio: c.inicio,
    fin: c.fin,
    color: typeof c.color === 'string' ? c.color : null,
  };
  if (c.id !== undefined && c.id !== null && String(c.id).trim() !== '') clase.id = String(c.id);
  return { clase };
}

// Dos clases chocan si son el mismo día y sus horas se solapan.
const haySolape = (a, b) => a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin;

module.exports = {
  SEDES, DIAS, DOMINIO,
  esTextoNoVacio, normalizarCorreo, correoValido, passwordValida,
  horaValida, validarClase, haySolape,
};

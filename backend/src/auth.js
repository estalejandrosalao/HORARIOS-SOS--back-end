const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET;

function firmarToken(correo) {
  return jwt.sign({ correo }, SECRET(), { expiresIn: '7d' });
}

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token (Authorization: Bearer <token>)' });
  }
  try {
    const payload = jwt.verify(token, SECRET());
    req.usuario = { correo: payload.correo };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

module.exports = { firmarToken, requiereAuth };

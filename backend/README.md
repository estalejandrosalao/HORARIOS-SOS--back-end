# Horarios SOS – API

API en Node.js + Express + PostgreSQL. Las tablas se crean solas al arrancar.

## Correr en local
```bash
cd backend
npm install
cp .env.example .env     # edita DATABASE_URL y JWT_SECRET
npm start                # http://localhost:3000
```
Necesitas una base PostgreSQL (local o la de Render con su *External Database URL*).

## Variables de entorno
| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL |
| `PORT` | Puerto (Render lo asigna solo) |
| `JWT_SECRET` | Secreto para firmar los tokens |

## Endpoints
Rutas protegidas: enviar `Authorization: Bearer <token>`.

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/usuarios` | no |
| POST | `/api/login` | no |
| PUT | `/api/usuarios/:correo` | sí (solo el dueño) |
| PUT | `/api/usuarios/:correo/password` | sí (solo el dueño) |
| GET / POST | `/api/clases` | sí |
| DELETE | `/api/clases/:id` | sí |
| GET / POST | `/api/horarios` | sí |
| DELETE | `/api/horarios/:id` | sí |

CORS permitido solo para `https://horarios-sos.onrender.com`.

## Despliegue en Render
Web Service con Root Directory `backend`, build `npm install`, start `npm start`.

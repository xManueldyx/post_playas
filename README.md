# PlayasOnTech - Automatizacion de Redes Sociales

Plataforma para automatizar publicaciones en Facebook, Instagram, X (Twitter) y LinkedIn.

## Levantar el proyecto

### Requisitos
- Docker Desktop
- Git

### Inicio rapido

```bash
# Clonar el repositorio
git clone https://github.com/xManueldyx/post_playas.git
cd post_playas

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales de Meta, X y LinkedIn

# Levantar todo
docker compose up --build -d
```

La app estara disponible en:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000

### Servicios Docker
| Servicio  | Puerto | Descripcion          |
|-----------|--------|----------------------|
| frontend  | 3000   | Next.js + React      |
| backend   | 4000   | Express + Node.js    |
| db        | 5432   | PostgreSQL + pg-boss |

### Redes sociales configuradas

| Plataforma | Estado | Requisitos                                    |
|------------|--------|-----------------------------------------------|
| Facebook   | OK     | Pagina de Facebook + App en Meta Developers   |
| Instagram  | OK     | Cuenta Business vinculada a la pagina         |
| X/Twitter  | OK     | App en X Developer, requiere ngrok para HTTPS |
| LinkedIn   | OK | App en LinkedIn Developers, requiere ngrok |

### Túnel HTTPS (para X y LinkedIn)

X y LinkedIn requieren redirect URI con HTTPS. Usa ngrok:

```bash
ngrok http 4000
```

Luego actualiza `X_REDIRECT_URI` y `LINKEDIN_REDIRECT_URI` en `backend/.env` con la URL de ngrok.

### Estructura

```
post_playas/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── routes/       # Endpoints REST
│   │   ├── services/     # Logica de negocio y adaptadores
│   │   │   └── adapters/ # Facebook, Instagram, X, LinkedIn
│   │   ├── middleware/    # Auth, errores
│   │   ├── queue/        # pg-boss (cola sobre PostgreSQL)
│   │   ├── jobs/         # Scheduler de posts vencidos
│   │   └── lib/          # Prisma, logger, JWT
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/        # Login, Dashboard
│   │   ├── lib/          # API client, auth
│   │   └── store/        # Zustand
│   └── next.config.js    # Proxy /api -> backend
└── docker-compose.yml
```

### Endpoints principales

| Metodo | Ruta                       | Descripcion                     |
|--------|----------------------------|---------------------------------|
| POST   | /api/auth/register         | Registro                        |
| POST   | /api/auth/login            | Login                           |
| GET    | /api/auth/authorize/:prov  | Iniciar OAuth (X/FACEBOOK/LINKEDIN) |
| GET    | /api/auth/callback/:prov   | Callback OAuth                  |
| GET    | /api/socials               | Listar cuentas conectadas       |
| DELETE | /api/socials/:id           | Desconectar cuenta              |
| POST   | /api/posts                 | Crear post (admite programacion)|
| GET    | /api/posts                 | Listar posts                    |
| PUT    | /api/posts/:id             | Editar post                     |
| DELETE | /api/posts/:id             | Eliminar post                   |
| POST   | /api/posts/:id/publish     | Publicar ahora                  |
| POST   | /api/uploads               | Subir imagen/video              |

### Funcionalidades

- **Programacion de posts**: define fecha/hora futura. Si pones una fecha pasada, se publica de inmediato.
- **Scheduler**: monitorea cada 30s posts `SCHEDULED` vencidos y posts `PUBLISHING` huerfanos, re-despachandolos automaticamente.
- **Comentarios en Instagram**: el campo "Comentario para Instagram" publica un comentario real en el post via `POST /{media-id}/comments` de la Graph API.
- **Timeouts**: todas las llamadas `fetch` a APIs externas tienen timeout de 30s para evitar cuelgues.

### Variables de entorno (.env)

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/post_playas
JWT_SECRET=...
JWT_REFRESH_SECRET=...
PORT=4000
CORS_ORIGIN=http://localhost:3000
OAUTH_TOKEN_ENCRYPTION_KEY=clave-segura-de-32-caracteres-minimo

# Meta (Facebook + Instagram)
META_CLIENT_ID=...
META_CLIENT_SECRET=...
META_REDIRECT_URI=http://localhost:4000/api/auth/callback/FACEBOOK
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
INSTAGRAM_REDIRECT_URI=http://localhost:4000/api/auth/callback/INSTAGRAM
FACEBOOK_PAGE_ID=...

# X/Twitter
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=https://xxx.ngrok-free.app/api/auth/callback/X

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=https://xxx.ngrok-free.app/api/auth/callback/LINKEDIN

NODE_ENV=development
```

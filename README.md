# Social SaaS Automations

Plataforma profesional para automatizar publicaciones en redes sociales sin depender de herramientas externas como Zapier, Buffer o Hootsuite.

## Arquitectura general

- Frontend: Next.js + React + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- Base de datos: PostgreSQL administrada con Prisma ORM
- Infraestructura: Docker + Docker Compose
- Autenticación: JWT con roles y validación de sesión
- Integración social: OAuth 2.0 con Meta Graph API, X API y LinkedIn API
- Scheduler: cron jobs + sistema de colas para manejar publicaciones en lote
- Logs y monitoreo: logger estructurado + middleware de errores

## Estructura de carpetas

```
post_playas/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── posts.ts
│   │   │   ├── socials.ts
│   │   │   ├── users.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   ├── jobs/
│   │   │   ├── scheduler.ts
│   │   │   ├── publishJob.ts
   │   │   ├── retryPolicy.ts
│   │   ├── queue/
│   │   │   ├── queue.ts
│   │   │   ├── worker.ts
│   │   ├── services/
│   │   │   ├── oauthService.ts
│   │   │   ├── socialService.ts
│   │   │   ├── postService.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── logger.ts
│   │   │   ├── jwt.ts
│   │   │   ├── validation.ts
│   │   └── types/
│   │       └── index.ts
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx
│   │   │   ├── login.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── posts.tsx
│   │   │   ├── accounts.tsx
│   │   │   ├── analytics.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   ├── PostPreview.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── queryClient.ts
│   │   ├── store/
│   │   │   └── useAuthStore.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   └── .env.local.example
└── docker-compose.yml
```

## Modelo entidad-relación de la base de datos

- `User` (id, email, passwordHash, role, createdAt, updatedAt)
- `SocialAccount` (id, provider, providerAccountId, accessToken, refreshToken, expiresAt, status, userId)
- `Post` (id, title, content, imageUrl, status, scheduledAt, publishedAt, userId)
- `PostDestination` (id, postId, socialAccountId, provider, status, externalId, errorMessage)
- `AuditLog` (id, userId, action, resource, metadata, createdAt)
- `RateLimit` (id, userId, windowStart, requests)

## Endpoint REST clave

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/socials/oauth/url?provider=x`
- `GET /api/socials/oauth/callback?provider=x`
- `GET /api/socials`
- `DELETE /api/socials/:id`
- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/:id`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/publish`
- `GET /api/analytics/overview`

## Flujo OAuth completo

1. Usuario solicita conexión con red social.
2. Backend genera URL de autorización con `state` seguro.
3. Usuario autoriza en la red social.
4. Red social redirige a `/api/socials/oauth/callback` con `code` y `state`.
5. Backend intercambia `code` por Access Token y Refresh Token.
6. Backend guarda tokens encriptados en `SocialAccount`.
7. Scheduler y workers usan tokens para publicar.
8. Cuando Access Token expira, backend renueva con refresh token.

## Scheduler y workers

- `cron` de backend consulta posts `Scheduled`.
- Publicaciones listadas pasan a cola de jobs.
- Worker procesa cada `PostDestination` por plataforma.
- Si falla, el job reintenta con backoff.
- Estados transitivos: `Draft -> Scheduled -> Publishing -> Published/Failed`.

## Seguridad y buenas prácticas

- JWT con `accessToken` de corto plazo y `refreshToken` seguro.
- Protección XSS/CSRF en frontend y backend.
- Rate limiting por usuario y endpoint.
- Sanitización de contenidos y validación estricta por plataforma.
- Manejo seguro de tokens OAuth en base de datos.
- Middleware de autorización por roles.
- Logger estructurado y auditoría de cambios.
- Validación de tamaño y formato de archivos de imagen.
- Encriptación de valores sensibles en reposo.

## Variables de entorno necesarias

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`
- `CORS_ORIGIN`
- `REDIS_URL`
- `META_CLIENT_ID`
- `META_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `STORAGE_PROVIDER`
- `AWS_S3_BUCKET` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (opcional)
- `NODE_ENV`

## Siguientes pasos

1. Implementar la base de datos con Prisma y migraciones.
2. Conectar el backend con OAuth de cada red social.
3. Desarrollar el scheduler y el worker.
4. Crear el dashboard de gestión de posts y cuentas sociales.
5. Desplegar con Docker Compose en un entorno staging.

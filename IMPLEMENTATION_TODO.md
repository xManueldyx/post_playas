IMPLEMENTATION TODO - PlayasOnTech
=================================

Objetivo: implementar la plataforma completa de automatización de redes sociales (producción/SaaS) conforme al alcance acordado.

Instrucciones: este archivo contiene todas las tareas faltantes. Marca cada ítem como completado cuando lo termines y añade notas y enlaces a archivos modificados. El agente (yo) actualizará este archivo y el seguimiento automáticamente.

Prioridad alta (MVP mínimo):
- [ ] Diseño de arquitectura y ER: definir módulos, responsabilidades y diagrama ER.
- [x] Modelos Prisma / migraciones: tablas `User`, `SocialAccount`, `Post`, `PostDestination`, `AuditLog`, `OAuthToken` (si se separa), etc.
- [x] Autenticación JWT: registro, login, refresh token, middleware `authenticate`, roles (USER/ADMIN).
- [ ] OAuth 2.0 completo (flow servidor): X, Meta (Instagram/FB), LinkedIn — endpoints de autorización y callback seguros.
- [x] Almacenamiento seguro de tokens OAuth: encriptación y refresco automático (refresh tokens), expiración, revocación.
- [x] Implementar adaptadores de publicación (interfaces): `publishToX`, `publishToMeta`, `publishToLinkedIn`.
- [x] Cola de trabajos y workers: publicar en background, retries exponencial, manejo de errores.
- [x] Scheduler cron: detectar posts `SCHEDULED` y encolarlos para publicación.
- [x] API REST profesional: endpoints para conectar cuentas, crear posts, listar posts, publicar, historial, eliminar cuentas.
- [x] Upload de imágenes: presigned URL o upload local + validación de formatos por plataforma.
- [x] Frontend flows: OAuth connect, dashboard (crear post, seleccionar cuentas, visualizar historial y estados), calendario, vista previa.

Prioridad media (extras para producción):
- [ ] Rate limiting y protección contra abuso.
- [ ] Seguridad: helmet, CORS, validación input con Zod, protección CSRF si aplica, escaneo de secretos.
- [ ] Logs estructurados y monitoreo (winston -> elastic/Logflare/OTel) y métricas básicas.
- [ ] Tests unitarios e integración (Jest / supertest) + E2E básico (Playwright).
- [ ] Pipeline CI/CD (build, lint, test, deploy to registry).
- [ ] Documentación de API (OpenAPI / Swagger) y guías de despliegue.

Prioridad baja (mejoras y escalado):
- [ ] Multi-tenant y facturación (si aplicará SaaS en varios clientes).
- [ ] Analytics y dashboards (conteos, CTR, errores por provider).
- [ ] Rate quotas por cliente y plan.

Estado actual:
- El backend ya tiene modelos Prisma completos y rutas `/api/auth`, `/api/socials`, `/api/posts`, `/api/uploads` funcionales.
- El frontend tiene login/register, dashboard, creación de posts, edición, filtros, conexión/desconexión de cuentas y un editor de plantillas.
- El problema de backend fallando por `multer` ya fue corregido y el servicio se reconstruyó.
- El backend ya incluye un scheduler que encola posts `SCHEDULED` en Redis y un worker que procesa jobs de publicación.
- Se ha extendido el flujo OAuth para obtener `providerAccountId` real cuando se usa un proveedor configurado.
- Se agregó soporte PKCE para X y LinkedIn en el flujo de autorización.
- Los adaptadores ahora reciben el `accessToken` y metadatos de la cuenta social para acercarse a un flujo de publicación real.
- Los adaptadores de X/Meta/LinkedIn intentan validar el token real antes de caer en un fallback simulado.

Siguientes prioridades inmediatas:
- Añadir adaptadores de publicación reales completos para X/Meta/LinkedIn.
- Completar el flow OAuth real con verificación de tokens y estados de error.
- Mejorar el estado de publicación parcial/errores y reintentos en destino.

Variables de entorno críticas (ejemplo en `.env`):
- `DATABASE_URL` - URL Postgres
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `REDIS_URL` - Redis para colas
- `X_CLIENT_ID`, `X_CLIENT_SECRET` - X API
- `META_CLIENT_ID`, `META_CLIENT_SECRET` - Facebook/Instagram
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` - LinkedIn
- `UPLOAD_PROVIDER` - `local` | `s3`
- `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (si S3)
- `NODE_ENV`, `PORT`, `CORS_ORIGIN`

Archivos y módulos recomendados (estructura):
- backend/
  - src/
    - app.ts, index.ts
    - routes/
      - auth.ts, socials.ts, posts.ts, oauth.ts
    - services/
      - authService.ts, oauthService.ts, postService.ts, adapterX.ts, adapterMeta.ts, adapterLinkedIn.ts
    - lib/
      - prisma.ts, logger.ts, queue.ts, storage.ts, jwt.ts
    - queue/
      - queue.ts, worker.ts
    - jobs/
      - scheduler.ts
    - middleware/
      - auth.ts, errorHandler.ts, rateLimit.ts
    - types/
      - custom.d.ts
    - utils/
      - validation.ts, http.ts
- frontend/
  - src/
    - pages/
      - api/ (si needed), login.tsx, register.tsx, dashboard.tsx, oauth-callback.tsx
    - components/
      - PostEditor, Calendar, AccountList, ConnectButton, Preview
    - lib/
      - api.ts, auth.ts, fileUpload.ts

Endpoints REST principales (MVP):
- POST `/api/auth/register` - registro
- POST `/api/auth/login` - login
- POST `/api/auth/refresh` - refrescar token
- GET `/api/socials` - listar cuentas del usuario
- POST `/api/socials/connect` - conectar cuenta (server-side OAuth callback handler creará la SocialAccount)
- DELETE `/api/socials/:id` - desconectar
- POST `/api/posts` - crear post (con destinos)
- GET `/api/posts` - listar posts
- POST `/api/posts/:id/publish` - enviar a publicar ahora (enqueue)
- POST `/api/uploads` - subir imagen / generar presigned URL

Notas de seguridad y diseño:
- Nunca expongas client secrets en frontend.
- Guarda tokens OAuth cifrados (por ejemplo usando libsodium o AES con key en secrets manager).
- Usa Redis para colas y lock expirations y para rate-limiting counters.
- Implementar circuit-breaker + backoff para llamadas externas.
- Competencias de compliance: respetar límites de APIs (rate limits) y políticas de contenido.

Plan de trabajo sugerido (sprints):
1. Sprint 1 (MVP básico, 1-2 semanas): auth JWT, DB models, posts API, simple UI para post y dashboard, queue+scheduler skeleton.
2. Sprint 2 (OAuth + tokens): implementar OAuth server flows para X y Meta (IG), almacén y refresco de tokens, adapters básicos (mock publish).
3. Sprint 3 (Integraciones reales): terminar adapters de publicación y pruebas en redes reales, manejar errores y reintentos.
4. Sprint 4 (Hardening): rate limiting, logging, tests, CI, deploy en Docker/Kubernetes.

Cuando empiece a trabajar en cada tarea, actualizaré este archivo marcando los ítems completados y añadiendo enlaces a los cambios (commits/archivos modificados).

-- Fin del listado inicial --

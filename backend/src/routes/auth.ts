import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  buildOAuthAuthorizeUrl,
  createEncryptedOAuthTokens,
  exchangeOAuthCode,
  getOAuthProviderConfig,
  generatePkceChallenge,
  generatePkceVerifier,
} from '../services/oauthService';

const authRouter = Router();

const createToken = (user: { id: string; role: string }) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET ?? 'secret', {
    expiresIn: '15m',
  });

const createRefreshToken = (user: { id: string; role: string }) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET ?? 'refresh-secret', {
    expiresIn: '7d',
  });

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    const token = createToken(user);
    const refreshToken = createRefreshToken(user);

    return res.status(201).json({ user: { id: user.id, email: user.email }, token, refreshToken });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = createToken(user);
    const refreshToken = createRefreshToken(user);
    return res.json({ user: { id: user.id, email: user.email, role: user.role }, token, refreshToken });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET ?? 'refresh-secret') as {
      sub: string;
      role: string;
    };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    return res.json({ token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

// In-memory store for OAuth state (in production, use Redis or database)
const authorizationCodes = new Map<
  string,
  { provider: string; userId: string; providerAccountId: string; expiresAt: number; codeVerifier?: string }
>();

// OAuth: Initiate authorization flow
authRouter.get('/authorize/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider?.toUpperCase();
    const tokenQuery = typeof req.query.token === 'string' ? req.query.token : undefined;

    // Get token from Authorization header or query param
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const actualToken = tokenQuery || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!actualToken) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    let userId: string;
    try {
      const payload = jwt.verify(actualToken, process.env.JWT_SECRET ?? 'secret') as {
        sub: string;
        role: string;
      };
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const validProviders = ['X', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const;
    if (!provider || !validProviders.includes(provider as typeof validProviders[number])) {
      return res.status(400).json({ error: 'Proveedor no soportado' });
    }
    const providerKey = provider as typeof validProviders[number];

    const state = randomBytes(16).toString('hex');
    let codeVerifier: string | undefined;
    const providerConfig = getOAuthProviderConfig(providerKey);

    if (providerConfig?.usePkce) {
      codeVerifier = generatePkceVerifier();
    }

    authorizationCodes.set(state, {
      provider: providerKey,
      userId,
      providerAccountId: `${providerKey}-user-${Date.now()}`,
      expiresAt: Date.now() + 10 * 60 * 1000,
      codeVerifier,
    });

    if (providerConfig) {
      const codeChallenge = providerConfig.usePkce && codeVerifier ? generatePkceChallenge(codeVerifier) : undefined;
      const redirectUrl = buildOAuthAuthorizeUrl(providerKey, state, codeChallenge);
      return res.redirect(redirectUrl);
    }

    const consentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${provider} Autorización</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); padding: 40px; max-width: 500px; width: 100%; }
          h1 { color: #333; margin-bottom: 12px; font-size: 28px; }
          .subtitle { color: #666; margin-bottom: 32px; font-size: 16px; }
          .provider-info { background: #f5f5f5; border-left: 4px solid #667eea; padding: 16px; border-radius: 8px; margin-bottom: 32px; }
          .provider-info strong { display: block; color: #333; margin-bottom: 4px; }
          .permissions { margin-bottom: 32px; }
          .permission-item { display: flex; align-items: center; padding: 12px 0; color: #555; }
          .permission-item::before { content: "✓"; color: #667eea; font-weight: bold; margin-right: 12px; font-size: 18px; }
          .button-group { display: flex; gap: 12px; }
          button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s; font-weight: 600; }
          .authorize { background: #667eea; color: white; flex: 1; }
          .authorize:hover { background: #5568d3; }
          .cancel { background: #e0e0e0; color: #333; flex: 1; }
          .cancel:hover { background: #d0d0d0; }
          .warning { color: #666; font-size: 12px; margin-top: 16px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Autorizar ${provider}</h1>
          <p class="subtitle">Post Playas quiere acceder a tu cuenta</p>
          
          <div class="provider-info">
            <strong>Plataforma:</strong> ${provider}
          </div>
          
          <div class="permissions">
            <h3 style="color: #333; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Permisos solicitados:</h3>
            <div class="permission-item">Publicar contenido</div>
            <div class="permission-item">Leer perfil</div>
            <div class="permission-item">Gestionar publicaciones programadas</div>
          </div>
          
          <div class="button-group">
            <form method="POST" action="/api/auth/callback" style="flex: 1;">
              <input type="hidden" name="state" value="${state}">
              <input type="hidden" name="token" value="${actualToken}">
              <button type="submit" class="authorize">Autorizar</button>
            </form>
            <button class="cancel" onclick="window.history.back()">Cancelar</button>
          </div>
          
          <p class="warning">
            Al autorizar, estás permitiendo que Post Playas acceda a tu cuenta ${provider}. 
            Puedes revocar el acceso en cualquier momento desde la configuración de tu cuenta.
          </p>
        </div>
      </body>
      </html>
    `;

    res.header('Content-Type', 'text/html; charset=utf-8');
    res.send(consentHtml);
  } catch (error) {
    next(error);
  }
});

// OAuth: Handle callback after user authorizes via provider redirect
authRouter.get('/callback/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider?.toUpperCase();
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;

    const validProviders = ['X', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const;
    if (!provider || !validProviders.includes(provider as typeof validProviders[number])) {
      return res.status(400).json({ error: 'Proveedor no soportado' });
    }
    const providerKey = provider as typeof validProviders[number];

    if (!state || !authorizationCodes.has(state)) {
      return res.status(400).json({ error: 'Estado de autorización inválido' });
    }

    const authData = authorizationCodes.get(state)!;
    if (authData.expiresAt < Date.now()) {
      authorizationCodes.delete(state);
      return res.status(400).json({ error: 'Autorización expirada' });
    }

    if (authData.provider !== providerKey) {
      return res.status(400).json({ error: 'Proveedor no coincide' });
    }

    const tokens = getOAuthProviderConfig(providerKey)
      ? await exchangeOAuthCode(providerKey, code ?? '', authData.codeVerifier)
      : createEncryptedOAuthTokens();
    const finalProviderAccountId = tokens.providerAccountId ?? authData.providerAccountId;

    const account = await prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: providerKey,
          providerAccountId: finalProviderAccountId,
        },
      },
      update: {
        status: 'connected',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        userId: authData.userId,
      },
      create: {
        provider: providerKey,
        providerAccountId: finalProviderAccountId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes: 'read,write',
        status: 'connected',
        userId: authData.userId,
      },
    });

    authorizationCodes.delete(state);
    res.redirect(`http://localhost:3000/dashboard?provider=${providerKey}&connected=true`);
  } catch (error) {
    next(error);
  }
});

// OAuth: Handle callback after user authorizes
authRouter.post('/callback', async (req, res, next) => {
  try {
    const { state, token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    let userId: string;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'secret') as {
        sub: string;
        role: string;
      };
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (!state || !authorizationCodes.has(state)) {
      return res.status(400).json({ error: 'Estado de autorización inválido' });
    }

    const authData = authorizationCodes.get(state)!;
    if (authData.expiresAt < Date.now()) {
      authorizationCodes.delete(state);
      return res.status(400).json({ error: 'Autorización expirada' });
    }

    if (authData.userId !== userId) {
      return res.status(403).json({ error: 'Usuario no coincide' });
    }

    const provider = authData.provider as any;
    const providerAccountId = authData.providerAccountId;

    // Create or update social account (simulated OAuth token)
    const tokens = createEncryptedOAuthTokens();

    const account = await prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        status: 'connected',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        userId,
      },
      create: {
        provider,
        providerAccountId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes: 'read,write',
        status: 'connected',
        userId,
      },
    });

    // Clean up authorization code
    authorizationCodes.delete(state);

    // Redirect back to dashboard with success message
    res.redirect(`http://localhost:3000/dashboard?provider=${provider}&connected=true`);
  } catch (error) {
    next(error);
  }
});

export { authRouter };

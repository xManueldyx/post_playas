import crypto from 'crypto';
import logger from '../lib/logger';

const algorithm = 'aes-256-gcm';
const key = crypto.createHash('sha256').update(process.env.OAUTH_TOKEN_ENCRYPTION_KEY ?? 'default-oauth-encryption-key-32-chars!').digest();

function toBase64(buffer: Buffer) {
  return buffer.toString('base64');
}

function fromBase64(value: string) {
  return Buffer.from(value, 'base64');
}

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePkceVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function generatePkceChallenge(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

async function exchangeFacebookLongLivedToken(config: { clientId: string; clientSecret: string }, shortLivedToken: string) {
  const url = `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(config.clientId)}&client_secret=${encodeURIComponent(config.clientSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`FB token exchange failed: ${response.status} ${err}`);
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in ?? 5184000),
  };
}

export function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${toBase64(iv)}:${toBase64(tag)}:${toBase64(encrypted)}`;
}

export function decryptToken(value: string) {
  const [iv64, tag64, encrypted64] = value.split(':');
  if (!iv64 || !tag64 || !encrypted64) {
    throw new Error('Formato de token cifrado inválido');
  }
  const iv = fromBase64(iv64);
  const tag = fromBase64(tag64);
  const encrypted = fromBase64(encrypted64);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function createEncryptedOAuthTokens(): OAuthTokenBundle {
  const accessToken = encryptToken(`oauth_${crypto.randomBytes(16).toString('hex')}`);
  const refreshToken = encryptToken(`refresh_${crypto.randomBytes(16).toString('hex')}`);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

async function fetchProviderAccountInfo(provider: ProviderKey, accessToken: string): Promise<OAuthAccountInfo> {
  let url = '';
  const headers: Record<string, string> = {};

  switch (provider) {
    case 'X':
      url = 'https://api.twitter.com/2/users/me';
      headers.Authorization = `Bearer ${accessToken}`;
      break;
    case 'INSTAGRAM':
      url = `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`;
      break;
    case 'FACEBOOK':
      url = `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
      break;
    case 'LINKEDIN':
      url = 'https://api.linkedin.com/v2/me';
      headers.Authorization = `Bearer ${accessToken}`;
      break;
    default:
      throw new Error('Proveedor OAuth no soportado para fetchProviderAccountInfo');
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error obteniendo perfil de proveedor OAuth: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const providerAccountId = data.id || data.sub;
  const username = data.username || (data.name ? data.name.split(' ')[0] : undefined);
  const displayName = data.name || (data.localizedFirstName ? `${data.localizedFirstName} ${data.localizedLastName}` : undefined);

  return {
    providerAccountId,
    username,
    displayName,
  };
}

type ProviderKey = 'X' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN';

interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string;
  usePkce?: boolean;
}

export interface OAuthTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  providerAccountId?: string;
}

export interface OAuthAccountInfo {
  providerAccountId: string;
  username?: string;
  displayName?: string;
}

const providerConfigs: Record<ProviderKey, OAuthProviderConfig | null> = {
  X:
    process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_REDIRECT_URI
      ? {
          clientId: process.env.X_CLIENT_ID,
          clientSecret: process.env.X_CLIENT_SECRET,
          authUrl: 'https://twitter.com/i/oauth2/authorize',
          tokenUrl: 'https://api.twitter.com/2/oauth2/token',
          redirectUri: process.env.X_REDIRECT_URI,
          scopes: 'tweet.read tweet.write users.read offline.access',
          usePkce: true,
        }
      : null,
  INSTAGRAM:
    process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && process.env.INSTAGRAM_REDIRECT_URI
      ? {
          clientId: process.env.INSTAGRAM_CLIENT_ID,
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
          authUrl: 'https://api.instagram.com/oauth/authorize',
          tokenUrl: 'https://api.instagram.com/oauth/access_token',
          redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
          scopes: 'user_profile,user_media',
        }
      : null,
  FACEBOOK:
    process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET && process.env.META_REDIRECT_URI
      ? {
          clientId: process.env.META_CLIENT_ID,
          clientSecret: process.env.META_CLIENT_SECRET,
          authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
          tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
          redirectUri: process.env.META_REDIRECT_URI,
          scopes: 'pages_show_list,instagram_basic,instagram_content_publish,pages_manage_posts',
        }
      : null,
  LINKEDIN:
    process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_REDIRECT_URI
      ? {
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
          authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
          tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
          redirectUri: process.env.LINKEDIN_REDIRECT_URI,
          scopes: 'r_liteprofile r_emailaddress w_member_social',
          usePkce: true,
        }
      : null,
};

export function getOAuthProviderConfig(provider: ProviderKey) {
  return providerConfigs[provider] ?? null;
}

export function buildOAuthAuthorizeUrl(provider: ProviderKey, state: string, codeChallenge?: string) {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error('Proveedor OAuth no configurado');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state,
  });

  if (provider === 'FACEBOOK') {
    params.set('auth_type', 'rerequest');
  }

  if (config.usePkce && codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(provider: ProviderKey, code: string, codeVerifier?: string): Promise<OAuthTokenBundle> {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error('Proveedor OAuth no configurado');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  if (config.usePkce && codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error intercambiando el código OAuth: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  let rawAccessToken = data.access_token ?? data.accessToken;
  let expiresIn = Number(data.expires_in ?? data.expiresIn ?? 3600);

  if (provider === 'FACEBOOK') {
    try {
      const longLived = await exchangeFacebookLongLivedToken(config, rawAccessToken);
      rawAccessToken = longLived.accessToken;
      expiresIn = longLived.expiresIn;
    } catch (err) {
      logger.warn('No se pudo intercambiar token de corta duracion de Facebook: %o', err);
    }
  }

  const accessToken = encryptToken(rawAccessToken);
  const refreshToken = data.refresh_token
    ? encryptToken(data.refresh_token)
    : encryptToken(`refresh_${crypto.randomBytes(16).toString('hex')}`);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  let providerAccountId: string | undefined;
  try {
    const accountInfo = await fetchProviderAccountInfo(provider, rawAccessToken);
    providerAccountId = accountInfo.providerAccountId;
  } catch {
    providerAccountId = undefined;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    providerAccountId,
  };
}

export async function refreshOAuthToken(provider: ProviderKey, encryptedRefreshToken: string): Promise<OAuthTokenBundle> {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error('Proveedor OAuth no configurado');
  }

  const refreshToken = decryptToken(encryptedRefreshToken);

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error refrescando token OAuth: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const rawAccessToken = data.access_token ?? data.accessToken;
  const accessToken = encryptToken(rawAccessToken);
  const refreshTokenResponse = data.refresh_token
    ? encryptToken(data.refresh_token)
    : encryptedRefreshToken;
  const expiresIn = Number(data.expires_in ?? data.expiresIn ?? 3600);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  let providerAccountId: string | undefined;
  try {
    const accountInfo = await fetchProviderAccountInfo(provider, rawAccessToken);
    providerAccountId = accountInfo.providerAccountId;
  } catch {
    providerAccountId = undefined;
  }

  return {
    accessToken,
    refreshToken: refreshTokenResponse,
    expiresAt,
    providerAccountId,
  };
}

import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_SECRET ?? 'secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'refresh-secret';

export function signAccessToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, accessSecret, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, refreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as { sub: string; role: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as { sub: string; role: string };
}

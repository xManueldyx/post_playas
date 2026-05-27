import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  // Debug: log when authorization header is missing to help diagnose browser 401s
  if (!authorization) {
    // eslint-disable-next-line no-console
    console.log('[auth] Missing Authorization header on', req.method, req.originalUrl, 'headers:', req.headers);
  }
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'secret') as {
      sub: string;
      role: string;
    };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

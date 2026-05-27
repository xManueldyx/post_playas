import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const status = (err as any).status || 500;
  const message = (err as any).message || 'Error interno del servidor';

  return res.status(status).json({
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

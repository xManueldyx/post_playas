import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { encryptToken } from '../services/oauthService';

const socialRouter = Router();

socialRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id as string;
    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

socialRouter.post('/connect', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id as string;
    const { provider, providerAccountId } = req.body;

    if (!provider || !providerAccountId) {
      return res.status(400).json({ error: 'Provider y providerAccountId son requeridos' });
    }

    const validProviders = ['X', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Proveedor no soportado' });
    }

    const account = await prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        status: 'connected',
      },
      create: {
        provider,
        providerAccountId,
        accessToken: encryptToken('demo-token'),
        refreshToken: encryptToken('demo-refresh-token'),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        scopes: 'all',
        status: 'connected',
        userId,
      },
    });

    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
});

socialRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const accountId = req.params.id;
    const userId = req.user?.id as string;

    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    await prisma.postDestination.deleteMany({ where: { socialAccountId: accountId } });
    await prisma.socialAccount.delete({ where: { id: accountId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { socialRouter };

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { publishQueue } from '../queue/queue';

const postRouter = Router();

postRouter.use(authenticate);

postRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { title, content, imageUrl, mediaUrl, scheduledAt, destinations } = req.body;
    const userId = req.user?.id as string;
    const finalMediaUrl = mediaUrl || imageUrl || null;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        imageUrl: finalMediaUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        userId,
        destinations: {
          create: destinations.map((destination: any) => ({
            provider: destination.provider,
            status: 'PENDING',
            socialAccountId: destination.socialAccountId,
          })),
        },
      },
      include: { destinations: true },
    });
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

postRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id as string;
    const { status, fromDate, toDate } = req.query;

    const where: any = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (fromDate && typeof fromDate === 'string') {
      where.scheduledAt = { ...(where.scheduledAt ?? {}), gte: new Date(fromDate) };
    }
    if (toDate && typeof toDate === 'string') {
      where.scheduledAt = { ...(where.scheduledAt ?? {}), lte: new Date(toDate) };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: { destinations: true },
    });
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

postRouter.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id as string;
    const { title, content, imageUrl, mediaUrl, scheduledAt } = req.body;
    const finalMediaUrl = mediaUrl || imageUrl || null;

    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, status: true },
    });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    const updateData: any = {
      title,
      content,
      imageUrl: finalMediaUrl,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    };

    if (existing.status === 'DRAFT' || existing.status === 'SCHEDULED') {
      updateData.status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: { destinations: true },
    });

    res.json({ post });
  } catch (error) {
    next(error);
  }
});

postRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id as string;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (!post || post.userId !== userId) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    await prisma.postDestination.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

postRouter.post('/:id/publish', async (req: AuthRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id as string;

    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, status: true },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    if (existing.status === 'PUBLISHED') {
      return res.status(400).json({ error: 'El post ya fue publicado' });
    }

    if (existing.status === 'PUBLISHING') {
      return res.status(202).json({ message: 'El post ya está en cola para publicación' });
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    });

    await publishQueue.add({ postId }, { attempts: 3, backoff: { type: 'exponential', delay: 10000 } });

    res.status(202).json({ message: 'Post enviado al scheduler' });
  } catch (error) {
    next(error);
  }
});

export { postRouter };

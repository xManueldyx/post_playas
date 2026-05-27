import prisma from '../lib/prisma';
import logger from '../lib/logger';
import {
  createEncryptedOAuthTokens,
  decryptToken,
  getOAuthProviderConfig,
  refreshOAuthToken,
} from './oauthService';
import { publishToProvider } from './publishAdapters';

export async function processPublishJob(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { destinations: { include: { socialAccount: true } } },
  });

  if (!post) {
    throw new Error('Post no encontrado');
  }

  let allSent = true;

  for (const destination of post.destinations) {
    if (destination.status === 'SENT') {
      continue;
    }

    const socialAccount = destination.socialAccount;
    let decryptedToken = undefined;

    if (socialAccount?.accessToken) {
      try {
        decryptedToken = decryptToken(socialAccount.accessToken);
      } catch (error) {
        logger.error('No se pudo descifrar el token para socialAccount %s: %o', socialAccount.id, error);
      }
    }

    if (socialAccount?.expiresAt && socialAccount.expiresAt <= new Date()) {
      const providerConfig = getOAuthProviderConfig(destination.provider as any);
      if (providerConfig && socialAccount.refreshToken) {
        try {
          logger.info('Token expirado para socialAccount %s, refrescando token OAuth', socialAccount.id);
          const refreshed = await refreshOAuthToken(destination.provider as any, socialAccount.refreshToken);
          await prisma.socialAccount.update({
            where: { id: socialAccount.id },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              expiresAt: refreshed.expiresAt,
            },
          });
          decryptedToken = decryptToken(refreshed.accessToken);
        } catch (refreshError) {
          logger.warn('No se pudo refrescar token OAuth para socialAccount %s: %o', socialAccount.id, refreshError);
          const refreshed = createEncryptedOAuthTokens();
          await prisma.socialAccount.update({
            where: { id: socialAccount.id },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              expiresAt: refreshed.expiresAt,
            },
          });
          decryptedToken = decryptToken(refreshed.accessToken);
        }
      } else {
        logger.info('Token expirado para socialAccount %s, generando refresh simulado', socialAccount.id);
        const refreshed = createEncryptedOAuthTokens();
        await prisma.socialAccount.update({
          where: { id: socialAccount.id },
          data: {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
          },
        });
        decryptedToken = decryptToken(refreshed.accessToken);
      }
    }

    try {
      logger.info('Usando token %s para publicar en %s', decryptedToken ? '****' : 'sin-token', destination.provider);
      const result = await publishToProvider(
        destination.provider,
        {
          id: post.id,
          title: post.title,
          content: post.content,
          imageUrl: post.imageUrl,
        },
        {
          accessToken: decryptedToken,
          providerAccountId: socialAccount?.providerAccountId,
        },
      );

      await prisma.postDestination.update({
        where: { id: destination.id },
        data: {
          status: 'SENT',
          externalId: result.externalId,
          attemptedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      allSent = false;
      logger.error('Fallo en destino %s %o', destination.id, error);
      await prisma.postDestination.update({
        where: { id: destination.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          attemptedAt: new Date(),
        },
      });
    }
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: allSent ? 'PUBLISHED' : 'FAILED',
      publishedAt: allSent ? new Date() : null,
    },
  });

  if (!allSent) {
    throw new Error('Algunos destinos no pudieron publicarse');
  }

  return { success: true };
}

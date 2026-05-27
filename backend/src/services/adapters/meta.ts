import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';

export class MetaAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    logger.info(
      'Publicando en Meta el post %s con providerAccountId=%s accessToken=%s',
      post.id,
      context.providerAccountId ?? 'sin-cuenta',
      context.accessToken ? '****' : 'sin-token',
    );

    if (context.accessToken) {
      try {
        const graphUrl = `https://graph.facebook.com/me/feed`;
        const response = await fetch(graphUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: post.content || post.title,
            access_token: context.accessToken,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Meta API publish failed ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        return {
          externalId: data.id ?? `meta-${post.id}-${Date.now()}`,
        };
      } catch (error) {
        logger.warn('Fallo publicando en Meta con token real: %o', error);
      }
    }

    logger.info('Fallback simulado para Meta en post %s', post.id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      externalId: `meta-simulated-${post.id}-${Date.now()}`,
    };
  }
}

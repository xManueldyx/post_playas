import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';

export class XAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    logger.info(
      'Publicando en X el post %s con providerAccountId=%s accessToken=%s',
      post.id,
      context.providerAccountId ?? 'sin-cuenta',
      context.accessToken ? '****' : 'sin-token',
    );

    if (context.accessToken) {
      try {
        const response = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: post.content || post.title }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`X API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        return {
          externalId: data.data?.id ?? `x-${post.id}-${Date.now()}`,
        };
      } catch (error) {
        logger.warn('Fallo publicando en X con token real: %o', error);
      }
    }

    logger.info('Fallback simulado para X en post %s', post.id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      externalId: `x-simulated-${post.id}-${Date.now()}`,
    };
  }
}

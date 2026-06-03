import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';

export class XAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    logger.info('Publicando en X el post %s', post.id);

    if (!context.accessToken) {
      throw new Error('No access token available for X publishing');
    }

    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: post.content || post.title }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (errorBody.includes('CreditsDepleted')) {
        throw new Error('Alcanzaste el limite de posts de X. Espera al reset mensual de creditos.');
      }
      throw new Error('Error al publicar en X. Intenta de nuevo.');
    }

    const data = await response.json();
    return {
      externalId: data.data?.id ?? `x-${post.id}`,
    };
  }
}

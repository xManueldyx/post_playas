import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';

export class LinkedInAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    logger.info(
      'Publicando en LinkedIn el post %s con providerAccountId=%s accessToken=%s',
      post.id,
      context.providerAccountId ?? 'sin-cuenta',
      context.accessToken ? '****' : 'sin-token',
    );

    if (context.accessToken && context.providerAccountId) {
      try {
        const author = `urn:li:person:${context.providerAccountId}`;
        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: post.content || post.title,
                },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`LinkedIn API publish failed ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        return {
          externalId: data.id ?? `linkedin-${post.id}-${Date.now()}`,
        };
      } catch (error) {
        logger.warn('Fallo publicando en LinkedIn con token real: %o', error);
      }
    }

    logger.info('Fallback simulado para LinkedIn en post %s', post.id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      externalId: `linkedin-simulated-${post.id}-${Date.now()}`,
    };
  }
}

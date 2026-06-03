import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';

export class LinkedInAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    logger.info('Publicando en LinkedIn el post %s', post.id);

    if (!context.accessToken) {
      throw new Error('No access token available for LinkedIn publishing');
    }

    if (!context.providerAccountId) {
      throw new Error('No providerAccountId for LinkedIn');
    }

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
      if (errorBody.includes('ACCESS_DENIED') || errorBody.includes('SCOPE')) {
        throw new Error('LinkedIn no tiene permisos para publicar. Reconecta tu cuenta.');
      }
      throw new Error('Error al publicar en LinkedIn. Intenta de nuevo.');
    }

    const data = await response.json();
    return {
      externalId: data.id ?? `li-${post.id}`,
    };
  }
}

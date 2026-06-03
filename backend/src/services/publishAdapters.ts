import logger from '../lib/logger';
import { adapterForProvider } from './adapters';
import { PublishPayload, ProviderPublishContext } from './adapters/providerAdapter';

export async function publishToProvider(
  provider: string,
  post: PublishPayload,
  context: ProviderPublishContext,
) {
  const adapter = adapterForProvider(provider);
  logger.info('Enrutando publicación a %s para post %s', provider, post.id);
  return adapter.publish(post, { ...context, provider });
}

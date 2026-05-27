import { ProviderAdapter } from './providerAdapter';
import { XAdapter } from './x';
import { MetaAdapter } from './meta';
import { LinkedInAdapter } from './linkedin';

export function adapterForProvider(provider: string): ProviderAdapter {
  switch (provider) {
    case 'X':
      return new XAdapter();
    case 'INSTAGRAM':
    case 'FACEBOOK':
      return new MetaAdapter();
    case 'LINKEDIN':
      return new LinkedInAdapter();
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}

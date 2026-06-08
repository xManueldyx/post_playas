export interface PublishResult {
  externalId: string;
}

export interface PublishPayload {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  caption?: string;
}

export interface ProviderPublishContext {
  accessToken?: string;
  providerAccountId?: string;
  provider?: string;
}

export interface ProviderAdapter {
  publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult>;
}

export interface PublishResult {
  externalId: string;
}

export interface PublishPayload {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
}

export interface ProviderPublishContext {
  accessToken?: string;
  providerAccountId?: string;
}

export interface ProviderAdapter {
  publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult>;
}

import { ProviderAdapter, PublishResult, ProviderPublishContext, PublishPayload } from './providerAdapter';
import logger from '../../lib/logger';
import fs from 'fs';
import path from 'path';

const FETCH_TIMEOUT_MS = 30_000;

async function getPagesWithInstagram(userAccessToken: string) {
  const url = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const text = await res.text();
  logger.info('GET /me/accounts status=%d body=%s', res.status, text.slice(0, 500));
  if (res.ok) {
    const data = JSON.parse(text);
    const pages = (data.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      accessToken: p.access_token,
      instagramAccountId: p.instagram_business_account?.id || null,
    }));
    if (pages.length > 0) return pages;
  }
  return [];
}

async function getPageDirect(pageId: string, userAccessToken: string) {
  const url = `https://graph.facebook.com/v22.0/${pageId}?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const text = await res.text();
  logger.info('GET page %s status=%d body=%s', pageId, res.status, text.slice(0, 400));
  if (!res.ok) return null;
  const data = JSON.parse(text);
  return {
    id: data.id,
    name: data.name,
    accessToken: data.access_token,
    instagramAccountId: data.instagram_business_account?.id || null,
  };
}

async function publishToFacebookPage(pageId: string, pageAccessToken: string, message: string, imageUrl?: string | null) {
  const pageFeedUrl = `https://graph.facebook.com/v22.0/${pageId}/feed`;
  const pagePhotosUrl = `https://graph.facebook.com/v22.0/${pageId}/photos`;

  if (imageUrl) {
    const isLocalPath = imageUrl.startsWith('/uploads/');
    const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

    if (isLocalPath) {
      const filePath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append('source', blob, path.basename(imageUrl));
        formData.append('message', message);
        formData.append('access_token', pageAccessToken);

        const res = await fetch(pagePhotosUrl, { method: 'POST', body: formData, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        const body = await res.text();
        if (!res.ok) throw new Error(`FB photo upload failed: ${res.status} ${body}`);
        return JSON.parse(body);
      }
    }

    if (isHttpUrl) {
      const params = new URLSearchParams({ url: imageUrl, message, access_token: pageAccessToken });
      const res = await fetch(pagePhotosUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`FB photo post failed: ${res.status} ${body}`);
      return JSON.parse(body);
    }
  }

  const params = new URLSearchParams({ message, access_token: pageAccessToken });
  const res = await fetch(pageFeedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`FB page publish failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

async function publishToInstagram(igUserId: string, pageAccessToken: string, message: string, imageUrl?: string | null) {
  if (!imageUrl) {
    throw new Error('Instagram requires an image or video URL to publish');
  }

  let publicImageUrl = imageUrl;

  if (imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), imageUrl);
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('source', blob, path.basename(imageUrl));
      formData.append('published', 'false');
      formData.append('access_token', pageAccessToken);

      const photoRes = await fetch(`https://graph.facebook.com/v22.0/me/photos`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const photoBody = await photoRes.text();
      if (photoRes.ok) {
        const photoData = JSON.parse(photoBody);
        const photoId = photoData.id;
        const picRes = await fetch(`https://graph.facebook.com/v22.0/${photoId}?fields=images&access_token=${encodeURIComponent(pageAccessToken)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        const picData = await picRes.json();
        if (picData.images?.[0]?.source) {
          publicImageUrl = picData.images[0].source;
          logger.info('Imagen subida a FB, usando URL publica: %s', publicImageUrl.slice(0, 80));
        }
      } else {
        logger.warn('Fallo al subir foto temporal a FB: %s', photoBody);
        throw new Error('No se pudo obtener URL publica para Instagram. Usa una URL publica o un servicio de imagenes.');
      }
    }
  }

  const createUrl = `https://graph.facebook.com/v22.0/${igUserId}/media`;
  const createParams = new URLSearchParams({
    caption: message,
    image_url: publicImageUrl,
    access_token: pageAccessToken,
  });
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createParams.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`IG media creation failed: ${createRes.status} ${err}`);
  }
  const { id: creationId } = await createRes.json() as { id: string };

  for (let i = 0; i < 10; i++) {
    const statusUrl = `https://graph.facebook.com/v22.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(pageAccessToken)}`;
    const statusRes = await fetch(statusUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const statusData = await statusRes.json() as { status_code?: string };
    if (statusData.status_code === 'FINISHED') break;
    if (statusData.status_code === 'ERROR') {
      throw new Error('IG media processing failed with status ERROR');
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  const publishUrl = `https://graph.facebook.com/v22.0/${igUserId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: pageAccessToken,
  });
  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`IG media publish failed: ${publishRes.status} ${err}`);
  }
  return publishRes.json();
}

export class MetaAdapter implements ProviderAdapter {
  async publish(post: PublishPayload, context: ProviderPublishContext): Promise<PublishResult> {
    const provider = context.provider || 'FACEBOOK';
    const message = post.content || post.title;
    const imageUrl = post.imageUrl;

    logger.info('Publicando en %s el post %s', provider, post.id);

    if (!context.accessToken) {
      throw new Error('No access token available for Meta publishing');
    }

    const pages = await getPagesWithInstagram(context.accessToken);

    if (!pages.length && process.env.FACEBOOK_PAGE_ID) {
      const directPage = await getPageDirect(process.env.FACEBOOK_PAGE_ID, context.accessToken);
      if (directPage) {
        pages.push(directPage);
      }
    }

    if (!pages.length) {
      throw new Error('No Facebook Pages found. Crea una Pagina de Facebook en https://facebook.com/pages/create');
    }

    const page = pages[0];

    if (provider === 'INSTAGRAM') {
      if (!page.instagramAccountId) {
        throw new Error('No tienes una cuenta de Instagram Business vinculada a tu pagina de Facebook.');
      }
      if (!imageUrl) {
        throw new Error('Instagram requiere una imagen para publicar.');
      }
      const igResult = await publishToInstagram(page.instagramAccountId, page.accessToken, message, imageUrl);
      const mediaId = igResult.id;

      if (post.caption && mediaId) {
        logger.info('Publicando comentario en Instagram media %s', mediaId);
        const commentUrl = `https://graph.facebook.com/v22.0/${mediaId}/comments`;
        const commentParams = new URLSearchParams({
          message: post.caption,
          access_token: page.accessToken,
        });
        const commentRes = await fetch(commentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: commentParams.toString(),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!commentRes.ok) {
          const err = await commentRes.text();
          logger.warn('No se pudo publicar el comentario en Instagram: %s', err);
        }
      }

      return { externalId: mediaId || `ig-${post.id}` };
    }

    if (provider === 'FACEBOOK') {
      const fbResult = await publishToFacebookPage(page.id, page.accessToken, message, imageUrl);
      return { externalId: fbResult.post_id || fbResult.id || `fb-${post.id}` };
    }

    throw new Error(`Provider no soportado: ${provider}`);
  }
}

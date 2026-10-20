import type { IncomingMessage, ServerResponse } from 'node:http';

const allowedPageHosts = new Set(['photos.app.goo.gl', 'photos.google.com']);

function getStringQuery(request: IncomingMessage, key: string): string {
  const requestUrl = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`);
  return requestUrl.searchParams.get(key) || '';
}

async function getPublicGooglePage(url: URL): Promise<{ url: URL; html: string }> {
  let currentUrl = url;
  for (let redirectCount = 0; redirectCount < 6; redirectCount++) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Google Fotos devolvió una redirección no válida.');
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== 'https:' || !allowedPageHosts.has(nextUrl.hostname)) {
        throw new Error('La redirección no pertenece a Google Fotos.');
      }
      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) throw new Error('Google Fotos no permitió abrir el enlace público.');
    return { url: currentUrl, html: await response.text() };
  }
  throw new Error('El enlace de Google Fotos tiene demasiadas redirecciones.');
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET');
    response.end('Método no permitido.');
    return;
  }

  const sharedUrl = getStringQuery(request, 'url');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sharedUrl);
  } catch {
    response.statusCode = 400;
    response.end('Enlace de Google Fotos no válido.');
    return;
  }

  if (parsedUrl.protocol !== 'https:' || !allowedPageHosts.has(parsedUrl.hostname)) {
    response.statusCode = 400;
    response.end('Solo se permiten enlaces públicos de Google Fotos.');
    return;
  }

  try {
    const page = await getPublicGooglePage(parsedUrl);
    const metadata = page.html.match(/<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i)
      ?? page.html.match(/<meta\b(?=[^>]*content=["']([^"']+)["'])(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])[^>]*>/i);
    const imageUrl = metadata?.[1]?.replace(/&amp;/g, '&');
    if (!imageUrl) {
      response.statusCode = 404;
      response.end('Google Fotos no ofrece una vista previa pública para esta imagen.');
      return;
    }

    const directImage = new URL(imageUrl, page.url);
    if (directImage.protocol !== 'https:' || !directImage.hostname.endsWith('.googleusercontent.com')) {
      response.statusCode = 502;
      response.end('La vista previa de Google Fotos no devolvió un archivo de imagen válido.');
      return;
    }

    response.statusCode = 302;
    response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    response.setHeader('Location', directImage.toString());
    response.end();
  } catch (error) {
    response.statusCode = 502;
    response.end(error instanceof Error ? error.message : 'No se pudo cargar la foto compartida.');
  }
}

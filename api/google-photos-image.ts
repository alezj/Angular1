const allowedPageHosts = new Set(['photos.app.goo.gl', 'photos.google.com']);

async function resolvePhotoPage(startUrl: URL, signal: AbortSignal): Promise<{ url: URL; html: string }> {
  let currentUrl = startUrl;
  for (let redirects = 0; redirects < 5; redirects++) {
    const result = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal,
    });

    if (result.status >= 300 && result.status < 400) {
      const location = result.headers.get('location');
      if (!location) throw new Error('Google Fotos devolvió una redirección incompleta.');
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== 'https:' || !allowedPageHosts.has(nextUrl.hostname)) {
        throw new Error('La redirección no pertenece a Google Fotos.');
      }
      currentUrl = nextUrl;
      continue;
    }

    if (!result.ok) throw new Error('Google Fotos no permitió abrir el enlace compartido.');
    return { url: currentUrl, html: await result.text() };
  }
  throw new Error('El enlace compartido tiene demasiadas redirecciones.');
}

export async function GET(request: Request): Promise<Response> {
  const sharedUrl = new URL(request.url).searchParams.get('url') || '';
  let startUrl: URL;
  try {
    startUrl = new URL(sharedUrl);
  } catch {
    return new Response('Enlace de Google Fotos no válido.', { status: 400 });
  }

  if (startUrl.protocol !== 'https:' || !allowedPageHosts.has(startUrl.hostname)) {
    return new Response('Solo se permiten enlaces públicos de Google Fotos.', { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let page: { url: URL; html: string };
    try {
      page = await resolvePhotoPage(startUrl, controller.signal);
    } finally {
      clearTimeout(timeout);
    }

    const metadata = page.html.match(/<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i)
      ?? page.html.match(/<meta\b(?=[^>]*content=["']([^"']+)["'])(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])[^>]*>/i);
    const imageUrl = metadata?.[1]?.replace(/&amp;/g, '&');
    if (!imageUrl) {
      return new Response('Google Fotos no ofrece una vista previa pública para esta imagen.', { status: 404 });
    }

    const image = new URL(imageUrl, page.url);
    if (image.protocol !== 'https:' || !image.hostname.endsWith('.googleusercontent.com')) {
      return new Response('La vista previa devuelta por Google Fotos no es válida.', { status: 502 });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: image.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la foto compartida.';
    return new Response(message, { status: 502 });
  }
}

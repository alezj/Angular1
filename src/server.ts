import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.get('/api/google-photos-image', async (req, res) => {
  const sharedUrl = typeof req.query['url'] === 'string' ? req.query['url'] : '';
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sharedUrl);
  } catch {
    res.status(400).send('Enlace de Google Fotos no válido.');
    return;
  }

  const allowedHosts = new Set(['photos.app.goo.gl', 'photos.google.com']);
  if (parsedUrl.protocol !== 'https:' || !allowedHosts.has(parsedUrl.hostname)) {
    res.status(400).send('Solo se permiten enlaces públicos de Google Fotos.');
    return;
  }

  try {
    const page = await fetch(parsedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    });
    const finalUrl = new URL(page.url);
    if (!page.ok || !allowedHosts.has(finalUrl.hostname)) {
      res.status(502).send('Google Fotos no permitió abrir el enlace compartido.');
      return;
    }

    const html = await page.text();
    const imageTag = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i);
    const imageUrl = imageTag?.[1]?.replace(/&amp;/g, '&');
    if (!imageUrl) {
      res.status(404).send('No se encontró una vista previa pública para esta foto.');
      return;
    }

    const parsedImageUrl = new URL(imageUrl, finalUrl);
    if (parsedImageUrl.protocol !== 'https:' || !parsedImageUrl.hostname.endsWith('.googleusercontent.com')) {
      res.status(502).send('La vista previa devuelta por Google Fotos no es válida.');
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.redirect(302, parsedImageUrl.toString());
  } catch {
    res.status(502).send('No se pudo cargar la imagen compartida de Google Fotos.');
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

import { defineConfig } from 'vite';

/**
 * En GitHub Pages el sitio no cuelga de la raíz del dominio sino de
 * /lucent-landing/, así que todas las rutas absolutas (/media/...) necesitan
 * ese prefijo o devuelven 404. En desarrollo se sirve desde la raíz.
 *
 * Si algún día se publica en un dominio propio, basta con poner BASE = '/'.
 */
const BASE = process.env.DEPLOY_BASE ?? '/lucent-landing/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  build: {
    // La secuencia ya viene comprimida; no hace falta avisar por cada fotograma.
    assetsInlineLimit: 0,
    reportCompressedSize: false
  }
}));


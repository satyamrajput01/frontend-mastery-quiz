import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          privacy: path.resolve(__dirname, 'privacy.html'),
          terms: path.resolve(__dirname, 'terms.html'),
        },
      },
    },
    plugins: [
      {
        name: 'copy-static-quiz-assets',
        closeBundle() {
          const srcDataDir = path.resolve(__dirname, 'data');
          const destDataDir = path.resolve(__dirname, 'dist', 'data');
          if (fs.existsSync(srcDataDir)) {
            fs.mkdirSync(destDataDir, {recursive: true});
            fs.cpSync(srcDataDir, destDataDir, {recursive: true});
          }

          const srcFavicon = path.resolve(__dirname, 'favicon.svg');
          const destFavicon = path.resolve(__dirname, 'dist', 'favicon.svg');
          if (fs.existsSync(srcFavicon)) {
            fs.copyFileSync(srcFavicon, destFavicon);
          }

          const srcScreenshots = path.resolve(__dirname, 'screenshots');
          const destScreenshots = path.resolve(__dirname, 'dist', 'screenshots');
          if (fs.existsSync(srcScreenshots)) {
            fs.mkdirSync(destScreenshots, {recursive: true});
            fs.cpSync(srcScreenshots, destScreenshots, {recursive: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

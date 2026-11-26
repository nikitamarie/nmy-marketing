import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Baut eine einzige HTML-Datei (JS + CSS eingebettet) – die NMY-App liefert sie unter /b/neu aus.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { assetsInlineLimit: 0, cssCodeSplit: false },
  server: { proxy: { '/b/': 'https://nmy-marketing.nmy-cosmetics.workers.dev' } }, // lokal: Bilder & Schriften von der App
});

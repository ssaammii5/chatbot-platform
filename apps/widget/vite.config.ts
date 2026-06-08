import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@chatbot-platform/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/app.ts'),
      name: 'AiChatWidget',
      fileName: 'ai-chat-widget',
      formats: ['es', 'iife'],
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});

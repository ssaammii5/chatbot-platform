import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

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

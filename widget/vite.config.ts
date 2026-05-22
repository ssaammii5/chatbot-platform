import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte({ compilerOptions: { customElement: true } })],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'AiChatWidget',
      fileName: 'ai-chat-widget',
      formats: ['es', 'iife'],
    },
    // Output a single file for easy embedding
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})

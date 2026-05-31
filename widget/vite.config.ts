import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte({ compilerOptions: { customElement: true } })],
  build: {
    lib: {
      entry: 'src/app.ts',
      name: 'AiChatWidget',
      fileName: 'ai-chat-widget',
      formats: ['es', 'iife'],
    },
    rollupOptions: {
      output: {
        // Use codeSplitting: false to output a single embeddable bundle
      },
    },
    // Disable code splitting to keep the widget as a single embeddable file
    minify: true,
  },
})

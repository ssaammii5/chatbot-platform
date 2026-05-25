/**
 * tailwind.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTE: This project uses Tailwind CSS v4 which is fully CSS-native.
 * Configuration is defined in `app/globals.css` via the @theme directive
 * rather than this JavaScript config file.
 *
 * This file is kept for spec compliance and IDE tooling support.
 * If you downgrade to Tailwind v3, move your theme tokens here.
 *
 * See: https://tailwindcss.com/docs/v4-beta#configuration
 *
 * Current theme tokens (defined in globals.css @theme block):
 *   --font-sans        Inter, Outfit, Segoe UI
 *   --color-primary-*  Blue-500 palette
 *   --color-surface    Glassmorphism surface (slate dark)
 *   --animate-float    6s floating animation
 *   --animate-fade-in  0.4s fade-in
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  // In v4, content scanning is automatic. This array is kept for v3 compatibility.
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Theme is now managed in globals.css via @theme {} — no JS overrides needed.
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

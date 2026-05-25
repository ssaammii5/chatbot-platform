/**
 * widget/src/app.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Widget entry point — registers the <ai-chat-widget> custom element.
 * Import this file in your page to activate the widget.
 *
 * Usage (HTML):
 *   <script type="module" src="/dist/ai-chat-widget.js"></script>
 *   <ai-chat-widget tenant-id="YOUR_TENANT_ID" theme-color="#6366f1"></ai-chat-widget>
 */

// Importing the Svelte component compiled with `customElement: true` triggers
// the custom element registration via `customElements.define('ai-chat-widget', ...)`
import './lib/ChatWidget.svelte';

console.log('[AI Chat Widget] <ai-chat-widget> custom element registered.');

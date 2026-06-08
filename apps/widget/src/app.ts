import { SOCKET_EVENTS } from '@chatbot-platform/shared';

// Register the <ai-chat-widget> Custom Element
class AiChatWidget extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const tenantId = this.getAttribute('tenant-id') || '';
    const apiUrl = this.getAttribute('api-url') || '';

    this.shadow.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; }
        .widget { padding: 1rem; border: 1px solid #ccc; border-radius: 8px; }
      </style>
      <div class="widget">
        <p>AI Chat Widget — Tenant: ${tenantId}</p>
        <p><em>🚧 Scaffold placeholder. Connect to ${apiUrl || 'api'} via ${SOCKET_EVENTS.JOIN_SESSION}</em></p>
      </div>
    `;
  }
}

customElements.define('ai-chat-widget', AiChatWidget);

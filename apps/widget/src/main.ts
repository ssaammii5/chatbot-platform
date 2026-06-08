import './app';

// Dev mode: render the widget in a test page
const widget = document.createElement('ai-chat-widget');
widget.setAttribute('tenant-id', 'dev-tenant');
widget.setAttribute('api-url', import.meta.env.VITE_API_URL || 'http://localhost:3000');
document.body.appendChild(widget);

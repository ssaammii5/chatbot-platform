<svelte:options customElement="ai-chat-widget" />

<script lang="ts">
  import { onMount } from 'svelte';
  import io from 'socket.io-client';

  // Props for the web component
  export let tenantId: string = "demo-tenant-id";
  export let themeColor: string = "#3b82f6";
  export let apiUrl: string = "";

  let isOpen = false;
  let messages: {id: string, sender: string, content: string}[] = [];
  let inputMessage = '';
  let socket: any;
  let isAgentActive = false;
  let isTyping = false;
  let messagesContainer: HTMLElement;

  const conversationId = crypto.randomUUID();

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  onMount(() => {
    const wsUrl = apiUrl || import.meta.env.VITE_WS_URL || 'http://localhost:3000';

    socket = io(wsUrl, {
      query: { tenantId }
    });

    socket.on('connect', () => {
      socket.emit('joinConversation', { conversationId });
    });

    socket.on('newMessage', (msg: any) => {
      messages = [...messages, { id: crypto.randomUUID(), sender: msg.sender, content: msg.content }];
      isTyping = false;
      setTimeout(scrollToBottom, 50);
    });

    socket.on('messageChunk', (data: any) => {
      isTyping = false;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'bot') {
        lastMsg.content += data.chunk;
        messages = [...messages];
      } else {
        messages = [...messages, { id: crypto.randomUUID(), sender: 'bot', content: data.chunk }];
      }
      setTimeout(scrollToBottom, 50);
    });

    socket.on('agentJoined', (data: any) => {
      isAgentActive = true;
      const agentName = typeof data.agentName === 'string' ? data.agentName : 'Support Agent';
      messages = [...messages, {
        id: crypto.randomUUID(),
        sender: 'system',
        content: `You are now connected to: ${agentName}`
      }];
      setTimeout(scrollToBottom, 50);
    });

    socket.on('typing', (data: any) => {
      isTyping = data.isTyping;
    });

    return () => {
      socket.disconnect();
    };
  });

  function sendMessage() {
    if (!inputMessage.trim()) return;

    messages = [...messages, { id: crypto.randomUUID(), sender: 'user', content: inputMessage }];

    socket.emit('sendMessage', {
      conversationId: conversationId,
      content: inputMessage
    });

    isTyping = true;
    inputMessage = '';
    setTimeout(scrollToBottom, 50);
  }

  function requestHandoff() {
    socket.emit('handoffRequest', { conversationId });
    messages = [...messages, {
      id: crypto.randomUUID(),
      sender: 'system',
      content: 'Connecting you to a support agent...'
    }];
    setTimeout(scrollToBottom, 50);
  }

  function toggleWidget() {
    isOpen = !isOpen;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="widget-root">
  {#if isOpen}
    <div class="chat-window">
      <!-- Header -->
      <div class="chat-header" style="background: linear-gradient(135deg, {themeColor}, {themeColor}dd)">
        <div class="header-left">
          <div class="header-avatar">
            {#if isAgentActive}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            {/if}
          </div>
          <div>
            <h3 class="header-title">{isAgentActive ? 'Support Agent' : 'AI Assistant'}</h3>
            <p class="header-subtitle">{isAgentActive ? 'Online' : 'Typically replies instantly'}</p>
          </div>
        </div>
        <button class="close-btn" on:click={toggleWidget} aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <!-- Messages Area -->
      <div class="messages-area" bind:this={messagesContainer}>
        {#if messages.length === 0}
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            <p>Hello! How can we help you today?</p>
          </div>
        {/if}

        {#each messages as msg (msg.id)}
          {#if msg.sender === 'system'}
            <div class="system-message">{msg.content}</div>
          {:else}
            <div class="message-row {msg.sender === 'user' ? 'user-row' : 'other-row'}">
              {#if msg.sender !== 'user'}
                <div class="msg-avatar {msg.sender === 'agent' ? 'agent-avatar' : 'bot-avatar'}">
                  {#if msg.sender === 'agent'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                  {:else}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                  {/if}
                </div>
              {/if}
              <div class="msg-bubble {msg.sender === 'user' ? 'user-bubble' : 'other-bubble'}"
                   style={msg.sender === 'user' ? `background: ${themeColor}` : ''}>
                {msg.content}
              </div>
            </div>
          {/if}
        {/each}

        {#if isTyping}
          <div class="message-row other-row">
            <div class="msg-avatar bot-avatar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Input Area -->
      <div class="input-area">
        {#if !isAgentActive && messages.length > 2}
          <div class="handoff-prompt">
            <button class="handoff-btn" on:click={requestHandoff}>
              Want to speak to a human?
            </button>
          </div>
        {/if}

        <form class="input-form" on:submit|preventDefault={sendMessage}>
          <input
            type="text"
            bind:value={inputMessage}
            on:keydown={handleKeyDown}
            placeholder="Type your message..."
            class="msg-input"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            class="send-btn"
            style="background: {themeColor}"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  {:else}
    <button
      class="fab"
      on:click={toggleWidget}
      style="background: linear-gradient(135deg, {themeColor}, {themeColor}dd)"
      aria-label="Open chat"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>
    </button>
  {/if}
</div>

<style>
  /* All styles are scoped to the shadow DOM via Svelte's customElement mode */
  :host {
    --widget-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    display: block;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    font-family: var(--widget-font);
  }

  .widget-root {
    font-family: var(--widget-font);
    font-size: 14px;
    line-height: 1.5;
  }

  /* ---- Chat Window ---- */
  .chat-window {
    width: 380px;
    max-width: calc(100vw - 48px);
    height: 520px;
    max-height: 80vh;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ---- Header ---- */
  .chat-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    flex-shrink: 0;
  }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .header-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  }

  .header-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.2; }
  .header-subtitle { margin: 0; font-size: 11px; opacity: 0.85; }

  .close-btn {
    background: rgba(255,255,255,0.15);
    border: none; color: #fff;
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.3); }

  /* ---- Messages ---- */
  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8fafc;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    gap: 12px;
    text-align: center;
  }
  .empty-state p { margin: 0; font-size: 14px; }

  .system-message {
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    background: #f1f5f9;
    border-radius: 999px;
    padding: 4px 16px;
    margin: 4px auto;
    width: fit-content;
  }

  .message-row { display: flex; align-items: flex-end; gap: 8px; max-width: 85%; }
  .user-row { align-self: flex-end; flex-direction: row-reverse; }
  .other-row { align-self: flex-start; }

  .msg-avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .bot-avatar { background: #dbeafe; color: #3b82f6; }
  .agent-avatar { background: #e0e7ff; color: #6366f1; }

  .msg-bubble {
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.45;
    word-break: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .user-bubble {
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .other-bubble {
    background: #fff;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    border-bottom-left-radius: 4px;
  }

  /* ---- Typing Indicator ---- */
  .typing-indicator {
    display: flex; gap: 4px;
    padding: 10px 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    border-bottom-left-radius: 4px;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #94a3b8;
    animation: bounce 1.4s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }

  /* ---- Input ---- */
  .input-area {
    padding: 12px;
    background: #fff;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
  }

  .handoff-prompt { text-align: center; margin-bottom: 8px; }
  .handoff-btn {
    background: none; border: none;
    color: #3b82f6; font-size: 12px;
    font-weight: 500; cursor: pointer;
  }
  .handoff-btn:hover { text-decoration: underline; }

  .input-form { display: flex; gap: 8px; align-items: center; }

  .msg-input {
    flex: 1;
    background: #f1f5f9;
    border: 2px solid transparent;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
    font-family: var(--widget-font);
    color: #1e293b;
  }
  .msg-input::placeholder { color: #94a3b8; }
  .msg-input:focus {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }

  .send-btn {
    width: 40px; height: 40px;
    border-radius: 50%;
    border: none; color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3);
  }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .send-btn:not(:disabled):hover { transform: scale(1.05); }
  .send-btn:not(:disabled):active { transform: scale(0.95); }

  /* ---- FAB ---- */
  .fab {
    width: 60px; height: 60px;
    border-radius: 50%;
    border: none; color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 8px 32px rgba(59,130,246,0.35);
    transition: transform 0.2s, box-shadow 0.2s;
    animation: fadeIn 0.3s ease-out;
  }
  .fab:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(59,130,246,0.45); }
  .fab:active { transform: scale(0.95); }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* Scrollbar */
  .messages-area::-webkit-scrollbar { width: 6px; }
  .messages-area::-webkit-scrollbar-track { background: transparent; }
  .messages-area::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
</style>

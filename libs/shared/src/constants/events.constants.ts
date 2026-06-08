// ============================================================
// Shared Constants — Socket.io Event Names
// ============================================================

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_SESSION: 'chat:join',
  SEND_MESSAGE: 'chat:message',
  TYPING_START: 'chat:typing:start',
  TYPING_STOP: 'chat:typing:stop',
  REQUEST_HANDOFF: 'chat:handoff:request',

  // Server → Client
  MESSAGE_RECEIVED: 'chat:message:received',
  MESSAGE_STREAMING: 'chat:message:streaming',
  MESSAGE_STREAM_END: 'chat:message:stream_end',
  AGENT_JOINED: 'chat:agent:joined',
  AGENT_TYPING: 'chat:agent:typing',
  SESSION_STATUS_CHANGED: 'chat:session:status',

  // Agent Workspace
  AGENT_PRESENCE: 'agent:presence',
  INBOX_UPDATE: 'agent:inbox:update',
  HANDOFF_ASSIGNED: 'agent:handoff:assigned',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

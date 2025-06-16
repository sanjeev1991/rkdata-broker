import WebSocket from 'ws';

export interface UpstoxSocketOptions {
  accessToken: string;
  accountId: string;
}

export interface InstrumentSubscription {
  instrumentKey: string;
}

export type SocketStatus = 'connected' | 'disconnected';

export interface UpstoxSocketMeta {
  id: string;
  accountId: string;
  socket: WebSocket; // from 'ws' package
  status: 'connected' | 'connecting' | 'disconnected';
  subscribed: Set<string>;
}

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class UpstoxGateway {
  @WebSocketServer()
  server: Server;

  // Future: implement subscribe/unsubscribe messages
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class FeedDistributorService {
  handleFeedMessage(data: any) {
    // Future: Forward to connected clients via WebSocket gateway
    // or publish to Redis pub/sub or Kafka
    console.log('📦 Feed:', data);
  }
}

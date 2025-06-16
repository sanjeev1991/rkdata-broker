import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Injectable, Logger } from '@nestjs/common';
import { UpstoxSocketMeta, UpstoxSocketOptions } from './types/upstox.types';
import axios, { AxiosError } from 'axios';
import * as protobuf from 'protobufjs';
import { join } from 'path';
import { CsvLoggerService } from '../csv-logger/csv-logger.service';


const MAX_SUBS_PER_SOCKET = 50;

interface FeedAuthorizeResponse {
  status: string;
  data: {
    authorized_redirect_uri: string;
  };
}


interface PriceTickData {
  tk: string;
  tm: string;
  pr: number;
  qt: number;
  vol: number;
  oi?: number;
  poi?: number;
  cp: number;
}

interface BidAskData {
  tk: string;
  bp: number;
  bq: number;
  ap: number;
  aq: number;
  tm: string;
}
enum FeedMessageType {
  UNKNOWN = 0,
  LIVE_FEED = 1,
  SUBSCRIPTION_RESPONSE = 2,
  // Add other types from your protobuf definition
}

@Injectable()
export class UpstoxManager {
  private sockets = new Map<string, UpstoxSocketMeta[]>();
  private protobufRoot: protobuf.Root | null = null;
  private readonly apiVersion = '2.0';
  private readonly logger = new Logger(UpstoxManager.name);
  constructor(private readonly csvLogger: CsvLoggerService) {
    this.initProtobuf();
  }
  // Initialize protobuf schema
  private async initProtobuf(): Promise<void> {
    try {
      this.logger.log('Initializing protobuf schema...', join(__dirname, 'resources', 'MarketDataFeed.proto'));
      this.protobufRoot = await protobuf.load(join(__dirname, 'resources', 'MarketDataFeed.proto'));
      this.logger.log('Protobuf schema initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize protobuf schema: ${error.message}`);
      throw new Error('Protobuf initialization failed');
    }
  }

  // Decode protobuf message
  private decodeProtobuf(buffer: Buffer): any {
    if (!this.protobufRoot) {
      this.logger.warn('Protobuf schema not initialized');
      return null;
    }
    try {
      const FeedResponse = this.protobufRoot.lookupType(
        'com.upstox.marketdatafeeder.rpc.proto.FeedResponse',
      );
      return FeedResponse.decode(buffer);
    } catch (error) {
      this.logger.error(`Failed to decode protobuf message: ${error.message}`);
      return null;
    }
  }

  private convertToISO(timestamp: string): string {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toISOString();
    } catch (error) {
      this.logger.error(`Failed to convert timestamp ${timestamp}: ${error.message}`);
      return new Date().toISOString();
    }
  }
  private isLong(value: any): value is protobuf.Long {
    return value && typeof value === 'object' && 'low' in value && 'high' in value;
  }

  private safeConvertLong(value: any): number {
    if (this.isLong(value)) {
      // Combine high and low bits for complete 64-bit value
      return Number(value.toString());
    }
    return Number(value) || 0;
  }
  // Transform and handle price tick data
  private transformPriceTickData(feed: any, key: string, feedType: 'marketFF' | 'indexFF'): PriceTickData | null {
    const feedData = feed.ff[feedType];
    const isIndex = feedType === 'indexFF';
      if (!feedData?.ltpc) {
          this.logger.warn(`Missing ltpc data for ${key}`);
          return null;
      }
    const marketFF = feed.ff[feedType];
    const eFeedDetails = marketFF.eFeedDetails;

    const ltq = isIndex ? 0 : this.safeConvertLong(marketFF.ltpc.ltq);
    const vtt = isIndex ? 0 : this.safeConvertLong(eFeedDetails.vtt);
    
    const tickData =  {
      tk: key,
      tm: this.convertToISO(marketFF.ltpc.ltt),
      pr: marketFF.ltpc.ltp,
      qt: ltq,
      vol: vtt,
      oi: isIndex ? 0 : eFeedDetails.oi,
      poi: isIndex ? 0 : eFeedDetails.poi,
      cp: isIndex ? marketFF.ltpc.cp : eFeedDetails.cp,
    };

     // Log to CSV without blocking
    this.csvLogger.logTickToCsv(key, tickData).catch(err => {
      this.logger.error(`Failed to log tick data for ${key}: ${err.message}`);
    });

    return tickData;
  }

  // Transform and handle bid-ask data
  private transformBidAskData(feed: any, key: string, currentTs: string): BidAskData[] {
    return feed.ff.marketFF.marketLevel.bidAskQuote.map((quote: any) => ({
      tk: key,
      bp: quote.bp,
      bq: quote.bq,
      ap: quote.ap,
      aq: quote.aq,
      tm: this.convertToISO(currentTs),
    }));
  }

  async connectSocket(options: UpstoxSocketOptions): Promise<void> {
    const authUrl = 'https://api.upstox.com/v2/feed/market-data-feed/authorize';
    let wsUrl: string = '';
    try {
      const response = await axios.get<FeedAuthorizeResponse>(authUrl, {
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Api-Version': this.apiVersion,
        },
      });

      wsUrl = response.data.data.authorized_redirect_uri;
      console.log('✅ WS Authorized URL:', wsUrl);
    } catch (err: unknown) {
      const error = err as AxiosError;

      if (error.response) {
        console.error('❌ Error Status:', error.response.status);
        console.error('❌ Error Message:', JSON.stringify(error.response.data));
      } else {
        console.error('❌ Network or unknown error:', error.message);
      }

      throw new Error('Failed to fetch upstox live feed authorization URL');
    }
    // 1. Get authorized WebSocket URL
    // const response = await axios.get<FeedAuthorizeResponse>(authUrl, {
    //   headers: {
    //     Authorization: `Bearer ${options.accessToken}`,
    //   },
    // });
    // console.log(response.data);
    // const wsUrl = response.data?.data?.authorized_redirect_uri;

    if (!wsUrl) {
      throw new Error('Unable to retrieve authorized WebSocket URL');
    }
    const socket = new WebSocket(wsUrl);

    const socketMeta: UpstoxSocketMeta = {
      id: uuidv4(),
      accountId: options.accountId,
      socket,
      status: 'connecting',
      subscribed: new Set(),
    };

    socket.on('open', () => {
      socketMeta.status = 'connected';
      const existing = this.sockets.get(options.accountId) ?? [];
      this.sockets.set(options.accountId, [...existing, socketMeta]);

      Logger.log(`✅ WS opened for ${options.accountId}`);

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (socketMeta.socket.readyState === WebSocket.OPEN) {
          socketMeta.socket.ping();
          Logger.debug(`Sent ping for ${socketMeta.id}`);
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);

      // setTimeout(() => {
      //   const data = {
      //     guid: socketMeta.id,
      //     method: "sub",
      //     data: {
      //       mode: "full",
      //       instrumentKeys: ["NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty 50"],
      //     },
      //   };
      //   socket.send(Buffer.from(JSON.stringify(data)));
      // }, 5000);
      
    });

    socket.on('error', (err: unknown) => {
      const error = err as Error;
      Logger.error(`❌ WS error: ${error.message}`);
    });

    socket.on('message', (data: Buffer) => {
      try {
        const decoded = this.decodeProtobuf(data);
        if (decoded) {
          this.logger.log(`Decoded message: ${JSON.stringify(decoded, null, 2)}`);
          const messageType = typeof decoded.type === 'number' 
      ? FeedMessageType[decoded.type] 
      : decoded.type;

          //console.log("messageType = ", messageType);
          //console.log("messageFeeds = ", decoded.feeds);
          if (messageType === 'LIVE_FEED' && decoded.feeds) {
            Object.entries(decoded.feeds).forEach(([key, feed]: [string, any]) => {
              const feedType = feed.ff.marketFF ? 'marketFF' : 
                                   feed.ff.indexFF ? 'indexFF' : null;
                    
                    if (!feedType) {
                        this.logger.warn(`Unknown feed type for ${key}`);
                        return;
                    }
              //console.log(`Processing feed for key: ${key}`, feed);
              if (feed.ff[feedType].ltpc) {
                const priceTick = this.transformPriceTickData(feed, key,feedType);
                //this.logger.log(`Price Tick Data: ${JSON.stringify(priceTick)}`);
              }
              if (feedType === 'marketFF' && 
                        feed.ff.marketFF.marketLevel?.bidAskQuote) {
                        const currentTs = decoded.currentTs || 
                                        (feed.ff[feedType].ltpc?.ltt ?? Date.now().toString());
                        const bidAskData = this.transformBidAskData(feed, key, currentTs);
                        bidAskData.forEach(bidAsk => {
                            //this.logger.log(`Bid-Ask Data: ${JSON.stringify(bidAsk)}`);
                        });
                    }
            });
          }
          // Add logic to handle subscription confirmation or market data
          // Example: Check if it's a subscription confirmation or market data
          // if (decoded.type === 'subscription_response') {
          //   this.logger.log(`Subscription confirmed for ${socketMeta.subscribed.size} instruments`);
          // } else if (decoded.type === 'market_data') {
          //   // Handle market data (e.g., LTP, volume)
          //   this.logger.log(`Market data: ${JSON.stringify(decoded.data)}`);
          // }
        }
      } catch (error) {
        this.logger.error(`Failed to process message: ${error.message}`);
      }
    });

    socket.on('close', (code: number, reason: Buffer) => {
      socketMeta.status = 'disconnected';
      Logger.error(`❌ WS closed for ${socketMeta.accountId}. Code: ${code}, Reason: ${reason.toString()}`);
      // Optionally attempt to reconnect
    });

    socketMeta.socket = socket;
  } 

  findAvailableSocket(accountId: string): UpstoxSocketMeta | null {
    const sockets = this.sockets.get(accountId) ?? [];
    return (
      sockets.find((sock) => sock.subscribed.size < MAX_SUBS_PER_SOCKET) ?? null
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async subscribeInstruments(instrumentKeys: string[]): Promise<void> {
    if (instrumentKeys.length === 0) {
      throw new Error('No instrument keys provided');
    }

    if (instrumentKeys.length > 100) {
      throw new Error(
        `Upstox supports max 100 instrument keys per subscription. Received: ${instrumentKeys.length}`,
      );
    }

    for (const [accountId, socketMetas] of this.sockets.entries()) {
      for (const socketMeta of socketMetas) {
        const availableSlots = MAX_SUBS_PER_SOCKET - socketMeta.subscribed.size;

        if (availableSlots >= instrumentKeys.length) {
          const payload = {
            guid: socketMeta.id,
            method: 'sub',
            data: {
              mode: 'full', // Can be changed to 'ltp', 'full' or 'quote' based on requirements
              instrumentKeys,
            },
          };
        //      const data = {
        //   guid: socketMeta.id,
        //   method: "sub",
        //   data: {
        //     mode: "full",
        //     instrumentKeys: ["NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty 50"],
        //   },
        // };

        //socketMeta.socket.send(Buffer.from(JSON.stringify(data)));
          console.log(payload);
          if (socketMeta.socket.readyState === WebSocket.OPEN) {
            
            socketMeta.socket.send(Buffer.from(JSON.stringify(payload)));
            instrumentKeys.forEach((key) => socketMeta.subscribed.add(key));
            Logger.log(
              `✅ Sent subscription for ${instrumentKeys.length} keys ${accountId}`,
            );
          } else {
            Logger.warn(`❌ Cannot send: socket not open for ${socketMeta.id}`);
          }
          return;
        }
      }
    }

    throw new Error(
      `❌ No available socket in any account has room for ${instrumentKeys.length} instrument keys.`,
    );
  }
}

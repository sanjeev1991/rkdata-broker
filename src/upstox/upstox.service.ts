import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UpstoxAccount } from './schema/upstox-account.schema';
import { Model } from 'mongoose';
import axios, { AxiosResponse } from 'axios';
import { UpstoxTokenResponse } from './types/upstox-token-response.interface';
//import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
@Injectable()
export class UpstoxService {
  private readonly logger = new Logger(UpstoxService.name);
  constructor(
    @InjectModel(UpstoxAccount.name)
    private readonly model: Model<UpstoxAccount>,
  ) {}

  async addAccount(data: Partial<UpstoxAccount>) {
    return this.model.create(data);
  }

  async getLoginUrl(id: string): Promise<string> {
    const account = await this.model.findById(id);
    if (!account) throw new Error('Account not found');

    return `https://api.upstox.com/v2/login/authorization/dialog?client_id=${account.apiKey}&redirect_uri=${account.redirectUri}&response_type=code&state=${account._id.toString()}`;
  }

  async saveAuthCode(id: string, code: string): Promise<{ message: string }> {
    const account = await this.model.findById(id);
    if (!account) throw new Error('Invalid account');

    account.authCode = code;
    await account.save();

    return { message: 'Auth code saved' };
  }

  async exchangeCodeForTokens(id: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    const account = await this.model.findById(id);
    if (!account?.authCode) throw new Error('Missing auth code');

    const form = new URLSearchParams();
    form.append('client_id', account.clientId);
    form.append('client_secret', account.clientSecret);
    form.append('code', account.authCode);
    form.append('redirect_uri', account.redirectUri);
    form.append('grant_type', 'authorization_code');

    const response: AxiosResponse<UpstoxTokenResponse> = await axios.post(
      'https://api.upstox.com/v2/login/authorization/token',
      form,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, extended_token, user_id } = response.data;

    account.accessToken = access_token;
    account.refreshToken = extended_token;
    account.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    account.userId = user_id;
    await account.save();

    return {
      accessToken: access_token,
      refreshToken: extended_token,
      userId: user_id,
    };
  }

  async refreshAccessToken(id: any): Promise<{ accessToken: string }> {
    const account = await this.model.findById(id);
    if (!account?.refreshToken) throw new Error('Missing refresh token');

    const form = new URLSearchParams();
    form.append('client_id', account.clientId);
    form.append('client_secret', account.clientSecret);
    form.append('refresh_token', account.refreshToken);
    form.append('grant_type', 'refresh_token');

    const response: AxiosResponse<UpstoxTokenResponse> = await axios.post(
      'https://api.upstox.com/v2/login/refresh/token',
      form,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token } = response.data;

    account.accessToken = access_token;
    account.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    return { accessToken: access_token };
  }

  async listAccounts() {
    return this.model.find().select('-__v');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  //@Cron('10 4 * * *', { timeZone: 'Asia/Kolkata' }) // daily at 4:10 AM
  async scheduledRefreshAllTokens(): Promise<void> {
    const accounts = await this.model.find();

    for (const account of accounts) {
      try {
        if (account.refreshToken) {
          await this.refreshAccessToken(account._id.toString());
          Logger.log(`✅ Token refreshed for account: ${account.name}`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          Logger.error(
            `❌ Failed to refresh token for ${account.name}: ${err.message}`,
          );
        } else {
          Logger.error(
            `❌ Unknown error refreshing token for ${account.name}: ${JSON.stringify(err)}`,
          );
        }
      }
    }
  }
}

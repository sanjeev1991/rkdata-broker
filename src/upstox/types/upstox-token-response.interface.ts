export interface UpstoxTokenResponse {
  status: string;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    [key: string]: unknown;
  };
}

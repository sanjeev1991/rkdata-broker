export interface UpstoxTokenResponse {
  access_token: string;
  extended_token?: string; // Upstox v2 returns this instead of `refresh_token`
  expires_in?: number; // optional if not returned
  user_id: string;
  user_name?: string;
  email?: string;
  broker?: string;
  products?: string[];
  exchanges?: string[];
  order_types?: string[];
  user_type?: string;
  poa?: boolean;
  is_active?: boolean;
  [key: string]: unknown; // fallback for any additional unexpected fields
}

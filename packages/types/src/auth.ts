export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username: string;
  given_name: string;
  family_name: string;
  realm_access: {
    roles: string[];
  };
}

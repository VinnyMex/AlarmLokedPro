import { apiRequest, storeTokens, clearTokens } from './api';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async register(input: { name: string; email: string; password: string; locale?: string; timezone?: string }) {
    const tokens = await apiRequest<TokenPair>('/auth/register', { method: 'POST', body: input, auth: false });
    storeTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },
  async login(input: { email: string; password: string }) {
    const tokens = await apiRequest<TokenPair>('/auth/login', { method: 'POST', body: input, auth: false });
    storeTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },
  logout() {
    clearTokens();
  },
};

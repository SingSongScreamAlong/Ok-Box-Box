/**
 * API client for Ok, Box Box
 * Used by Launcher and Apps to communicate with Backend
 */

import type { 
  LicenseValidationRequest, 
  LicenseValidationResponse,
  SessionInfo,
  SessionMetadata 
} from '../index.js';

export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token ?? null;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Health
  async health(): Promise<{ status: string; time: number; db: string }> {
    return this.request('GET', '/health');
  }

  // License
  async validateLicense(req: LicenseValidationRequest): Promise<LicenseValidationResponse> {
    return this.request('POST', '/api/license/validate', req);
  }

  // Sessions
  async getSessions(): Promise<{ sessions: SessionInfo[] }> {
    return this.request('GET', '/api/sessions');
  }

  async getSession(sessionId: string): Promise<SessionInfo> {
    return this.request('GET', `/api/sessions/${sessionId}`);
  }

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata> {
    return this.request('GET', `/api/sessions/${sessionId}/metadata`);
  }
}

/**
 * Default API endpoints
 */
export const API_ENDPOINTS = {
  production: 'https://api.okboxbox.com',
  staging: 'https://api-staging.okboxbox.com',
  local: 'http://localhost:4000',
} as const;

/**
 * Create a configured API client
 */
export function createApiClient(env: 'production' | 'staging' | 'local' = 'local'): ApiClient {
  return new ApiClient({ baseUrl: API_ENDPOINTS[env] });
}

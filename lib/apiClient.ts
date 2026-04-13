import { API_BASE } from './api';
import { clearActiveBaseSnapshot } from './activeBaseSnapshot';

export interface User {
  id: number;
  email: string;
  name: string;
  /** Profile photo URL (e.g. from Google sign-in). */
  avatar_url?: string;
  company?: string;
  /** Saved from profile; may be absent in older cached `sparkai:user`. */
  timezone?: string;
  dob?: string;
  role?: "admin" | "user";
  email_verified?: boolean;
  /** Server-owned; when false and email is verified, user must finish onboarding. */
  onboarding_completed?: boolean;
  billing_plan_key?: string | null;
  credits_balance?: number;
  monthly_lead_credits?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  base?: { id: number; name: string };
}

export interface PasswordResetRequestResponse {
  ok: boolean;
  reset_url?: string; // present in non-production to ease testing
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sparkai:token');
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sparkai:token', token);
  }
};

export const setUser = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sparkai:user', JSON.stringify(user));
    window.dispatchEvent(new Event('sparkai:user-changed'));
  }
};

export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sparkai:token');
    localStorage.removeItem('sparkai:user');
    localStorage.removeItem('sparkai:active_base_id');
    clearActiveBaseSnapshot();
  }
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('sparkai:user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    // Clear invalid data
    localStorage.removeItem('sparkai:user');
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

// Check if token is expired or will expire soon (within 1 day)
const isTokenExpiringSoon = (token: string | null): boolean => {
  if (!token) return true;
  try {
    // Decode token without verification to check expiration
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const decoded = JSON.parse(jsonPayload);
    const exp = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    // Return true if token expires within 1 day
    return (exp - now) < oneDay;
  } catch {
    return true; // If we can't decode, assume it's expired
  }
};

// Refresh token automatically
let refreshingToken = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshToken = async (): Promise<string | null> => {
  // Prevent multiple simultaneous refresh attempts
  if (refreshingToken && refreshPromise) {
    return refreshPromise;
  }
  
  refreshingToken = true;
  refreshPromise = (async () => {
    try {
      const token = getToken();
      if (!token) {
        return null;
      }
      
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        clearAuth();
        return null;
      }
      
      const data: AuthResponse = await response.json();
      setToken(data.token);
      if (data.user) {
        setUser(data.user);
      }
      return data.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      return null;
    } finally {
      refreshingToken = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
};

// Simple request cache to prevent duplicate requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 2000; // 2 seconds cache for GET requests

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Only cache GET requests
  const isGetRequest = !options.method || options.method === 'GET';
  const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  /** Never cache GET /api/campaigns/:id — draft wizard must see fresh config after PUT. */
  const isSingleCampaignGet =
    isGetRequest && /^\/api\/campaigns\/\d+$/.test(normalizedEndpoint);
  /** GET /api/invitations/:token is public; never send JWT (stale tokens cause 401 and break invite/signup). */
  const isPublicInvitationDetailsGet =
    isGetRequest && /^\/api\/invitations\/[^/]+$/.test(normalizedEndpoint);
  const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;
  
  if (!isGetRequest && requestCache.size > 0) {
    requestCache.clear();
  }

  if (isGetRequest && !isSingleCampaignGet && !isPublicInvitationDetailsGet) {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }
  
  let token = getToken();
  if (!isPublicInvitationDetailsGet && token && isTokenExpiringSoon(token)) {
    const newToken = await refreshToken();
    if (newToken) {
      token = newToken;
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !isPublicInvitationDetailsGet) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isPublicInvitationDetailsGet) {
    // Try to refresh token once before giving up
    const refreshedToken = await refreshToken();
    if (refreshedToken) {
      // Retry the request with the new token
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      const retryResponse = await fetch(`${API_BASE}${normalizedEndpoint}`, {
        ...options,
        headers,
      });
      
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        if (isGetRequest && retryResponse.ok && !isSingleCampaignGet && !isPublicInvitationDetailsGet) {
          requestCache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      }
    }
    
    // If refresh failed or retry failed, clear auth and handle error
    clearAuth();
    // Don't redirect immediately - let components handle the error first
    // Components can show error messages, then redirect if needed
    // Only redirect if we're not already on an auth page or settings page
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname || '';
      const isAuthPage = currentPath.startsWith('/auth');
      const isSettingsPage = currentPath.startsWith('/settings');
      
      // Don't auto-redirect on settings page - let the component handle it
      if (!isAuthPage && !isSettingsPage && currentPath) {
        // Longer delay to allow error messages to display
        setTimeout(() => {
          // Only redirect if still on the same page (user didn't navigate away)
          if (window.location.pathname === currentPath) {
            window.location.href = '/auth/login';
          }
        }, 2000);
      }
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP error! status: ${response.status}` };
    }

    if (
      response.status === 403 &&
      errorData?.code === "EMAIL_NOT_VERIFIED" &&
      typeof window !== "undefined"
    ) {
      const p = window.location.pathname || "";
      if (!p.startsWith("/auth")) {
        window.location.href = "/auth/verify-required";
      }
    }

    // Prefer human-readable `message` when the API sends both `error` and `message` (e.g. SMTP setup hints).
    const error = new Error(
      errorData.message ||
        errorData.error ||
        `HTTP error! status: ${response.status}`
    );
    (error as any).status = response.status;
    (error as any).response = { data: errorData };
    throw error;
  }

  const data = await response.json();
  
  if (isGetRequest && response.ok && !isSingleCampaignGet && !isPublicInvitationDetailsGet) {
    requestCache.set(cacheKey, { data, timestamp: Date.now() });
    // Clean old cache entries (keep only last 50)
    if (requestCache.size > 50) {
      const firstKey = requestCache.keys().next().value;
      if (firstKey) {
        requestCache.delete(firstKey);
      }
    }
  }
  
  return data;
};

export type LeadGenStreamProgressEvent = {
  type: "progress";
  stage: string;
  done: number;
  total: number;
  label?: string;
};

export type LeadGenStreamCompletePayload = {
  type: "complete";
  success: boolean;
  leads: unknown[];
  count: number;
  message?: string;
  icp_context?: unknown;
  completion_credits?: unknown;
};

/**
 * POST /api/leads/generate-stream — NDJSON lines until `complete` or `error`.
 */
export const streamGenerateLeads = async (
  body: { prompt: string; base_id: number; count: number },
  onProgress: (e: LeadGenStreamProgressEvent) => void
): Promise<LeadGenStreamCompletePayload> => {
  const token = getToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${API_BASE}/api/leads/generate-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorData: { message?: string; error?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP error! status: ${response.status}` };
    }
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let complete: LeadGenStreamCompletePayload | null = null;

  const flushLines = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (parsed.type === "progress") {
        onProgress({
          type: "progress",
          stage: String(parsed.stage ?? ""),
          done: Number(parsed.done ?? 0),
          total: Number(parsed.total ?? 0),
          label: typeof parsed.label === "string" ? parsed.label : undefined,
        });
      } else if (parsed.type === "complete") {
        complete = parsed as unknown as LeadGenStreamCompletePayload;
      } else if (parsed.type === "error") {
        throw new Error(String(parsed.message || "Generation failed"));
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    flushLines(decoder.decode(value, { stream: true }));
  }
  flushLines(decoder.decode());

  if (!complete) {
    throw new Error("Stream ended without a complete event");
  }
  return complete;
};

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  signup: async (email: string, password: string, name: string, company: string, dob?: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, company, dob }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(error.error || 'Signup failed');
    }

    const data: AuthResponse = await response.json();
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const token = getToken();
    if (!token) {
      throw new Error('No token to refresh');
    }

    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Token refresh failed' }));
      clearAuth();
      throw new Error(error.error || 'Token refresh failed');
    }

    const data: AuthResponse = await response.json();
    setToken(data.token);
    if (data.user) {
      setUser(data.user);
    }
    return data;
  },

  requestPasswordReset: async (email: string): Promise<PasswordResetRequestResponse> => {
    const response = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Password reset request failed" }));
      throw new Error(error.error || "Password reset request failed");
    }

    return response.json();
  },

  confirmPasswordReset: async (token: string, password: string): Promise<{ ok: boolean }> => {
    const response = await fetch(`${API_BASE}/api/auth/password-reset/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Password reset failed" }));
      throw new Error(error.error || "Password reset failed");
    }

    return response.json();
  },

  /** Finish account after Google OAuth (new users receive `pending` JWT in URL). */
  googleCompleteSignup: async (payload: {
    pending_token: string;
    name: string;
    company: string;
    dob?: string;
    password?: string;
  }): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/auth/google/complete-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Could not complete sign-up" }));
      throw new Error(error.error || "Could not complete sign-up");
    }

    const data: AuthResponse = await response.json();
    setToken(data.token);
    setUser(data.user);
    return data;
  },
};


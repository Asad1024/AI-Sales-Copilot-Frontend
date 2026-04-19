/**
 * API Client with permission-aware error handling
 */

// Export API_BASE for legacy compatibility
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class PermissionError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 403, "PERMISSION_DENIED", details);
    this.name = "PermissionError";
  }
}

export class EmailVerificationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 403, "EMAIL_NOT_VERIFIED", details);
    this.name = "EmailVerificationError";
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export type CompanyPreviewRecord = {
  id: string;
  name: string;
  avatar_url: string | null;
  domain: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  industry: string | null;
  estimated_num_employees: number | null;
  employee_range: string | null;
  location: string | null;
  founded_year: number | null;
  annual_revenue_printed: string | null;
  /** Raw org phone when API returns it (portal shows only when set) */
  phone?: string | null;
  /** Generic company contact email when API returns it */
  company_email?: string | null;
};

export type CompanyEmployeePreview = {
  full_name: string;
  title: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  linkedin_url: string | null;
  /** Optional raw contact when an endpoint enriches separately */
  email?: string | null;
  phone?: string | null;
};

export type CompanyPreviewTries = {
  limit: number;
  used: number;
  remaining: number;
};

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add auth token if not skipped (must match apiClient: sparkai:token)
  if (!skipAuth && typeof window !== "undefined") {
    const token =
      localStorage.getItem("sparkai:token") || localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Parse response
  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle errors
  if (!response.ok) {
    // For user-facing errors (4xx), prefer message over error (error is usually the error class name)
    // For server errors (5xx), use error or message
    const isUserError = response.status >= 400 && response.status < 500;
    
    // Extract message, but never use error class names as messages
    let message: string;
    if (isUserError) {
      // Prefer message field, but if it's missing, check error field (but skip if it's a class name)
      message = data?.message || 
                (data?.error && !data.error.match(/^(APIError|BadRequestError|ValidationError|NotFoundError|InternalServerError)$/i) 
                  ? data.error 
                  : `Request failed with status ${response.status}`);
    } else {
      message = data?.error || data?.message || `Request failed with status ${response.status}`;
    }
    
    const code = data?.code;
    const details = data?.details;

    // Special handling for permission errors
    if (response.status === 403) {
      if (code === "EMAIL_NOT_VERIFIED") {
        throw new EmailVerificationError(message, details);
      }
      throw new PermissionError(message, details);
    }

    throw new APIError(message, response.status, code, details);
  }

  return data;
}

/**
 * API methods
 */
export const api = {
  // Auth
  async login(email: string, password: string) {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  },

  async signup(name: string, email: string, password: string) {
    return apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      skipAuth: true,
    });
  },

  async logout() {
    return apiRequest("/api/auth/logout", { method: "POST" });
  },

  async getMe() {
    return apiRequest("/api/auth/me");
  },

  // Email Verification
  async sendVerificationEmail() {
    return apiRequest("/api/auth/verify-email/send", { method: "POST" });
  },

  async verifyEmail(token: string) {
    return apiRequest("/api/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuth: true,
    });
  },

  async getVerificationStatus() {
    return apiRequest("/api/auth/verify-email/status");
  },

  // Bases
  async getBases() {
    return apiRequest("/api/bases");
  },

  async getBase(id: number) {
    return apiRequest(`/api/bases/${id}`);
  },

  async createBase(name: string) {
    return apiRequest("/api/bases", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async updateBase(id: number, updates: any) {
    return apiRequest(`/api/bases/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async getIcpContext(baseId: number) {
    return apiRequest(`/api/bases/${baseId}/icp-context`);
  },

  async updateIcpContext(baseId: number, icpContext: Record<string, unknown>) {
    return apiRequest(`/api/bases/${baseId}/icp-context`, {
      method: "PUT",
      body: JSON.stringify(icpContext),
    });
  },

  async deleteBase(id: number) {
    return apiRequest(`/api/bases/${id}`, { method: "DELETE" });
  },

  // Base Members
  async getBaseMembers(baseId: number) {
    return apiRequest(`/api/bases/${baseId}/members`);
  },

  async addBaseMember(baseId: number, userId: number, role: string) {
    return apiRequest(`/api/bases/${baseId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  async updateBaseMemberRole(baseId: number, memberId: number, role: string) {
    return apiRequest(`/api/bases/${baseId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  async removeBaseMember(baseId: number, memberId: number) {
    return apiRequest(`/api/bases/${baseId}/members/${memberId}`, {
      method: "DELETE",
    });
  },

  // Leads
  async getLeads(baseId: number, params?: any) {
    const query = new URLSearchParams({ base_id: String(baseId), ...params });
    return apiRequest(`/api/leads?${query}`);
  },

  async createLead(baseId: number, lead: any) {
    return apiRequest("/api/leads", {
      method: "POST",
      body: JSON.stringify({ ...lead, base_id: baseId }),
    });
  },

  async createLeadFromLinkedIn(baseId: number, linkedinUrl: string) {
    return apiRequest("/api/leads/from-linkedin", {
      method: "POST",
      body: JSON.stringify({ base_id: baseId, linkedin_url: linkedinUrl }),
    });
  },

  async searchCompanies(baseId: number, query: string, limit: number = 8) {
    const params = new URLSearchParams({
      base_id: String(baseId),
      q: query.trim(),
      limit: String(limit),
    });
    return apiRequest<{ companies: CompanyPreviewRecord[] }>(`/api/leads/company-search?${params.toString()}`);
  },

  /** Distinct companies in a workspace (aggregated from lead.company). */
  async listWorkspaceCompanies(baseId: number) {
    const params = new URLSearchParams({ base_id: String(baseId) });
    return apiRequest<{
      companies: Array<{
        company: string;
        lead_count: number;
        last_updated: string | null;
        industry: string | null;
      }>;
    }>(`/api/leads/companies?${params.toString()}`);
  },

  /**
   * Full Apollo company profile + employee list (up to 200); charges 30 owner credits.
   * Pass the same hints as landing search (name + optional Apollo company id / domain).
   */
  async fetchCompanyEmployeesPreview(
    baseId: number,
    payload:
      | string
      | { name: string; company_id?: string | null; domain?: string | null }
  ) {
    const body =
      typeof payload === "string"
        ? { name: payload.trim() }
        : {
            name: payload.name.trim(),
            ...(payload.company_id != null && String(payload.company_id).trim() !== ""
              ? { company_id: String(payload.company_id).trim() }
              : {}),
            ...(payload.domain != null && String(payload.domain).trim() !== ""
              ? { domain: String(payload.domain).trim() }
              : {}),
          };
    return apiRequest<{
      company_name: string;
      company: CompanyPreviewRecord | null;
      employees: CompanyEmployeePreview[];
      /** Same array as `employees` — mirrors landing `employees_preview` field name. */
      employees_preview?: CompanyEmployeePreview[];
      credits_charged: number;
      credits_balance: number;
    }>(`/api/bases/${baseId}/company-employees-preview`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** Owner credit pool for a workspace (same as header wallet). */
  async getWorkspaceCreditsSummary(baseId: number) {
    return apiRequest<{
      credits_balance: number;
      monthly_lead_credits: number;
    }>(`/api/bases/${baseId}/workspace-credits?page=1&limit=1`);
  },

  async getLandingCompanySuggestions(query: string, limit: number = 10) {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });
    return apiRequest<{ companies: CompanyPreviewRecord[]; tries: CompanyPreviewTries }>(
      `/api/ai/company-preview/search?${params.toString()}`,
      { skipAuth: true }
    );
  },

  async getLandingCompanyDetails(paramsInput: { company_id?: string; domain?: string; name?: string }) {
    const params = new URLSearchParams();
    if (paramsInput.company_id) params.set("company_id", paramsInput.company_id);
    if (paramsInput.domain) params.set("domain", paramsInput.domain);
    if (paramsInput.name) params.set("name", paramsInput.name);
    return apiRequest<{
      company: CompanyPreviewRecord;
      employees_preview?: CompanyEmployeePreview[];
      tries: CompanyPreviewTries;
    }>(
      `/api/ai/company-preview/details?${params.toString()}`,
      { skipAuth: true }
    );
  },

  async updateLead(id: number, updates: any) {
    return apiRequest(`/api/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteLead(id: number, baseId: number) {
    return apiRequest(`/api/leads/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ base_id: baseId }),
    });
  },

  async bulkDeleteLeads(baseId: number, leadIds: number[]) {
    return apiRequest("/api/leads/bulk", {
      method: "DELETE",
      body: JSON.stringify({ base_id: baseId, lead_ids: leadIds }),
    });
  },

  async exportLeads(baseId: number) {
    return apiRequest(`/api/leads/export?base_id=${baseId}`);
  },

  // Bulk Operations
  async createBulkOperation(
    baseId: number,
    operationType: string,
    itemIds: number[],
    metadata?: any
  ) {
    return apiRequest("/api/bulk/operations", {
      method: "POST",
      body: JSON.stringify({
        base_id: baseId,
        operation_type: operationType,
        item_ids: itemIds,
        metadata,
      }),
    });
  },

  async getBulkOperationStatus(jobId: number) {
    return apiRequest(`/api/bulk/operations/${jobId}`);
  },

  async getBulkOperations(limit?: number) {
    const query = limit ? `?limit=${limit}` : "";
    return apiRequest(`/api/bulk/operations${query}`);
  },

  async cancelBulkOperation(jobId: number) {
    return apiRequest(`/api/bulk/operations/${jobId}`, { method: "DELETE" });
  },

  // Campaigns
  async getCampaigns(baseId: number) {
    return apiRequest(`/api/campaigns?base_id=${baseId}`);
  },

  async createCampaign(baseId: number, campaign: any) {
    return apiRequest("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ ...campaign, base_id: baseId }),
    });
  },

  async updateCampaign(id: number, updates: any) {
    return apiRequest(`/api/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteCampaign(id: number) {
    return apiRequest(`/api/campaigns/${id}`, { method: "DELETE" });
  },

  async startCampaign(id: number) {
    return apiRequest(`/api/campaigns/${id}/start`, { method: "POST" });
  },

  async pauseCampaign(id: number) {
    return apiRequest(`/api/campaigns/${id}/pause`, { method: "POST" });
  },

  async stopCampaign(id: number) {
    return apiRequest(`/api/campaigns/${id}/stop`, { method: "POST" });
  },

  // Notifications
  async getNotifications(limit?: number) {
    const query = limit ? `?limit=${limit}` : "";
    return apiRequest(`/api/notifications${query}`);
  },

  async markNotificationRead(id: number) {
    return apiRequest(`/api/notifications/${id}/read`, { method: "POST" });
  },

  async markAllNotificationsRead() {
    return apiRequest("/api/notifications/read-all", { method: "PATCH" });
  },
};

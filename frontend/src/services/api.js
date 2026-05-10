// ════════════════════════════════════════════════════════════════
// API SERVICE — connects to FastAPI backend
// ════════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const GET_CACHE_TTL_MS = 30_000;
const getResponseCache = new Map();
const inflightGetRequests = new Map();

function cloneData(data) {
  if (data == null) return data;
  if (typeof structuredClone === 'function') return structuredClone(data);
  return JSON.parse(JSON.stringify(data));
}

function toQueryString(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  return new URLSearchParams(clean).toString();
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token when available
  const token = localStorage.getItem('civiup_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.body instanceof FormData && config.headers['Content-Type']) {
    // Let the browser set multipart/form-data boundary.
    delete config.headers['Content-Type'];
  }

  const shouldCacheGet = method === 'GET' && !options.noCache;
  const cacheKey = shouldCacheGet ? `${url}::${token || 'anon'}` : null;

  if (shouldCacheGet && cacheKey) {
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cloneData(cached.value);
    }
    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) {
      const data = await inflight;
      return cloneData(data);
    }
  }

  const fetchAndParse = async () => {
    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new Error('Nu mă pot conecta la server. Verifică dacă backend-ul rulează pe portul 5000.');
    }

    // Handle non-OK responses
    if (!response.ok) {
      // Try to parse error body from backend
      const errorBody = await response.json().catch(() => ({ detail: `Eroare HTTP ${response.status}` }));
      let errorMessage = errorBody.detail || errorBody.message || `Eroare HTTP ${response.status}`;

      if (response.status >= 500) {
        errorMessage = 'Eroare internă de server (500). Backend-ul a răspuns cu eroare. Verifică logurile backend.';
      }

      if (response.status === 401) {
        // Only clear tokens and redirect if NOT on login/register pages
        // (i.e. this is a session expiry, not a bad login attempt)
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
        if (!isAuthPage) {
          localStorage.removeItem('civiup_token');
          localStorage.removeItem('civiup_refresh_token');
          localStorage.removeItem('civiup_user');
          window.location.href = '/login';
        }
        throw new Error(errorMessage);
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    return response.json();
  };

  if (!shouldCacheGet || !cacheKey) {
    return fetchAndParse();
  }

  const inflightPromise = fetchAndParse()
    .then((data) => {
      const ttl = typeof options.cacheTTL === 'number' ? options.cacheTTL : GET_CACHE_TTL_MS;
      getResponseCache.set(cacheKey, { value: cloneData(data), expiresAt: Date.now() + ttl });
      return data;
    })
    .finally(() => {
      inflightGetRequests.delete(cacheKey);
    });

  inflightGetRequests.set(cacheKey, inflightPromise);
  const resolved = await inflightPromise;
  return cloneData(resolved);
}

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  refresh: (refresh_token) =>
    request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
  me: () => request('/auth/me'),
};

// ── Users ────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => request('/users/'),
  getPeers: () => request('/users/peers'),
  getById: (id) => request(`/users/${id}`),
  update: (id, data) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  // Account requests (public — no auth needed)
  createAccountRequest: (data) =>
    request('/users/account-requests', { method: 'POST', body: JSON.stringify(data) }),
  getAccountRequests: () => request('/users/account-requests'),
  approveRequest: (id) =>
    request(`/users/account-requests/${id}/approve`, { method: 'PATCH' }),
  rejectRequest: (id, reason) =>
    request(`/users/account-requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejection_reason: reason }),
    }),
};

// ── Projects ─────────────────────────────────────────────────
export const projectsAPI = {
  getAll: (status) => request(`/projects/${status ? `?status=${status}` : ''}`),
  getById: (id) => request(`/projects/${id}`),
  create: (data) =>
    request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getStats: (id) => request(`/projects/${id}/stats`),
  addMember: (id, userId, role) =>
    request(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId, role }) }),
  removeMember: (id, userId) =>
    request(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
};

// ── Expenses ─────────────────────────────────────────────────
export const expensesAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/expenses/${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/expenses/${id}`),
  create: (data) =>
    request('/expenses/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approve: (id) => request(`/expenses/${id}/approve`, { method: 'PATCH' }),
  reject: (id, reason) =>
    request(`/expenses/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejection_reason: reason }) }),
  delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/expenses/upload-document', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },
  addProof: (id, proof_url) =>
    request(`/expenses/${id}/proof`, {
      method: 'PATCH',
      body: JSON.stringify({ proof_url }),
    }),
};

// ── Donations ────────────────────────────────────────────────
export const donationsAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/donations/${qs ? `?${qs}` : ''}`);
  },
  getSummary: () => request('/donations/summary'),
  getById: (id) => request(`/donations/${id}`),
  create: (data) =>
    request('/donations/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/donations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/donations/${id}`, { method: 'DELETE' }),
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/donations/upload-document', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },
  addProof: (id, proof_url) =>
    request(`/donations/${id}/proof`, {
      method: 'PATCH',
      body: JSON.stringify({ proof_url }),
    }),
};

// ── Tasks ────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/tasks/${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/tasks/${id}`),
  create: (data) =>
    request('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) =>
    request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};

// ── Calendar ─────────────────────────────────────────────────
export const calendarAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/calendar/${qs ? `?${qs}` : ''}`);
  },
  create: (data) =>
    request('/calendar/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/calendar/${id}`, { method: 'DELETE' }),
};

// ── Chat ─────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: () => request('/chat/conversations'),
  getMessages: (userId, beforeId, opts = {}) =>
    request(`/chat/messages/${userId}${beforeId ? `?before_id=${beforeId}` : ''}`, { noCache: !!opts.noCache }),
  sendMessage: (userId, content) =>
    request(`/chat/messages/${userId}`, { method: 'POST', body: JSON.stringify({ text: content }) }),
  markRead: (userId) =>
    request(`/chat/messages/${userId}/read`, { method: 'PATCH' }),
};

// ── Emails / CRM ─────────────────────────────────────────────
export const emailAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/emails/${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/emails/${id}`),
  create: (data) =>
    request('/emails/', { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (id, column) =>
    request(`/emails/${id}/column`, { method: 'PATCH', body: JSON.stringify({ kanban_column: column }) }),
  markRead: (id) =>
    request(`/emails/${id}/read`, { method: 'PATCH' }),
  toggleStar: (id) =>
    request(`/emails/${id}/star`, { method: 'PATCH' }),
  delete: (id) => request(`/emails/${id}`, { method: 'DELETE' }),
  // Templates
  getTemplates: () => request('/emails/templates'),
  createTemplate: (data) =>
    request('/emails/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) =>
    request(`/emails/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id) =>
    request(`/emails/templates/${id}`, { method: 'DELETE' }),
  // Campaigns
  sendCampaign: (data) =>
    request('/emails/send-campaign', { method: 'POST', body: JSON.stringify(data) }),
  previewRecipients: (data) =>
    request('/emails/preview-recipients', { method: 'POST', body: JSON.stringify(data) }),
  getCampaigns: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/emails/campaigns${qs ? `?${qs}` : ''}`);
  },
  getCampaign: (id) => request(`/emails/campaigns/${id}`),
  syncCampaignStats: (id) => request(`/emails/campaigns/${id}/sync-stats`),
  unsubscribe: (data) =>
    request('/emails/unsubscribe', { method: 'POST', body: JSON.stringify(data) }),
  getStats: () => request('/emails/stats'),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/emails/upload-image', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },
};

// ── Contacts ─────────────────────────────────────────────────
export const contactsAPI = {
  getAll: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/contacts/${qs ? `?${qs}` : ''}`);
  },
  create: (data) =>
    request('/contacts/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  importCSV: (file, source = 'import_csv', defaultTags = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    formData.append('default_tags', defaultTags);
    return request('/contacts/import-csv', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },
  getGroupCounts: () => request('/contacts/groups-count'),
};

// ── Social Media ─────────────────────────────────────────────
export const socialAPI = {
  getPosts: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/social/${qs ? `?${qs}` : ''}`);
  },
  getConnectionStatus: () => request('/social/connection-status', { noCache: true }),
  getAnalytics: () => request('/social/analytics'),
  createPost: (data) =>
    request('/social/', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) =>
    request(`/social/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => request(`/social/${id}`, { method: 'DELETE' }),
  generateAIText: (prompt, platform, tone) =>
    request('/social/generate-ai-text', {
      method: 'POST',
      body: JSON.stringify({ prompt, platform, tone }),
    }),
};

// ── AI Analysis ─────────────────────────────────────────────
export const aiAnalysisAPI = {
  analyze: (question) =>
    request('/ai-analysis', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};

// ── OCR ──────────────────────────────────────────────────────
export const ocrAPI = {
  process: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/ocr/process', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },
};

// ── Dashboard ────────────────────────────────────────────────
export const dashboardAPI = {
  getSummary: () => request('/dashboard/summary', { cacheTTL: 60_000 }),
  getFinancialMonthly: (year) => request(`/dashboard/financial-monthly?year=${year || new Date().getFullYear()}`, { cacheTTL: 120_000 }),
  getBeneficiariByProject: () => request('/dashboard/beneficiari-by-project', { cacheTTL: 120_000 }),
  getRecentActivity: (limit = 10) => request(`/dashboard/recent-activity?limit=${limit}`, { cacheTTL: 20_000 }),
};

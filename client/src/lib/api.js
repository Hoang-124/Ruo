/**
 * Ruo UEMS — Centralized API Bridge & HTTP Client
 * Features:
 * - Automatic Bearer JWT Injection
 * - Single-flight Refresh Token Queue on 401
 * - Standardized Error Handling
 * - Native fetch wrapper (no Axios bloat)
 */

const API_BASE = 'http://localhost:5000/api';

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

export const getStoredToken = () => localStorage.getItem('ruo_token');
export const getStoredRefreshToken = () => localStorage.getItem('ruo_refresh_token');

export const setStoredTokens = (token, refreshToken) => {
  if (token) localStorage.setItem('ruo_token', token);
  if (refreshToken) localStorage.setItem('ruo_refresh_token', refreshToken);
};

export const clearStoredTokens = () => {
  localStorage.removeItem('ruo_token');
  localStorage.removeItem('ruo_refresh_token');
  localStorage.removeItem('ruo_role');
  localStorage.removeItem('ruo_is_logged_in');
  window.dispatchEvent(new CustomEvent('ruo:session-expired'));
};

/**
 * Core fetch wrapper with auto-retry and single-flight token refresh
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getStoredToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    let response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const storedRefreshToken = getStoredRefreshToken();

      if (!storedRefreshToken) {
        clearStoredTokens();
        throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      }

      if (isRefreshing) {
        // Another request is currently refreshing the token; queue this request
        const newToken = await new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
          });

          const refreshData = await refreshRes.json();

          if (!refreshRes.ok || !refreshData.success) {
            clearStoredTokens();
            processQueue(new Error('Phiên làm việc hết hạn'), null);
            throw new Error(refreshData.message || 'Phiên làm việc đã hết hạn.');
          }

          const newToken = refreshData.token;
          const newRefreshToken = refreshData.refreshToken;
          setStoredTokens(newToken, newRefreshToken);

          processQueue(null, newToken);

          // Retry the original request with new token
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers });
        } catch (refreshErr) {
          clearStoredTokens();
          processQueue(refreshErr, null);
          throw refreshErr;
        } finally {
          isRefreshing = false;
        }
      }
    }

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || `Lỗi yêu cầu máy chủ: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng kiểm tra lại dịch vụ server.');
    }
    throw error;
  }
}

// HTTP Helper Methods
export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return apiRequest(`${endpoint}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  post: (endpoint, body) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  put: (endpoint, body) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};

// ==========================================
// Specialized Domain APIs
// ==========================================

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  profile: () => api.get('/auth/me'),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword })
};

export const equipmentApi = {
  list: (params) => api.get('/equipments', params),
  getById: (id) => api.get(`/equipments/${id}`),
  getByCode: (code) => api.get(`/equipments/code/${code}`),
  getByQr: (qrCode) => api.get(`/equipments/qr/${qrCode}`),
  create: (data) => api.post('/equipments', data),
  update: (id, data) => api.put(`/equipments/${id}`, data),
  delete: (id) => api.delete(`/equipments/${id}`)
};

export const facilityApi = {
  getBuildings: () => api.get('/facilities/buildings'),
  getCadCanvas: (buildingCode, floorNumber) => api.get('/facilities/cad-canvas', { buildingCode, floorNumber }),
  getRoomByCode: (code) => api.get(`/facilities/rooms/${code}`)
};

export const transferApi = {
  list: (params) => api.get('/transfers', params),
  propose: (data) => api.post('/transfers', data),
  approve: (id) => api.put(`/transfers/${id}/approve`, {}),
  reject: (id, reason) => api.put(`/transfers/${id}/reject`, { reason }),
  complete: (id) => api.put(`/transfers/${id}/complete`, {})
};

export const repairApi = {
  list: (params) => api.get('/repairs', params),
  getById: (id) => api.get(`/repairs/${id}`),
  create: (data) => api.post('/repairs', data),
  updateStatus: (id, status, notes) => api.put(`/repairs/${id}/status`, { status, notes }),
  addLog: (id, data) => api.post(`/repairs/${id}/logs`, data),
  requestParts: (id, data) => api.post(`/repairs/${id}/parts-requests`, data),
  approveParts: (repairId, requestId) => api.put(`/repairs/${repairId}/parts-requests/${requestId}/approve`, {})
};

export const disposalApi = {
  list: () => api.get('/disposals'),
  propose: (data) => api.post('/disposals', data),
  hcApprove: (id) => api.put(`/disposals/${id}/hc-approve`, {}),
  bghApprove: (id, decision_number) => api.put(`/disposals/${id}/bgh-approve`, { decision_number }),
  procure: (id, procurement_plan) => api.put(`/disposals/${id}/procurement`, { procurement_plan }),
  receipt: (id, replacement_equipment_id) => api.put(`/disposals/${id}/receipt`, { replacement_equipment_id }),
  reject: (id, reject_reason) => api.put(`/disposals/${id}/reject`, { reject_reason })
};

export const maintenanceApi = {
  getPlans: () => api.get('/maintenance/plans'),
  createPlan: (data) => api.post('/maintenance/plans', data),
  getLogs: () => api.get('/maintenance/logs'),
  executeChecklist: (data) => api.post('/maintenance/logs', data)
};

export const inventoryApi = {
  getSessions: () => api.get('/inventory/sessions'),
  createSession: (data) => api.post('/inventory/sessions', data),
  getSessionById: (id) => api.get(`/inventory/sessions/${id}`),
  scanInRoom: (sessionId, data) => api.post(`/inventory/sessions/${sessionId}/scan`, data),
  reconcile: (sessionId) => api.put(`/inventory/sessions/${sessionId}/reconcile`, {})
};

export const auditApi = {
  getLogs: (params) => api.get('/audit/logs', params),
  verifyChain: () => api.get('/audit/verify-chain')
};

export default api;

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
  patch: (endpoint, body) => apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};

// ==========================================
// Specialized Domain APIs
// ==========================================

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  register: (userData) => api.post('/auth/register', userData),
  verifyRegisterOtp: (email, otp) => api.post('/auth/verify-register-otp', { email, otp }),
  checkDuplicate: (params) => api.get('/auth/check-duplicate', params),
  profile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: (refreshToken, allDevices = false) => api.post('/auth/logout', { refreshToken, allDevices }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetOtp: (email, otp) => api.post('/auth/verify-reset-otp', { email, otp }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword }),
  // Admin User Management
  listUsers: (params) => api.get('/auth/users', params),
  getUserById: (id) => api.get(`/auth/users/${id}`),
  createUser: (data) => api.post('/auth/users', data),
  updateUserRole: (id, role) => api.patch(`/auth/users/${id}/role`, { role }),
  toggleUserLock: (id) => api.patch(`/auth/users/${id}/lock`),
  adminResetPassword: (id, password) => api.post(`/auth/users/${id}/reset-password`, { password }),
  approveUser: (id, data) => api.post(`/auth/users/${id}/approve`, data)
};

export const equipmentApi = {
  list: (params) => api.get('/equipments', params),
  getById: (id) => api.get(`/equipments/${id}`),
  getByCode: (code) => api.get(`/equipments/code/${code}`),
  getByQr: (qrCode) => api.get(`/equipments/qr/${qrCode}`),
  create: (data) => api.post('/equipments', data),
  update: (id, data) => api.put(`/equipments/${id}`, data),
  updateWarranty: (id, data) => api.put(`/equipments/${id}/warranty`, data),
  delete: (id) => api.delete(`/equipments/${id}`)
};

export const facilityApi = {
  getBuildings: () => api.get('/facilities/buildings'),
  getCadCanvas: (buildingCode, floorNumber) => api.get('/facilities/cad-canvas', { buildingCode, floorNumber }),
  getRoomByCode: (code) => api.get(`/facilities/rooms/${code}`),
  getAllRooms: (params) => api.get('/facilities/rooms', params),
  getRoomShortage: (id) => api.get(`/facilities/rooms/${id}/shortage`),
  getWarehouseStock: () => api.get('/facilities/warehouse/stock')
};

export const movementApi = {
  list: (params) => api.get('/movements', params),
  order: (data) => api.post('/movements', data),
  confirm: (id, notes) => api.put(`/movements/${id}/confirm`, { notes }),
  cancel: (id, reason) => api.put(`/movements/${id}/cancel`, { reason }),
  getPendingCount: () => api.get('/movements/pending-count')
};

export const repairApi = {
  list: async (params) => {
    const res = await api.get('/repairs', params);
    if (res && res.data && !res.repairs) res.repairs = res.data;
    return res;
  },
  getById: async (id) => {
    const res = await api.get(`/repairs/${id}`);
    if (res && res.data && !res.repair) res.repair = res.data;
    return res;
  },
  create: (data) => api.post('/repairs', data),
  assign: (id, data) => api.put(`/repairs/${id}/assign`, data),
  accept: (id) => api.put(`/repairs/${id}/accept`),
  addLog: (id, data) => api.post(`/repairs/${id}/logs`, data),
  reportOutcome: (id, data) => api.put(`/repairs/${id}/outcome`, data),
  closeTicket: (id, data) => api.put(`/repairs/${id}/close`, data),
  evaluate: (id, data) => api.post(`/repairs/${id}/evaluate`, data),
  rateFeedback: (id, data) => api.post(`/repairs/${id}/evaluate`, {
    feedback_rating: data.rating || data.feedback_rating,
    feedback_comment: data.comment || data.feedback_comment || ''
  })
};

export const sparePartApi = {
  list: (params) => api.get('/spare-parts', params),
  getRequests: (params) => api.get('/parts-requests', params),
  createRequest: (data) => api.post('/parts-requests', data),
  approveRequest: (id) => api.put(`/parts-requests/${id}/approve`),
  rejectRequest: (id, reason) => api.put(`/parts-requests/${id}/reject`, { reason }),
  updateStock: (id, stock) => api.put(`/spare-parts/${id}/stock`, { stock })
};

export const disposalApi = {
  list: () => api.get('/disposals'),
  propose: (data) => api.post('/disposals', data),
  approve: (id, decision_number, recovery_value) => api.put(`/disposals/${id}/approve`, { decision_number, recovery_value }),
  reject: (id, reject_reason) => api.put(`/disposals/${id}/reject`, { reject_reason })
};

export const inventoryApi = {
  getSessions: () => api.get('/inventory/sessions'),
  createSession: (data) => api.post('/inventory/sessions', data),
  getSessionById: (id) => api.get(`/inventory/sessions/${id}`),
  scanInRoom: (sessionId, data) => api.post(`/inventory/sessions/${sessionId}/scan`, data),
  reconcile: (sessionId) => api.put(`/inventory/sessions/${sessionId}/reconcile`, {})
};

export const masterDataApi = {
  getCategories: () => api.get('/master/categories'),
  createCategory: (data) => api.post('/master/categories', data),
  getSuppliers: () => api.get('/master/suppliers'),
  createSupplier: (data) => api.post('/master/suppliers', data),
  getRepairUnits: () => api.get('/master/repair-units'),
  createRepairUnit: (data) => api.post('/master/repair-units', data),
  getRooms: (params) => api.get('/master/rooms', params),
  createRoom: (data) => api.post('/master/rooms', data),
  getRoomShortage: (id) => api.get(`/master/rooms/${id}/shortage`),
  getWarehouseStock: () => api.get('/master/warehouse/stock')
};

export const roleApi = {
  list: () => api.get('/roles'),
  update: (name, permissions) => api.put(`/roles/${name}`, { permissions }),
  batchUpdate: (roles) => api.post('/roles/batch-update', { roles }),
  resetDefaults: () => api.post('/roles/reset-defaults', {})
};

export const reportApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getEquipmentHealth: () => api.get('/reports/equipment-health'),
  getRepairCosts: () => api.get('/reports/repair-costs'),
  exportCsv: (type) => `${API_BASE}/reports/export?type=${type}`
};

export const auditApi = {
  getLogs: (params) => api.get('/audit/logs', params),
  verifyChain: () => api.get('/audit/verify-chain'),
  exportCsv: () => `${API_BASE}/audit/export`
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read')
};

// Backward compatibility alias for transferApi
export const transferApi = movementApi;

export default api;

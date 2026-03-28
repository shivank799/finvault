import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

// ── Main API instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── Token refresh queue (prevents parallel refreshes) ──────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
}

// ── Request interceptor: attach access token ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fv_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Request-ID'] = crypto.randomUUID?.() || Date.now().toString(36);
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      const refreshToken = localStorage.getItem('fv_refresh_token');
      if (!refreshToken) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('fv_access_token',  accessToken);
        localStorage.setItem('fv_refresh_token', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuth() {
  localStorage.removeItem('fv_access_token');
  localStorage.removeItem('fv_refresh_token');
  localStorage.removeItem('fv_user');
}

// ── Typed API methods ─────────────────────────────────────────
export const authAPI = {
  register: (data)       => api.post('/auth/register', data),
  login:    (data)       => api.post('/auth/login', data),
  logout:   ()           => api.post('/auth/logout'),
  refresh:  (token)      => api.post('/auth/refresh', { refreshToken: token }),
  me:       ()           => api.get('/auth/me'),
};

export const transactionsAPI = {
  getAll:  (params)      => api.get('/transactions', { params }),
  getOne:  (id)          => api.get(`/transactions/${id}`),
  create:  (data)        => api.post('/transactions', data),
  update:  (id, data)    => api.put(`/transactions/${id}`, data),
  delete:  (id)          => api.delete(`/transactions/${id}`),
  bulk:    (data)        => api.post('/transactions/bulk', data),
};

export const dashboardAPI = {
  summary:       ()      => api.get('/dashboard/summary'),
  budgetStatus:  ()      => api.get('/dashboard/budgets-status'),
};

export const budgetsAPI = {
  getAll:  ()            => api.get('/budgets'),
  update:  (cat, data)   => api.put(`/budgets/${cat}`, data),
};

export const goalsAPI = {
  getAll:      ()        => api.get('/goals'),
  create:      (data)    => api.post('/goals', data),
  contribute:  (id, amt) => api.patch(`/goals/${id}/contribute`, { amount: amt }),
  delete:      (id)      => api.delete(`/goals/${id}`),
};

export const reportsAPI = {
  monthly:  (y, m)       => api.get(`/reports/monthly/${y}/${m}`),
  yearly:   (y)          => api.get(`/reports/yearly/${y}`),
  exportCSV:(params)     => api.get('/reports/export/csv', { params, responseType: 'blob' }),
};

export const usersAPI = {
  getProfile:   ()       => api.get('/users/profile'),
  updateProfile:(data)   => api.patch('/users/profile', data),
  changePassword:(data)  => api.patch('/users/password', data),
};

export { clearAuth };
export default api;

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const ticketApi = {
  list: (params?: Record<string, any>) => api.get('/tickets', { params }),
  create: (data: {
    title: string;
    description: string;
    category: string;
    priority?: string;
    tagIds?: number[];
  }) => api.post('/tickets', data),
  detail: (id: number) => api.get(`/tickets/${id}`),
  assign: (id: number, agentId: number) => api.post(`/tickets/${id}/assign`, { agentId }),
  updateStatus: (id: number, status: string) => api.put(`/tickets/${id}/status`, { status }),
  reply: (id: number, content: string, isInternal = false) =>
    api.post(`/tickets/${id}/messages`, { content, isInternal }),
  transfer: (id: number, agentId: number) => api.post(`/tickets/${id}/transfer`, { agentId }),
  merge: (id: number, targetTicketId: number) =>
    api.post(`/tickets/${id}/merge`, { targetTicketId }),
  rate: (id: number, rating: number, comment?: string) =>
    api.post(`/tickets/${id}/rate`, { rating, comment }),
  notifications: (unread = false) => api.get('/tickets/notifications/list', { params: { unread } }),
  markNotificationRead: (id: number) => api.post(`/tickets/notifications/${id}/read`),
  markAllRead: () => api.post('/tickets/notifications/read-all'),
};

export const adminApi = {
  teams: () => api.get('/admin/teams'),
  agents: (params?: Record<string, any>) => api.get('/admin/agents', { params }),
  updateAgentStatus: (status: string) => api.put('/admin/agents/status', { status }),
  createAgent: (data: { email: string; password: string; name: string; teamId?: number }) =>
    api.post('/admin/agents', data),
  tags: () => api.get('/admin/tags'),
};

export default api;

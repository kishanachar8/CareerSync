import api from './axiosInstance.js';

const API = '/gmail';

export const gmailApi = {
  getStatus:  ()     => api.get(`${API}/status`),
  getAuthUrl: ()     => api.get(`${API}/auth-url`),
  sync:       ()     => api.post(`${API}/sync`),
  disconnect: ()     => api.delete(`${API}/disconnect`),
};

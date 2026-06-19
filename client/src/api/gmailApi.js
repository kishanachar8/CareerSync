import axios from 'axios';

const API = '/api/v1/gmail';

export const gmailApi = {
  getStatus:  ()     => axios.get(`${API}/status`),
  getAuthUrl: ()     => axios.get(`${API}/auth-url`),
  sync:       ()     => axios.post(`${API}/sync`),
  disconnect: ()     => axios.delete(`${API}/disconnect`),
};

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export function setAuthToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export default api;

export function clearAuthToken() {
  delete api.defaults.headers.common.Authorization;
}

// Ensure Authorization header is added to every request from the client-side
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      // @ts-ignore
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

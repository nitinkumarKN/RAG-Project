import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://rag-project-back.onrender.com/api' : 'http://localhost:5000/api');
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';

export function resolveApiUrl(resourceUrl) {
  if (/^https?:\/\//i.test(resourceUrl)) {
    return resourceUrl;
  }

  return `${apiBaseUrl.replace(/\/api$/, '')}${resourceUrl.startsWith('/') ? resourceUrl : `/${resourceUrl}`}`;
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
import axios from 'axios';

const API = axios.create({
  baseURL: window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('tvs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tvs_token');
      localStorage.removeItem('tvs_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;

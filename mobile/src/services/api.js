import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
});

// Enviar el token automáticamente en cada petición
API.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

// Si el token expiró o ya no es válido, cerrar la sesión
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');

      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default API;
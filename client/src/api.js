import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export const errMsg = (e) => e.response?.data?.message || 'Something went wrong. Check your connection and try again.';
export default api;

import api from './api';

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/user/profile');
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.put('/user/profile', payload);
  return data;
}

export async function forgotPassword(payload) {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
}

export async function resetPassword(token, payload) {
  const { data } = await api.post(`/auth/reset-password/${token}`, payload);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/user/account');
  return data;
}
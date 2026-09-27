import api from './api';

export async function listWorkspaces() {
  const { data } = await api.get('/workspace');
  return data;
}

export async function createWorkspace(payload) {
  const { data } = await api.post('/workspace', payload);
  return data;
}

export async function getWorkspace(id) {
  const { data } = await api.get(`/workspace/${id}`);
  return data;
}

export async function updateWorkspace(id, payload) {
  const { data } = await api.put(`/workspace/${id}`, payload);
  return data;
}

export async function addWorkspaceMember(id, payload) {
  const { data } = await api.post(`/workspace/${id}/members`, payload);
  return data;
}

export async function deleteWorkspace(id) {
  const { data } = await api.delete(`/workspace/${id}`);
  return data;
}
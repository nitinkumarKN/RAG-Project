import api from './api';

export async function sendChatMessage(payload) {
  const { data } = await api.post('/chat', payload);
  return data;
}

export async function getChatHistory(workspaceId) {
  const { data } = await api.get('/chat/history', {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return data;
}

export async function clearChatHistory(workspaceId) {
  const { data } = await api.delete('/chat/history', {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return data;
}
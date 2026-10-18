import api from './api';

export async function sendChatMessage(payload) {
  try {
    const { data } = await api.post('/chat', payload);
    return data;
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    const fallbackApi = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const { data } = await api.post(`${fallbackApi}/chat`, payload);
    return data;
  }
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
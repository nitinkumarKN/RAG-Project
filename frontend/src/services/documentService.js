import api from './api';

export async function uploadDocument(formData, onUploadProgress) {
  const { data } = await api.post('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
}

export async function listDocuments(workspaceId) {
  const { data } = await api.get('/document', {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return data;
}

export async function deleteDocument(id) {
  const { data } = await api.delete(`/document/${id}`);
  return data;
}
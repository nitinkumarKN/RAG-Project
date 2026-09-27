import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, login as loginRequest, register as registerRequest, updateProfile as updateProfileRequest } from '../services/authService';
import { listWorkspaces } from '../services/workspaceService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => localStorage.getItem('selected_workspace_id') || '');
  const [loading, setLoading] = useState(true);

  async function loadWorkspaceState() {
    const data = await listWorkspaces();
    const nextWorkspaces = data.workspaces || [];
    setWorkspaces(nextWorkspaces);

    if (!selectedWorkspaceId && nextWorkspaces.length) {
      const firstWorkspaceId = nextWorkspaces[0].id;
      setSelectedWorkspaceId(firstWorkspaceId);
      localStorage.setItem('selected_workspace_id', firstWorkspaceId);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([getProfile(), listWorkspaces()])
      .then(([profileData, workspaceData]) => {
        setUser(profileData.user);
        const nextWorkspaces = workspaceData.workspaces || [];
        setWorkspaces(nextWorkspaces);

        const defaultWorkspaceId = profileData.user?.defaultWorkspace || nextWorkspaces[0]?.id || '';
        if (defaultWorkspaceId) {
          setSelectedWorkspaceId(defaultWorkspaceId);
          localStorage.setItem('selected_workspace_id', defaultWorkspaceId);
        }
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
        setWorkspaces([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    const data = await loginRequest(payload);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  }

  async function register(payload) {
    const data = await registerRequest(payload);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  }

  async function refreshProfile() {
    const data = await getProfile();
    setUser(data.user);
    return data.user;
  }

  async function updateProfile(payload) {
    const data = await updateProfileRequest(payload);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('selected_workspace_id');
    setUser(null);
    setWorkspaces([]);
    setSelectedWorkspaceId('');
  }

  function selectWorkspace(workspaceId) {
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem('selected_workspace_id', workspaceId);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      workspaces,
      selectedWorkspaceId,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      selectWorkspace,
      reloadWorkspaces: loadWorkspaceState,
    }),
    [user, loading, workspaces, selectedWorkspaceId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
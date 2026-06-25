const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('nexus_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth REST routes
  register: async (email, password, name) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profile fetch failed');
    return data;
  },

  updateProfile: async (name, email) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profile update failed');
    return data;
  },

  // Folders REST routes
  getFolders: async () => {
    const res = await fetch(`${API_BASE}/folders`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve folders');
    return res.json();
  },

  createFolder: async (name, parentId = null) => {
    const res = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, parentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create folder');
    return data;
  },

  deleteFolder: async (id) => {
    const res = await fetch(`${API_BASE}/folders/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete folder');
    return res.json();
  },

  // Files REST routes
  getFiles: async (folderId = null, starred = false, search = '') => {
    let url = `${API_BASE}/files?`;
    if (folderId) url += `folderId=${folderId}&`;
    if (starred) url += `starred=true&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch files list');
    return res.json();
  },

  createFile: async (name, type, folderId = null) => {
    const res = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, folderId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create file');
    return data;
  },

  getFileDetail: async (id) => {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to retrieve file details');
    return data;
  },

  updateFile: async (id, payload) => {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update file');
    return data;
  },

  duplicateFile: async (id) => {
    const res = await fetch(`${API_BASE}/files/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate file');
    return data;
  },

  deleteFile: async (id) => {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return res.json();
  },

  starFile: async (id) => {
    const res = await fetch(`${API_BASE}/files/${id}/star`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to star/unstar file');
    return data;
  },

  inviteCollaborator: async (fileId, email, role = 'viewer') => {
    const res = await fetch(`${API_BASE}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to grant sharing permission');
    return data;
  },

  // Comments REST routes
  getComments: async (fileId) => {
    const res = await fetch(`${API_BASE}/files/${fileId}/comments`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },

  postComment: async (fileId, text) => {
    const res = await fetch(`${API_BASE}/files/${fileId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post comment');
    return data;
  },

  resolveComment: async (commentId) => {
    const res = await fetch(`${API_BASE}/comments/${commentId}/resolve`, {
      method: 'PUT',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resolve comment');
    return data;
  }
};

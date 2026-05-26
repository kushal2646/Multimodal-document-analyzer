import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically inject JWT Bearer Token into headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authService = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/token', formData);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  register: async (fullName, email, password) => {
    const response = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password
    });
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
  }
};

export const documentService = {
  upload: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },
  
  list: async () => {
    const response = await api.get('/documents');
    return response.data;
  },
  
  get: async (docId) => {
    const response = await api.get(`/documents/${docId}`);
    return response.data;
  },
  
  delete: async (docId) => {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  }
};

export const chatService = {
  ask: async (docId, message) => {
    const response = await api.post(`/chat/${docId}`, { message });
    return response.data;
  },
  
  getHistory: async (docId) => {
    const response = await api.get(`/chat/${docId}/history`);
    return response.data;
  }
};

export const insightService = {
  analyzeResume: async (docId, jobDescription) => {
    const response = await api.post('/insights/resume', {
      doc_id: docId,
      job_description: jobDescription
    });
    return response.data;
  },
  
  getFakeCheck: async (docId) => {
    const response = await api.get(`/insights/fake-check/${docId}`);
    return response.data;
  },
  
  getRisks: async (docId) => {
    const response = await api.get(`/insights/risks/${docId}`);
    return response.data;
  }
};

export const analyticsService = {
  getMetrics: async () => {
    const response = await api.get('/analytics/metrics');
    return response.data;
  },
  
  getReportUrl: (docId) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/analytics/report/${docId}?token=${token}`;
  }
};

export default api;

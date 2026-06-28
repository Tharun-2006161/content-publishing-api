import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
if (API_URL) {
    if (!API_URL.startsWith('http')) {
        API_URL = 'https://' + API_URL;
    }
    if (!API_URL.includes('localhost') && !API_URL.includes('onrender.com')) {
        API_URL = API_URL + '.onrender.com';
    }
}

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('cms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('cms_token');
            localStorage.removeItem('cms_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// Auth
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// Posts (author)
export const postsAPI = {
    list: (params) => api.get('/posts', { params }),
    get: (id) => api.get(`/posts/${id}`),
    create: (data) => api.post('/posts', data),
    update: (id, data) => api.put(`/posts/${id}`, data),
    delete: (id) => api.delete(`/posts/${id}`),
    publish: (id) => api.post(`/posts/${id}/publish`),
    schedule: (id, scheduled_for) => api.post(`/posts/${id}/schedule`, { scheduled_for }),
    revisions: (id) => api.get(`/posts/${id}/revisions`),
};

// Public
export const publicAPI = {
    list: (params) => api.get('/posts/published', { params }),
    get: (id) => api.get(`/posts/published/${id}`),
    search: (q, params) => api.get('/search', { params: { q, ...params } }),
};

// Media
export const mediaAPI = {
    upload: (file) => {
        const form = new FormData();
        form.append('file', file);
        return api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
};

export default api;

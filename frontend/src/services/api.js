import axios from 'axios';

// Use relative URL - CRA proxy forwards /api requests to backend
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Exercise API calls
export const exerciseAPI = {
  createExercise: (exerciseData) => api.post('/exercises', exerciseData),
  getMyExercises: () => api.get('/exercises/my'),
  getExercise: (id) => api.get(`/exercises/${id}`),
  updateExercise: (id, data) => api.put(`/exercises/${id}`, data),
  addInject: (exerciseId, injectData) => 
    api.post(`/exercises/${exerciseId}/injects`, injectData),
  updateInject: (exerciseId, injectNumber, data) =>
    api.put(`/exercises/${exerciseId}/injects/${injectNumber}`, data),
  deleteInject: (exerciseId, injectNumber) =>
    api.delete(`/exercises/${exerciseId}/injects/${injectNumber}`),
  releaseInject: (exerciseId, data) =>
    api.post(`/exercises/${exerciseId}/release-inject`, data),
  toggleResponses: (exerciseId, data) =>
    api.post(`/exercises/${exerciseId}/toggle-responses`, data),
  togglePhaseProgression: (exerciseId, data) =>
    api.post(`/exercises/${exerciseId}/toggle-phase-lock`, data),
  getParticipants: (exerciseId) =>
    api.get(`/exercises/${exerciseId}/participants`),
  getScores: (exerciseId) => api.get(`/exercises/${exerciseId}/scores`),
  deleteExercise: (id) => api.delete(`/exercises/${id}`),
  resetExercise: (id) => api.post(`/exercises/${id}/reset`),
  resetInject: (exerciseId, data) => api.post(`/exercises/${exerciseId}/reset-inject`, data),
  getSummary: (exerciseId) => api.get(`/exercises/${exerciseId}/summary`),
  updateSummary: (exerciseId, summary) => api.put(`/exercises/${exerciseId}/summary`, { summary })
};

// Participant API calls
export const participantAPI = {
  joinExercise: (data) => api.post('/participants/join', data),
  getExerciseData: (exerciseId, participantId) =>
    api.post(`/participants/exercise/${exerciseId}`, { participantId }),
  submitResponse: (data) => api.post('/participants/submit-response', data),
  nextPhase: (data) => api.post('/participants/next-phase', data),
  updateParticipantStatus: (participantId, status) =>
    api.put(`/participants/${participantId}/status`, { status }),
  deleteParticipant: (participantId) =>
    api.delete(`/participants/${participantId}`),
  deleteAllParticipants: (exerciseId) =>
    api.delete(`/participants/all/${exerciseId}`)
};

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me')
};

export default api;
import type {
  Lesson,
  GroupLesson,
  BoardRental,
  SunbedRental,
  Instructor,
  Student,
  Agent,
  AgentCommission,
  Payment,
  Settings,
  LoginResponse,
  User,
} from '../types';

// ── Base Request Helper ────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('surfdesk-token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string>) },
  });
  if (res.status === 401) {
    // Avoid hard page reloads on unauthorized responses.
    // Notify auth context so routing can happen through React.
    const currentPath = window.location.pathname;
    const isLoginRequest = url === '/auth/login';
    if (!isLoginRequest && currentPath !== '/login') {
      localStorage.removeItem('surfdesk-token');
      localStorage.removeItem('surfdesk-user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Typed API Functions ────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<User>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    getUsers: () => request<User[]>('/auth/users'),
    createUser: (data: {
      username: string;
      password: string;
      displayName: string;
      role?: string;
      allowedTabs?: string[];
    }) =>
      request<User>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: Partial<User & { password?: string }>) =>
      request<User>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id: string) =>
      request<{ message: string }>(`/auth/users/${id}`, { method: 'DELETE' }),
  },

  // Lessons
  lessons: {
    getAll: () => request<Lesson[]>('/lessons'),
    create: (data: Omit<Lesson, 'id'>) =>
      request<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Lesson) =>
      request<Lesson>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/lessons/${id}`, { method: 'DELETE' }),
    addPayment: (id: string, payment: Payment) =>
      request<Lesson>(`/lessons/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
    addInstructorPayment: (id: string, instIdx: number, payment: Payment) =>
      request<Lesson>(`/lessons/${id}/instructor-payments/${instIdx}`, { method: 'POST', body: JSON.stringify(payment) }),
    updateStatus: (id: string, status: string) =>
      request<Lesson>(`/lessons/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  // Group Lessons
  groupLessons: {
    getAll: () => request<GroupLesson[]>('/group-lessons'),
    create: (data: Omit<GroupLesson, 'id'>) =>
      request<GroupLesson>('/group-lessons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: GroupLesson) =>
      request<GroupLesson>(`/group-lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/group-lessons/${id}`, { method: 'DELETE' }),
    addParticipant: (id: string, participant: any) =>
      request<GroupLesson>(`/group-lessons/${id}/participants`, { method: 'POST', body: JSON.stringify(participant) }),
    removeParticipant: (id: string, participantId: string) =>
      request<GroupLesson>(`/group-lessons/${id}/participants/${participantId}`, { method: 'DELETE' }),
    addParticipantPayment: (id: string, participantId: string, payment: Payment) =>
      request<GroupLesson>(`/group-lessons/${id}/participants/${participantId}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
    addInstructorPayment: (id: string, instIdx: number, payment: Payment) =>
      request<GroupLesson>(`/group-lessons/${id}/instructor-payments/${instIdx}`, { method: 'POST', body: JSON.stringify(payment) }),
    updateStatus: (id: string, status: string) =>
      request<GroupLesson>(`/group-lessons/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  // Board Rentals
  boardRentals: {
    getAll: () => request<BoardRental[]>('/board-rentals'),
    create: (data: Omit<BoardRental, 'id'>) =>
      request<BoardRental>('/board-rentals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: BoardRental) =>
      request<BoardRental>(`/board-rentals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/board-rentals/${id}`, { method: 'DELETE' }),
    addPayment: (id: string, payment: Payment) =>
      request<BoardRental>(`/board-rentals/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
    markReturned: (id: string) =>
      request<BoardRental>(`/board-rentals/${id}/return`, { method: 'PUT' }),
  },

  // Sunbed Rentals
  sunbedRentals: {
    getAll: () => request<SunbedRental[]>('/sunbed-rentals'),
    create: (data: Omit<SunbedRental, 'id'>) =>
      request<SunbedRental>('/sunbed-rentals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: SunbedRental) =>
      request<SunbedRental>(`/sunbed-rentals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/sunbed-rentals/${id}`, { method: 'DELETE' }),
    addPayment: (id: string, payment: Payment) =>
      request<SunbedRental>(`/sunbed-rentals/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
    markReturned: (id: string) =>
      request<SunbedRental>(`/sunbed-rentals/${id}/return`, { method: 'PUT' }),
  },

  // Instructors
  instructors: {
    getAll: () => request<Instructor[]>('/instructors'),
    create: (data: Omit<Instructor, 'id'>) =>
      request<Instructor>('/instructors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Instructor) =>
      request<Instructor>(`/instructors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/instructors/${id}`, { method: 'DELETE' }),
  },

  // Students
  students: {
    getAll: () => request<Student[]>('/students'),
    create: (data: Omit<Student, 'id'>) =>
      request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Student) =>
      request<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/students/${id}`, { method: 'DELETE' }),
  },

  // Agents
  agents: {
    getAll: () => request<Agent[]>('/agents'),
    create: (data: Omit<Agent, 'id'>) =>
      request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Agent) =>
      request<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/agents/${id}`, { method: 'DELETE' }),
  },

  // Agent Commissions
  agentCommissions: {
    getAll: () => request<AgentCommission[]>('/agent-commissions'),
    create: (data: Omit<AgentCommission, 'id'>) =>
      request<AgentCommission>('/agent-commissions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: AgentCommission) =>
      request<AgentCommission>(`/agent-commissions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/agent-commissions/${id}`, { method: 'DELETE' }),
    addPayment: (id: string, payment: Payment) =>
      request<AgentCommission>(`/agent-commissions/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
  },

  // Settings
  settings: {
    get: () => request<Settings>('/settings'),
    update: (data: Partial<Settings>) =>
      request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Seed / Reset
  seed: () => request('/seed', { method: 'POST' }),
  reset: () => request('/seed/reset', { method: 'POST' }),

  // Health
  health: () => request<{ status: string }>('/health'),
};

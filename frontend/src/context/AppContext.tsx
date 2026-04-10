import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, Lesson, GroupLesson, BoardRental, SunbedRental, Instructor, Student, Agent, AgentCommission } from '../types';
import { api } from '../services/api';

// ── Empty State ─────────────────────────────────────────────

const EMPTY_STATE: AppState = {
  lessons: [],
  groupLessons: [],
  boardRentals: [],
  sunbedRentals: [],
  instructors: [],
  students: [],
  agents: [],
  agentCommissions: [],
  revenues: [],
  schoolName: '',
  schoolPhone: '',
  schoolEmail: '',
  schoolAddress: '',
};

// ── Context Actions (API-first) ──────────────────────���──────

interface AppActions {
  // Lessons
  addLesson: (data: Omit<Lesson, 'id'>) => Promise<Lesson>;
  updateLesson: (id: string, data: Lesson) => Promise<Lesson>;
  deleteLesson: (id: string) => Promise<void>;

  // Group Lessons
  addGroupLesson: (data: Omit<GroupLesson, 'id'>) => Promise<GroupLesson>;
  updateGroupLesson: (id: string, data: GroupLesson) => Promise<GroupLesson>;
  deleteGroupLesson: (id: string) => Promise<void>;

  // Board Rentals
  addBoardRental: (data: Omit<BoardRental, 'id'>) => Promise<BoardRental>;
  updateBoardRental: (id: string, data: BoardRental) => Promise<BoardRental>;
  deleteBoardRental: (id: string) => Promise<void>;

  // Sunbed Rentals
  addSunbedRental: (data: Omit<SunbedRental, 'id'>) => Promise<SunbedRental>;
  updateSunbedRental: (id: string, data: SunbedRental) => Promise<SunbedRental>;
  deleteSunbedRental: (id: string) => Promise<void>;

  // Instructors
  addInstructor: (data: Omit<Instructor, 'id'>) => Promise<Instructor>;
  updateInstructor: (id: string, data: Instructor) => Promise<Instructor>;
  deleteInstructor: (id: string) => Promise<void>;

  // Students
  addStudent: (data: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (id: string, data: Student) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  // Agents
  addAgent: (data: Omit<Agent, 'id'>) => Promise<Agent>;
  updateAgent: (id: string, data: Agent) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;

  // Agent Commissions
  addAgentCommission: (data: Omit<AgentCommission, 'id'>) => Promise<AgentCommission>;
  updateAgentCommission: (id: string, data: AgentCommission) => Promise<AgentCommission>;
  deleteAgentCommission: (id: string) => Promise<void>;

  // Settings
  updateSettings: (data: Partial<AppState>) => Promise<void>;

  // Reset
  resetData: () => Promise<void>;

  // Refetch
  refetch: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  actions: AppActions;
  loading: boolean;
  connected: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data from MongoDB via API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lessons, groupLessons, boardRentals, sunbedRentals, instructors, students, agents, agentCommissions, settings] = await Promise.all([
        api.lessons.getAll(),
        api.groupLessons.getAll(),
        api.boardRentals.getAll(),
        api.sunbedRentals.getAll(),
        api.instructors.getAll(),
        api.students.getAll(),
        api.agents.getAll(),
        api.agentCommissions.getAll(),
        api.settings.get(),
      ]);
      setState({
        lessons,
        groupLessons,
        boardRentals,
        sunbedRentals,
        instructors,
        students,
        agents,
        agentCommissions,
        revenues: [],
        schoolName: settings.schoolName || '',
        schoolPhone: settings.schoolPhone || '',
        schoolEmail: settings.schoolEmail || '',
        schoolAddress: settings.schoolAddress || '',
      });
      setConnected(true);
    } catch {
      setConnected(false);
      setError('Cannot connect to server. Please ensure MongoDB is running and the backend is started.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── API-first action creators ──────────────────────────────

  const actions: AppActions = {
    // Lessons
    addLesson: async (data) => {
      const result = await api.lessons.create(data);
      setState(prev => ({ ...prev, lessons: [result, ...prev.lessons] }));
      return result;
    },
    updateLesson: async (id, data) => {
      const result = await api.lessons.update(id, data);
      setState(prev => ({ ...prev, lessons: prev.lessons.map(l => l.id === id ? result : l) }));
      return result;
    },
    deleteLesson: async (id) => {
      await api.lessons.delete(id);
      setState(prev => ({ ...prev, lessons: prev.lessons.filter(l => l.id !== id) }));
    },

    // Group Lessons
    addGroupLesson: async (data) => {
      const result = await api.groupLessons.create(data);
      setState(prev => ({ ...prev, groupLessons: [result, ...prev.groupLessons] }));
      return result;
    },
    updateGroupLesson: async (id, data) => {
      const result = await api.groupLessons.update(id, data);
      setState(prev => ({ ...prev, groupLessons: prev.groupLessons.map(g => g.id === id ? result : g) }));
      return result;
    },
    deleteGroupLesson: async (id) => {
      await api.groupLessons.delete(id);
      setState(prev => ({ ...prev, groupLessons: prev.groupLessons.filter(g => g.id !== id) }));
    },

    // Board Rentals
    addBoardRental: async (data) => {
      const result = await api.boardRentals.create(data);
      setState(prev => ({ ...prev, boardRentals: [result, ...prev.boardRentals] }));
      return result;
    },
    updateBoardRental: async (id, data) => {
      const result = await api.boardRentals.update(id, data);
      setState(prev => ({ ...prev, boardRentals: prev.boardRentals.map(r => r.id === id ? result : r) }));
      return result;
    },
    deleteBoardRental: async (id) => {
      await api.boardRentals.delete(id);
      setState(prev => ({ ...prev, boardRentals: prev.boardRentals.filter(r => r.id !== id) }));
    },

    // Sunbed Rentals
    addSunbedRental: async (data) => {
      const result = await api.sunbedRentals.create(data);
      setState(prev => ({ ...prev, sunbedRentals: [result, ...prev.sunbedRentals] }));
      return result;
    },
    updateSunbedRental: async (id, data) => {
      const result = await api.sunbedRentals.update(id, data);
      setState(prev => ({ ...prev, sunbedRentals: prev.sunbedRentals.map(s => s.id === id ? result : s) }));
      return result;
    },
    deleteSunbedRental: async (id) => {
      await api.sunbedRentals.delete(id);
      setState(prev => ({ ...prev, sunbedRentals: prev.sunbedRentals.filter(s => s.id !== id) }));
    },

    // Instructors
    addInstructor: async (data) => {
      const result = await api.instructors.create(data);
      setState(prev => ({ ...prev, instructors: [result, ...prev.instructors] }));
      return result;
    },
    updateInstructor: async (id, data) => {
      const result = await api.instructors.update(id, data);
      setState(prev => ({ ...prev, instructors: prev.instructors.map(i => i.id === id ? result : i) }));
      return result;
    },
    deleteInstructor: async (id) => {
      await api.instructors.delete(id);
      setState(prev => ({ ...prev, instructors: prev.instructors.filter(i => i.id !== id) }));
    },

    // Students
    addStudent: async (data) => {
      const result = await api.students.create(data);
      setState(prev => ({ ...prev, students: [result, ...prev.students] }));
      return result;
    },
    updateStudent: async (id, data) => {
      const result = await api.students.update(id, data);
      setState(prev => ({ ...prev, students: prev.students.map(s => s.id === id ? result : s) }));
      return result;
    },
    deleteStudent: async (id) => {
      await api.students.delete(id);
      setState(prev => ({ ...prev, students: prev.students.filter(s => s.id !== id) }));
    },

    // Agents
    addAgent: async (data) => {
      const result = await api.agents.create(data);
      setState(prev => ({ ...prev, agents: [result, ...prev.agents] }));
      return result;
    },
    updateAgent: async (id, data) => {
      const result = await api.agents.update(id, data);
      setState(prev => ({ ...prev, agents: prev.agents.map(a => a.id === id ? result : a) }));
      return result;
    },
    deleteAgent: async (id) => {
      await api.agents.delete(id);
      setState(prev => ({ ...prev, agents: prev.agents.filter(a => a.id !== id) }));
    },

    // Agent Commissions
    addAgentCommission: async (data) => {
      const result = await api.agentCommissions.create(data);
      setState(prev => ({ ...prev, agentCommissions: [result, ...prev.agentCommissions] }));
      return result;
    },
    updateAgentCommission: async (id, data) => {
      const result = await api.agentCommissions.update(id, data);
      setState(prev => ({ ...prev, agentCommissions: prev.agentCommissions.map(c => c.id === id ? result : c) }));
      return result;
    },
    deleteAgentCommission: async (id) => {
      await api.agentCommissions.delete(id);
      setState(prev => ({ ...prev, agentCommissions: prev.agentCommissions.filter(c => c.id !== id) }));
    },

    // Settings
    updateSettings: async (data) => {
      await api.settings.update(data);
      setState(prev => ({ ...prev, ...data }));
    },

    // Reset
    resetData: async () => {
      await api.reset();
      await fetchData();
    },

    // Refetch
    refetch: fetchData,
  };

  // Loading screen
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-alt)]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)] text-sm">Connecting to DB...</p>
        </div>
      </div>
    );
  }

  // Error screen - MongoDB / Backend not available
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-alt)]">
        <div className="text-center max-w-lg bg-[var(--surface)] rounded-3xl p-10 shadow-2xl">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Database Connection Failed</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
            {error}
          </p>
          <div className="bg-[var(--surface-alt)] rounded-xl p-4 mb-6 text-left text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)] mb-2">Quick Fix:</p>
            <p>1. Start MongoDB service: <code className="bg-[var(--surface-dim)] px-1.5 py-0.5 rounded">net start MongoDB</code></p>
            <p>2. Start backend: <code className="bg-[var(--surface-dim)] px-1.5 py-0.5 rounded">cd backend && npm run dev</code></p>
            <p>3. Click Retry below</p>
          </div>
          <button
            onClick={fetchData}
            className="px-8 py-2.5 bg-[var(--brand)] text-white rounded-xl font-medium hover:opacity-90 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, actions, loading, connected }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

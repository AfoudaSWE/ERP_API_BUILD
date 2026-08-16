import { create } from 'zustand';
import { authenticate, clearSession, readSession, saveSession } from '../services/authService';

const STORES = [
  { id: 'cfc', name: 'Cairo Festival City', city: 'Cairo', status: 'live', lat: 30.0291, lng: 31.4084 },
  { id: 'cs', name: 'City Stars', city: 'Cairo', status: 'live', lat: 30.0733, lng: 31.3454 },
  { id: 'moe', name: 'Mall of Egypt', city: 'Giza', status: 'live', lat: 29.9724, lng: 31.0160 },
  { id: 'acc', name: 'Alexandria City Centre', city: 'Alexandria', status: 'live', lat: 31.2156, lng: 29.9426 },
  { id: 'man', name: 'Mansoura Branch', city: 'Mansoura', status: 'live', lat: 31.0409, lng: 31.3785 },
];

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('retail-twin-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useAppStore = create((set, get) => ({
  authUser: readSession()?.user ?? null,
  login: async (credentials, remember = false) => {
    const session = await authenticate(credentials);
    saveSession(session, remember);
    set({ authUser: session.user });
    return session.user;
  },
  logout: () => {
    clearSession();
    set({ authUser: null, sidebarOpen: false, notifications: [] });
  },
  stores: STORES,
  selectedStoreId: 'cfc',
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: getInitialTheme(),
  liveMode: true,
  dateRange: { start: new Date(), end: new Date() },
  notifications: [],
  demoMode: true,
  demoEvents: [],
  simulationPaused: false,

  getSelectedStore: () => {
    const state = get();
    return state.stores.find(s => s.id === state.selectedStoreId) || STORES[0];
  },

  setSelectedStore: (id) => set({ selectedStoreId: id }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () => set(s => {
    const theme = s.theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem('retail-twin-theme', theme);
    return { theme };
  }),
  setLiveMode: (live) => set({ liveMode: live }),
  setDateRange: (range) => set({ dateRange: range }),
  addNotification: (n) => set(s => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
  clearNotifications: () => set({ notifications: [] }),
  toggleSimulation: () => set(s => ({ simulationPaused: !s.simulationPaused })),

  triggerDemoEvent: (event) => set(s => ({
    demoEvents: [...s.demoEvents, { ...event, id: Date.now(), timestamp: new Date() }]
  })),
  resetDemo: () => set({ demoEvents: [] }),
}));

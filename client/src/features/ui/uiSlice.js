import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'careersync-theme';

const getInitialTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: getInitialTheme(),
    toast: null, // { message, type: 'success' | 'error' | 'info' | 'warning' }
    globalLoading: false,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(state.theme);
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      applyTheme(state.theme);
    },
    showToast: (state, action) => { state.toast = action.payload; },
    clearToast: (state) => { state.toast = null; },
    setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
  },
});

export const {
  toggleSidebar, setSidebarOpen,
  toggleTheme, setTheme, showToast, clearToast, setGlobalLoading,
} = uiSlice.actions;
export default uiSlice.reducer;

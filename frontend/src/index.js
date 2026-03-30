import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import useAuthStore from './context/authStore';
import Layout       from './components/Layout';
import SupabaseSessionProvider from './components/SupabaseSessionProvider';
import LoginPage    from './pages/LoginPage';
import Dashboard    from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddRecord    from './pages/AddRecord';
import BudgetPage   from './pages/BudgetPage';
import GoalsPage    from './pages/GoalsPage';
import ReportsPage  from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,   // 2 min
      gcTime:    5 * 60 * 1000,    // 5 min
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const user = useAuthStore(s => s.user);
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index                element={<Dashboard />} />
              <Route path="transactions"  element={<Transactions />} />
              <Route path="add"           element={<AddRecord />} />
              <Route path="budgets"       element={<BudgetPage />} />
              <Route path="goals"         element={<GoalsPage />} />
              <Route path="reports"       element={<ReportsPage />} />
              <Route path="settings"      element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SupabaseSessionProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#111623', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.08)' },
          success: { iconTheme: { primary: '#4fffb0', secondary: '#0a0d14' } },
          error:   { iconTheme: { primary: '#ff6b6b', secondary: '#0a0d14' } },
          duration: 3000,
        }}
      />
    </QueryClientProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ContactAdminPage from './pages/ContactAdminPage';
import Dashboard from './pages/Dashboard';
import './App.css';

/**
 * PrivateRoute — checks for a valid JWT in localStorage.
 * If no token exists, redirects to /login immediately.
 * This is the ONLY source of truth for frontend auth guarding.
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/**
 * PublicOnlyRoute — if user is already logged in, redirect to dashboard.
 * Prevents logged-in users from seeing login/signup pages.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/contact-admin"
          element={
            <PublicOnlyRoute>
              <ContactAdminPage />
            </PublicOnlyRoute>
          }
        />



        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

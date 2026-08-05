import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export { API_URL };

/**
 * useApi — shared hook for API interactions.
 * Provides auth headers and automatic 401 handling.
 */
export function useApi() {
  const navigate = useNavigate();

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  const handleAuthError = useCallback((res: Response): boolean => {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);

  return { API_URL, getAuthHeaders, handleAuthError };
}

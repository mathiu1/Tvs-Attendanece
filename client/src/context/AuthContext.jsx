import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tvs_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadUser();
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    let timeout;
    const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        toast.error('Session expired due to inactivity', { id: 'session-expired' });
      }, INACTIVITY_TIME);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const loadUser = async () => {
    try {
      const { data } = await API.get('/auth/profile');
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('tvs_token', data.token);
    localStorage.setItem('tvs_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('tvs_token');
    localStorage.removeItem('tvs_user');
    setToken(null);
    setUser(null);
  };

  const isHR = () => user?.role === 'hr';
  const isSupervisor = () => user?.role === 'supervisor';
  const isWorker = () => user?.role === 'worker';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, loadUser, isHR, isSupervisor, isWorker, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

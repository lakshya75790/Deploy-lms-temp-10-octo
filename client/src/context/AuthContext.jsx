import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, loginUser, logoutUser, setupOrg as setupOrgApi, registerEmployee as registerEmployeeApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('lms_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateUser = (newUser) => {
    setUser(newUser);
    try {
      if (newUser) {
        localStorage.setItem('lms_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('lms_user');
      }
    } catch (e) {}
  };

  const fetchCurrentUser = async (retryCount = 0) => {
    try {
      setLoading(true);
      const res = await getMe();
      if (res.data?.data?.user) {
        const u = res.data.data.user;
        setUser(u);
        try {
          localStorage.setItem('lms_user', JSON.stringify(u));
          if (res.data.data.token) {
            localStorage.setItem('lms_token', res.data.data.token);
          }
        } catch (e) {}
      }
    } catch (err) {
      // Retry once on transient network disconnect
      if (retryCount < 1 && (err.code === 'ERR_NETWORK' || !err.response)) {
        await new Promise((r) => setTimeout(r, 800));
        return fetchCurrentUser(retryCount + 1);
      }

      // Explicit authentication failure (token missing, invalid, or expired)
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null);
        try {
          localStorage.removeItem('lms_user');
          localStorage.removeItem('lms_token');
        } catch (e) {}
      } else {
        // Transient network glitch on reload: preserve cached user session
        console.warn('Network error while validating session; retaining cached session if available:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await loginUser(credentials);
      const u = res.data.data.user;
      const t = res.data.data.token;
      setUser(u);
      try {
        localStorage.setItem('lms_user', JSON.stringify(u));
        if (t) localStorage.setItem('lms_token', t);
      } catch (e) {}
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Unable to connect to server' : 'Login failed');
      const errorCode = err.response?.data?.errorCode || null;
      setError(msg);
      const customErr = new Error(msg);
      customErr.errorCode = errorCode;
      throw customErr;
    }
  };

  const setupOrganization = async (data) => {
    setError(null);
    try {
      const res = await setupOrgApi(data);
      const u = res.data.data.user;
      const t = res.data.data.token;
      setUser(u);
      try {
        localStorage.setItem('lms_user', JSON.stringify(u));
        if (t) localStorage.setItem('lms_token', t);
      } catch (e) {}
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Unable to connect to server' : 'Organization setup failed');
      const errorCode = err.response?.data?.errorCode || null;
      setError(msg);
      const customErr = new Error(msg);
      customErr.errorCode = errorCode;
      throw customErr;
    }
  };

  const registerEmp = async (data) => {
    setError(null);
    try {
      const res = await registerEmployeeApi(data);
      const u = res.data.data.user;
      const t = res.data.data.token;
      setUser(u);
      try {
        localStorage.setItem('lms_user', JSON.stringify(u));
        if (t) localStorage.setItem('lms_token', t);
      } catch (e) {}
      return u;
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Unable to connect to server' : 'Registration failed');
      const errorCode = err.response?.data?.errorCode || null;
      setError(msg);
      const customErr = new Error(msg);
      customErr.errorCode = errorCode;
      throw customErr;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('lms_user');
        localStorage.removeItem('lms_token');
      } catch (e) {}
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        loading,
        error,
        login,
        setupOrganization,
        registerEmp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// src/context/AuthContext.js
import { useEffect } from 'react';
import { initializeAuth } from '../stores/authStore';

export const AuthProvider = ({ children }) => {
  useEffect(() => {
    const cleanup = initializeAuth();
    return cleanup;
  }, []);

  return children;
};

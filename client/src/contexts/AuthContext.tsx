import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { authApi } from '../api';
import { notification } from 'antd';
import { io, Socket } from 'socket.io-client';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  socket: Socket | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi
        .me()
        .then((data) => {
          setUser(data as User);
          initSocket(token);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const initSocket = (token: string) => {
    const s = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => {
      console.log('Socket connected');
    });
    s.on('notification', (data) => {
      notification.info({
        message: data.title || '新通知',
        description: data.content,
      });
    });
    setSocket(s);
  };

  const login = async (email: string, password: string) => {
    const res: any = await authApi.login({ email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    initSocket(res.token);
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const res: any = await authApi.register({ email, password, name, phone });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    initSocket(res.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  createSubUser: (name: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
  canAccess: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabase = !!supabaseUrl && !!supabaseKey && 
                     !supabaseUrl.includes('SUA_URL') && 
                     !supabaseUrl.includes('YOUR_URL');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if master user is already logged in via localStorage
        const savedUser = localStorage.getItem('whatch_pro_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.email === 'mestre@whatchpro.com') {
            setUser(parsedUser);
            setIsLoading(false);
            return;
          }
        }

        if (hasSupabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              role: session.user.user_metadata?.role || 'admin',
              adminId: session.user.user_metadata?.adminId,
              permissions: session.user.user_metadata?.permissions,
              avatar: session.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`
            });
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Don't overwrite if it's the master user
            const currentSaved = localStorage.getItem('whatch_pro_user');
            if (currentSaved) {
              const parsed = JSON.parse(currentSaved);
              if (parsed.email === 'mestre@whatchpro.com') return;
            }

            if (session?.user) {
              setUser({
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email || '',
                role: session.user.user_metadata?.role || 'admin',
                adminId: session.user.user_metadata?.adminId,
                permissions: session.user.user_metadata?.permissions,
                avatar: session.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`
              });
            } else {
              setUser(null);
            }
          });

          return () => subscription.unsubscribe();
        } else {
          // Local storage fallback
          const savedUser = localStorage.getItem('whatch_pro_user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [hasSupabase]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. MASTER USER CHECK (HARDCODED)
      if (email === 'mestre@whatchpro.com' && password === 'mestre2026') {
        const masterUser: User = {
          id: 'master-id-000',
          name: 'Mestre Whatch Pro',
          email: 'mestre@whatchpro.com',
          role: 'admin',
          avatar: `https://ui-avatars.com/api/?name=Mestre+Whatch+Pro&background=random`
        };
        setUser(masterUser);
        localStorage.setItem('whatch_pro_user', JSON.stringify(masterUser));
        return;
      }

      if (hasSupabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const newUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            email: data.user.email || '',
            role: data.user.user_metadata?.role || 'user',
            avatar: data.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${data.user.email}&background=random`
          };
          setUser(newUser);
          localStorage.setItem('whatch_pro_user', JSON.stringify(newUser));
        }
      } else {
        // Mock login
        await new Promise(resolve => setTimeout(resolve, 800));
        const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]');
        
        if (allUsers.length === 0 && email === 'admin@whatchpro.com' && password === 'admin123') {
          const adminUser: User = {
            id: 'user_admin',
            name: 'Super Admin',
            email: 'admin@whatchpro.com',
            role: 'admin',
            avatar: `https://ui-avatars.com/api/?name=Super+Admin&background=random`
          };
          setUser(adminUser);
          localStorage.setItem('whatch_pro_user', JSON.stringify(adminUser));
          localStorage.setItem('whatch_pro_all_users', JSON.stringify([adminUser]));
        } else {
          const foundUser = allUsers.find(u => u.email === email);
          if (foundUser) {
             setUser(foundUser);
             localStorage.setItem('whatch_pro_user', JSON.stringify(foundUser));
          } else {
            // Default fallback
            const fallbackUser: User = {
              id: 'temp-id',
              name: 'Usuário Teste',
              email: email,
              role: 'sub-user',
              avatar: `https://ui-avatars.com/api/?name=${email}`
            };
            setUser(fallbackUser);
            localStorage.setItem('whatch_pro_user', JSON.stringify(fallbackUser));
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      if (hasSupabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              name, 
              role: 'sub-user', 
              avatar: `https://ui-avatars.com/api/?name=${name}&background=random` 
            } 
          }
        });
        if (error) throw error;
        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            email: data.user.email || '',
            role: data.user.user_metadata?.role || 'sub-user',
            avatar: data.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${data.user.email}&background=random`
          };
          setUser(newUser);
          localStorage.setItem('whatch_pro_user', JSON.stringify(newUser));
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]');
        const newUser: User = {
          id: 'user_' + Date.now(),
          name,
          email,
          role: 'sub-user',
          avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
        };
        const updatedUsers = [...allUsers, newUser];
        localStorage.setItem('whatch_pro_all_users', JSON.stringify(updatedUsers));
        setUser(newUser);
        localStorage.setItem('whatch_pro_user', JSON.stringify(newUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (hasSupabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('whatch_pro_user');
  };

  const createSubUser = async (name: string, email: string, password: string) => {
    if (!user || user.role !== 'admin') throw new Error('Apenas administradores podem criar sub-usuários');
    
    setIsLoading(true);
    try {
      if (hasSupabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              name, 
              role: 'sub-user',
              adminId: user.id, // Vínculo com o admin atual
              permissions: ['clients', 'inventory', 'quotations', 'appearance'], // Permissões padrão solicitadas
              avatar: `https://ui-avatars.com/api/?name=${name}&background=random` 
            } 
          }
        });
        if (error) throw error;
        console.log('Sub-usuário criado com sucesso:', data.user?.id);
      } else {
        // Mock local storage creation
        const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]');
        const newUser: User = {
          id: 'sub_' + Date.now(),
          name,
          email,
          role: 'sub-user',
          adminId: user.id,
          permissions: ['clients', 'inventory', 'quotations', 'appearance'],
          avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
        };
        localStorage.setItem('whatch_pro_all_users', JSON.stringify([...allUsers, newUser]));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canAccess = (permission: string) => {
    if (!user) return false;
    if (user.role === 'admin' || user.id === 'master-id-000') return true;
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, createSubUser, canAccess, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

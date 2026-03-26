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
      if (hasSupabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            email: data.user.email || '',
            role: data.user.user_metadata?.role || 'admin',
            avatar: data.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${data.user.email}&background=random`
          };
          setUser(newUser);
          localStorage.setItem('whatch_pro_user', JSON.stringify(newUser));
        }
      } else {
        // Mock login
        await new Promise(resolve => setTimeout(resolve, 800));
        const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]');
        
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
    
    // Master has full access to everything
    // Identify by special email (must be authenticated via Supabase/Mock)
    if (user.email === 'mestre@whatchpro.com') return true;
    
    // Admins have full access by default
    if (user.role === 'admin') return true;
    
    // Support for legacy "user" role (if any)
    if ((user as any).role === 'user') return true;
    
    // Sub-users with no permissions array yet (legacy support)
    if (user.role === 'sub-user' && !user.permissions) {
        return true;
    }

    // Standard permission check for sub-users
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

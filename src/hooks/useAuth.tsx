import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { getDefaultFeaturesByCompanyType, normalizeCompanyType, normalizeFeatures, type CompanyTypeId } from '../lib/access';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  createSubUser: (
    name: string,
    email: string,
    password: string,
    role?: 'sub-user' | 'admin',
    permissions?: string[],
    targetTenantId?: string,
    companyType?: CompanyTypeId,
    profile?: string,
    tenant?: {
      name?: string
      legalName?: string
      document?: string
      ie?: string
      phone?: string
      email?: string
      cep?: string
      address?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }
  ) => Promise<{ id: string; email: string }>;
  updateUserMetadata: (updates: Record<string, any>) => Promise<void>;
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
            const { data: verified, error: verifyError } = await supabase.auth.getUser()
            if (verifyError || !verified?.user) {
              await supabase.auth.signOut()
              setUser(null)
              localStorage.removeItem('whatch_pro_user')
            } else {
            setUser({
              id: verified.user.id,
              name: verified.user.user_metadata?.name || verified.user.email?.split('@')[0] || 'Usuário',
              email: verified.user.email || '',
              role: verified.user.user_metadata?.role || 'admin',
              adminId: verified.user.user_metadata?.adminId,
              permissions: verified.user.user_metadata?.permissions,
              companyType: normalizeCompanyType(verified.user.user_metadata?.companyType),
              features: normalizeFeatures(verified.user.user_metadata?.features),
              profile: typeof verified.user.user_metadata?.profile === 'string' ? verified.user.user_metadata.profile : undefined,
              avatar: verified.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${verified.user.email}&background=random`
            });
            }
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
              setUser(null);
              localStorage.removeItem('whatch_pro_user');
              return;
            }

            if (session?.user) {
              setUser({
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email || '',
                role: session.user.user_metadata?.role || 'admin',
                adminId: session.user.user_metadata?.adminId,
                permissions: session.user.user_metadata?.permissions,
                companyType: normalizeCompanyType(session.user.user_metadata?.companyType),
                features: normalizeFeatures(session.user.user_metadata?.features),
                profile: typeof session.user.user_metadata?.profile === 'string' ? session.user.user_metadata.profile : undefined,
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
            adminId: data.user.user_metadata?.adminId,
            permissions: Array.isArray(data.user.user_metadata?.permissions) ? data.user.user_metadata.permissions : undefined,
            companyType: normalizeCompanyType(data.user.user_metadata?.companyType),
            features: normalizeFeatures(data.user.user_metadata?.features),
            profile: typeof data.user.user_metadata?.profile === 'string' ? data.user.user_metadata.profile : undefined,
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
        throw new Error('Cadastro público desativado. Solicite ao administrador da sua empresa para criar seu acesso.')
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

  const createSubUser = async (
    name: string,
    email: string,
    password: string,
    role: 'sub-user' | 'admin' = 'sub-user',
    permissions?: string[],
    targetTenantId?: string,
    companyType?: CompanyTypeId,
    profile?: string,
    tenant?: {
      name?: string
      legalName?: string
      document?: string
      ie?: string
      phone?: string
      email?: string
      cep?: string
      address?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }
  ) => {
    if (!hasSupabase) {
      throw new Error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
    }
    if (!user) throw new Error('Autenticação necessária');

    const isMaster = user.email === 'mestre@whatchpro.com';
    const isAdmin = user.role === 'admin';

    if (!(isMaster || isAdmin)) {
      throw new Error('Apenas administradores podem criar usuários.')
    }

    const currentTenantId = user.adminId || user.id

    const resolveAdminId = () => {
      if (role === 'sub-user') {
        if (isMaster) {
          if (!targetTenantId) throw new Error('Selecione a empresa (admin master) para vincular este sub-usuário.')
          return targetTenantId
        }
        return currentTenantId
      }

      if (role === 'admin') {
        if (isMaster) {
          return targetTenantId || undefined
        }
        return currentTenantId
      }

      return undefined
    }

    setIsLoading(true);
    try {
      const getJwtIssuer = (jwt: string | null | undefined) => {
        if (!jwt) return null
        const parts = jwt.split('.')
        if (parts.length < 2) return null
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
        try {
          const json = JSON.parse(atob(padded))
          return typeof json?.iss === 'string' ? json.iss : null
        } catch {
          return null
        }
      }

      const readErr = async (err: unknown) => {
        if (err instanceof FunctionsHttpError) {
          const status = err.context?.status
          const cloned = err.context?.clone?.()
          try {
            const json = cloned ? await cloned.json() : null
            return { status, text: json ? JSON.stringify(json) : '' }
          } catch {
            try {
              const text = cloned ? await cloned.text() : ''
              return { status, text }
            } catch {
              return { status, text: String((err as any)?.message || '') }
            }
          }
        }
        if (err instanceof FunctionsRelayError) return { status: undefined, text: err.message }
        if (err instanceof FunctionsFetchError) return { status: undefined, text: err.message }
        return { status: undefined, text: String((err as any)?.message || err || '') }
      }

      const invokeOnce = async () => {
        const features = (isMaster && role === 'admin' && !targetTenantId && companyType)
          ? getDefaultFeaturesByCompanyType(companyType)
          : undefined
        const tenantPayload = (isMaster && role === 'admin' && !targetTenantId) ? (tenant || undefined) : undefined
        const { data, error } = await supabase.functions.invoke('user-admin', {
          body: {
            action: 'create',
            name,
            email,
            password,
            role,
            permissions,
            targetTenantId: isMaster ? (targetTenantId || undefined) : undefined,
            companyType: (isMaster && role === 'admin' && !targetTenantId) ? (companyType || undefined) : undefined,
            features,
            profile: role === 'sub-user' ? (profile || undefined) : undefined,
            tenant: tenantPayload,
          }
        })
        return { data, error }
      }

      const first = await invokeOnce()
      if (!first.error) {
        if (!first.data?.user?.id || !first.data?.user?.email) throw new Error('Erro ao criar usuário no Supabase.')
        return { id: first.data.user.id, email: first.data.user.email }
      }

      const firstDetails = await readErr(first.error)
      const msg = String((first.error as any)?.message || '')
      const lower = (firstDetails.text || msg).toLowerCase()
      if (firstDetails.status === 401 && lower.includes('protected header')) {
        throw new Error('Supabase: token inválido. Verifique VITE_SUPABASE_ANON_KEY no Vercel (use a anon key sem "Bearer" e sem aspas).')
      }
      const shouldRetry = firstDetails.status === 401 && (lower.includes('invalid jwt') || lower.includes('jwt expired'))
      if (shouldRetry) {
        await supabase.auth.refreshSession()
        const second = await invokeOnce()
        if (!second.error) {
          if (!second.data?.user?.id || !second.data?.user?.email) throw new Error('Erro ao criar usuário no Supabase.')
          return { id: second.data.user.id, email: second.data.user.email }
        }
        const secondDetails = await readErr(second.error)
        const msg2 = String((second.error as any)?.message || '')
        const lower2 = (secondDetails.text || msg2).toLowerCase()
        if (secondDetails.status === 401 && lower2.includes('protected header')) {
          throw new Error('Supabase: token inválido. Verifique VITE_SUPABASE_ANON_KEY no Vercel (use a anon key sem "Bearer" e sem aspas).')
        }
        if (secondDetails.status === 401 && (lower2.includes('invalid jwt') || lower2.includes('jwt expired'))) {
          const { data: sessionData } = await supabase.auth.getSession()
          const iss = getJwtIssuer(sessionData.session?.access_token || null)
          const expected = `${String(supabaseUrl || '').replace(/\/$/, '')}/auth/v1`
          await supabase.auth.signOut()
          throw new Error(`Sessão inválida (HTTP 401). Detalhes: ${secondDetails.text || msg2 || 'Unauthorized'}. Token iss: ${iss || 'desconhecido'}. Esperado: ${expected}`)
        }
        console.error('Edge function error:', second.error)
        throw new Error(secondDetails.status ? `HTTP ${secondDetails.status}: ${secondDetails.text || msg2}` : (secondDetails.text || msg2 || 'Erro ao criar usuário no Supabase'))
      }

      console.error('Edge function error:', first.error)
      throw new Error(firstDetails.status ? `HTTP ${firstDetails.status}: ${firstDetails.text || msg}` : (firstDetails.text || msg || 'Erro ao criar usuário no Supabase'))
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserMetadata = async (updates: Record<string, any>) => {
    if (!user) throw new Error('Autenticação necessária');
    setIsLoading(true);
    try {
      if (hasSupabase) {
        const { error } = await supabase.auth.updateUser({ data: updates });
        if (error) throw error;
      }
      setUser(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          name: typeof updates.name === 'string' ? updates.name : prev.name,
          avatar: typeof updates.avatar === 'string' ? updates.avatar : prev.avatar,
          permissions: Array.isArray(updates.permissions) ? updates.permissions : prev.permissions,
          adminId: updates.adminId !== undefined ? updates.adminId : prev.adminId,
          role: typeof updates.role === 'string' ? updates.role : prev.role,
        } as User;
        localStorage.setItem('whatch_pro_user', JSON.stringify(next));
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canAccess = (permission: string) => {
    if (!user) return false;
    
    if (user.email === 'mestre@whatchpro.com') return permission === 'users' || permission === 'settings';

    if (permission === 'dashboard') return true

    const features = Array.isArray(user.features) ? user.features : undefined
    if (features && features.length > 0 && !features.includes(permission)) return false
    
    // Admins have full access by default
    if (user.role === 'admin') return true;
    
    // Support for legacy "user" role (if any)
    if ((user as any).role === 'user') return true;
    
    const perms = user.permissions || []
    if (permission === 'service-orders') return perms.includes('service-orders') || perms.includes('service-orders-tech') || perms.includes('service-orders-admin')
    if (permission === 'finance') return perms.includes('finance') || perms.includes('finance-billing')

    // Standard permission check for sub-users
    return perms.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, createSubUser, updateUserMetadata, canAccess, isLoading }}>
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

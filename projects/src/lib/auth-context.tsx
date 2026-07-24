'use client';

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthContextType {
  user: User | null;
  username: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null; session: Session | null }>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  updateProfile: (updates: { username?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let supabaseClient: SupabaseClient | null = null;
let supabaseInitPromise: Promise<SupabaseClient | null> | null = null;

async function fetchSupabaseConfig(): Promise<{ url: string; anonKey: string } | null> {
  try {
    const res = await fetch('/api/config/supabase');
    if (!res.ok) return null;
    const data = await res.json();
    return data.url && data.anonKey ? { url: data.url, anonKey: data.anonKey } : null;
  } catch {
    return null;
  }
}

function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

function getSupabaseBrowserClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (url && anonKey) {
    supabaseClient = createSupabaseClient(url, anonKey);
    return supabaseClient;
  }

  return null;
}

async function initSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabaseClient) return supabaseClient;
  if (supabaseInitPromise) return supabaseInitPromise;

  supabaseInitPromise = (async () => {
    const config = await fetchSupabaseConfig();
    if (config) {
      supabaseClient = createSupabaseClient(config.url, config.anonKey);
      return supabaseClient;
    }
    console.warn('Supabase not configured via build-time env vars or runtime API. Auth features will be disabled.');
    return null;
  })();

  return supabaseInitPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    function setupAuth(client: SupabaseClient) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const sub = client.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
      });
      subscription = sub.data.subscription;
    }

    const client = getSupabaseBrowserClient();
    if (client) {
      setupAuth(client);
    } else {
      // Build-time env vars not available; try runtime API fetch
      initSupabaseClient().then(apiClient => {
        if (cancelled) return;
        if (apiClient) {
          setupAuth(apiClient);
        } else {
          setLoading(false);
        }
      });
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const getClient = useCallback(async (): Promise<SupabaseClient | null> => {
    const client = getSupabaseBrowserClient();
    if (client) return client;
    return initSupabaseClient();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = await getClient();
    if (!supabase) return { error: '认证服务未配置' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [getClient]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const supabase = await getClient();
    if (!supabase) return { error: '认证服务未配置', session: null };
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });
    return { error: error?.message ?? null, session: data?.session ?? null };
  }, [getClient]);

  const signOut = useCallback(async () => {
    const supabase = await getClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [getClient]);

  const getToken = useCallback(async () => {
    const supabase = await getClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [getClient]);

  const updateProfile = useCallback(async (updates: { username?: string; avatarUrl?: string }) => {
    const supabase = await getClient();
    if (!supabase) return { success: false, error: '认证服务未配置' };
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: '未登录' };
    }

    const metadata: Record<string, string> = { ...currentUser.user_metadata };
    if (updates.username !== undefined) {
      metadata.username = updates.username;
    }
    if (updates.avatarUrl !== undefined) {
      metadata.avatar_url = updates.avatarUrl;
    }

    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 更新本地 user 状态
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser) {
      setUser(updatedUser);
    }

    return { success: true };
  }, [getClient]);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || null;

  return (
    <AuthContext.Provider value={{ user, username, loading, signIn, signUp, signOut, getToken, updateProfile }}>
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

export { getSupabaseBrowserClient };
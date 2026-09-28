import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAdminStatus: (userId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAdmin: false,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = await get().checkAdminStatus(session.user.id);
        set({ user: session.user, isAdmin, loading: false });
      } else {
        set({ user: null, isAdmin: false, loading: false });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const isAdmin = await get().checkAdminStatus(session.user.id);
          set({ user: session.user, isAdmin });
        } else {
          set({ user: null, isAdmin: false });
        }
      });
    } catch (error) {
      set({ loading: false, error: 'Failed to initialize auth' });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      if (data.user) {
        const isAdmin = await get().checkAdminStatus(data.user.id);
        if (!isAdmin) {
          await supabase.auth.signOut();
          set({ error: '관리자 권한이 없습니다' });
          return false;
        }
        set({ user: data.user, isAdmin: true });
        return true;
      }
      return false;
    } catch (error) {
      set({ error: '로그인 중 오류가 발생했습니다' });
      return false;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAdmin: false });
  },

  checkAdminStatus: async (userId: string) => {
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .single();

    return !error && !!data;
  },
}));

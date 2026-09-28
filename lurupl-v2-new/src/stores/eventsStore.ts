import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface XpEvent {
  id: string;
  name: string;
  emoji: string;
  start_date: string;
  end_date: string;
  multiplier: number;
  categories: string[] | null;
  is_enabled: boolean;
  created_at: string;
}

interface EventsState {
  events: XpEvent[];
  loading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<XpEvent, 'id' | 'created_at'>) => Promise<boolean>;
  updateEvent: (id: string, data: Partial<XpEvent>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  getActiveEvents: (date: string) => XpEvent[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      set({ events: data || [], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch events', loading: false });
    }
  },

  createEvent: async (event) => {
    try {
      const { error } = await supabase.from('xp_events').insert([event]);
      if (error) throw error;
      await get().fetchEvents();
      return true;
    } catch (error) {
      set({ error: 'Failed to create event' });
      return false;
    }
  },

  updateEvent: async (id, data) => {
    try {
      const { error } = await supabase
        .from('xp_events')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await get().fetchEvents();
      return true;
    } catch (error) {
      set({ error: 'Failed to update event' });
      return false;
    }
  },

  deleteEvent: async (id) => {
    try {
      const { error } = await supabase.from('xp_events').delete().eq('id', id);
      if (error) throw error;
      await get().fetchEvents();
      return true;
    } catch (error) {
      set({ error: 'Failed to delete event' });
      return false;
    }
  },

  getActiveEvents: (date: string) => {
    return get().events.filter(
      (e) => e.is_enabled && date >= e.start_date && date <= e.end_date
    );
  },
}));

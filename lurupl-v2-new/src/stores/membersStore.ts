import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Member {
  id: string;
  display_name: string;
  wake_up_time: string | null;
  accumulated_exp: number;
  is_active: boolean;
  joined_at: string | null;
  created_at: string;
}

export interface MemberStats {
  id: string;
  display_name: string;
  accumulated_exp: number;
  monthly_exp: number;
  cert_count: number;
  cert_days: number;
}

interface MembersState {
  members: Member[];
  monthlyStats: MemberStats[];
  selectedMonth: string;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  fetchMonthlyStats: (yearMonth: string) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<boolean>;
  setSelectedMonth: (month: string) => void;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  monthlyStats: [],
  selectedMonth: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })(),
  lastUpdated: null,
  loading: false,
  error: null,

  fetchMembers: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('display_name');

      if (error) throw error;
      set({ members: data || [], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch members', loading: false });
    }
  },

  fetchMonthlyStats: async (yearMonth: string) => {
    set({ loading: true, error: null });
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      // Fetch active members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, display_name, accumulated_exp')
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Fetch certifications for the month
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('member_id, cert_date, final_exp')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      // Calculate monthly stats per member
      const statsMap: Record<string, { exp: number; count: number; days: Set<string> }> = {};

      for (const cert of certsData || []) {
        if (!statsMap[cert.member_id]) {
          statsMap[cert.member_id] = { exp: 0, count: 0, days: new Set() };
        }
        statsMap[cert.member_id].exp += cert.final_exp || 0;
        statsMap[cert.member_id].count += 1;
        statsMap[cert.member_id].days.add(cert.cert_date);
      }

      const stats: MemberStats[] = (membersData || []).map(member => ({
        id: member.id,
        display_name: member.display_name,
        accumulated_exp: member.accumulated_exp || 0,
        monthly_exp: statsMap[member.id]?.exp || 0,
        cert_count: statsMap[member.id]?.count || 0,
        cert_days: statsMap[member.id]?.days.size || 0,
      }));

      // Sort by monthly exp descending
      stats.sort((a, b) => b.monthly_exp - a.monthly_exp);

      // Format current time for lastUpdated
      const now = new Date();
      const lastUpdated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      set({ monthlyStats: stats, lastUpdated, loading: false });
    } catch (error) {
      console.error('Failed to fetch monthly stats:', error);
      set({ error: 'Failed to fetch monthly stats', loading: false });
    }
  },

  updateMember: async (id: string, data: Partial<Member>) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await get().fetchMembers();
      return true;
    } catch (error) {
      set({ error: 'Failed to update member' });
      return false;
    }
  },

  setSelectedMonth: (month: string) => {
    set({ selectedMonth: month });
  },
}));

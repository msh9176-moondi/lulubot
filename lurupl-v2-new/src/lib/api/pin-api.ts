/**
 * PIN 인증 API
 */

import { supabase } from '../supabase';

/**
 * 멤버의 PIN 설정
 */
export async function setMemberPin(memberId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_member_pin', {
    p_member_id: memberId,
    p_pin: pin,
  });

  if (error) {
    console.error('Failed to set PIN:', error);
    return false;
  }

  return data === true;
}

/**
 * 멤버의 PIN 인증
 */
export async function verifyMemberPin(memberId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_member_pin', {
    p_member_id: memberId,
    p_pin: pin,
  });

  if (error) {
    console.error('Failed to verify PIN:', error);
    return false;
  }

  return data === true;
}

/**
 * 멤버의 PIN 존재 여부 확인
 */
export async function hasMemberPin(memberId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('members')
    .select('pin')
    .eq('id', memberId)
    .single();

  if (error || !data) return false;
  return data.pin !== null;
}

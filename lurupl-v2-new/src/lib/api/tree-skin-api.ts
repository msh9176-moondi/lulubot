/**
 * 나무 스킨 (Tree Skins) API
 */

import { supabase } from '../supabase';

/**
 * 멤버의 현재 선택된 스킨 조회
 */
export async function getMemberTreeSkin(memberId: string): Promise<string> {
  const { data, error } = await supabase
    .from('members')
    .select('selected_tree_skin')
    .eq('id', memberId)
    .single();

  if (error) {
    console.error('Failed to get tree skin:', error);
    return 'default';
  }

  return data?.selected_tree_skin || 'default';
}

/**
 * 멤버의 스킨 변경
 * RPC 함수 사용 (RLS 우회, SECURITY DEFINER)
 */
export async function updateMemberTreeSkin(
  memberId: string,
  skinId: string
): Promise<boolean> {
  console.log('=== updateMemberTreeSkin RPC 호출 ===');
  console.log('memberId:', memberId);
  console.log('skinId:', skinId);

  const { data, error } = await supabase.rpc('update_member_tree_skin', {
    p_member_id: memberId,
    p_skin_id: skinId,
  });

  console.log('RPC 결과:', { data, error });

  if (error) {
    console.error('Failed to update tree skin:', error);
    return false;
  }

  // RPC 함수가 false를 반환하면 유효하지 않은 스킨 ID
  if (data === false) {
    console.error('Invalid skin ID:', skinId);
    return false;
  }

  return true;
}

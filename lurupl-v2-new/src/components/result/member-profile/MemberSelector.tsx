/**
 * MemberSelector Component
 * 멤버 선택 UI - 동기부여 탭에서 본인 선택용
 */

import { ChevronRight, Sparkles } from 'lucide-react';

interface Member {
  id: string;
  display_name: string;
}

interface MemberSelectorProps {
  members: Member[];
  onSelect: (member: Member) => void;
}

export function MemberSelector({ members, onSelect }: MemberSelectorProps) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-text">개인 페이지</h2>
        <p className="text-text-muted mt-2">
          본인을 선택하고 PIN을 입력해서 상세 활동을 확인하세요
        </p>
      </div>

      <div className="grid gap-2 max-h-96 overflow-y-auto">
        {members.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="w-full p-4 bg-bg rounded-lg border border-border text-left hover:border-primary/30 hover:bg-bg-hover transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-text">{member.display_name}</span>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default MemberSelector;

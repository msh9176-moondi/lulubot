/**
 * CertificationManagement - Refactored
 * 관리자용 인증 데이터 관리
 *
 * 분리된 컴포넌트:
 * - CertificationList: 인증 목록 탭
 * - BatchList: 배치 관리 탭
 * - EditCertModal: 수정 모달
 * - DeleteConfirmModal: 삭제 확인 모달
 */

import { useState, useEffect } from 'react';
import { useMembersStore } from '@/stores/membersStore';
import type { Certification, TabType } from './types';
import { CertificationList } from './CertificationList';
import { BatchList } from './BatchList';
import { EditCertModal } from './EditCertModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

const TABS = [
  { id: 'list' as TabType, label: '인증 목록', icon: '📋' },
  { id: 'batches' as TabType, label: '배치 관리', icon: '📦' },
  { id: 'stats' as TabType, label: '통계', icon: '📊' },
];

export function CertificationManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { fetchMembers } = useMembersStore();

  // Load members on mount
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex gap-2 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <CertificationList
          onEdit={setEditingCert}
          onDelete={setDeletingId}
        />
      )}

      {activeTab === 'batches' && <BatchList />}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <p className="text-text-muted text-center py-12">
            통계 기능은 준비 중입니다.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingCert && (
        <EditCertModal
          certification={editingCert}
          onClose={() => setEditingCert(null)}
          onSaved={() => {
            // Refresh will happen automatically due to state
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <DeleteConfirmModal
          certId={deletingId}
          onClose={() => setDeletingId(null)}
          onDeleted={() => {
            // List will refresh due to state change
          }}
        />
      )}
    </div>
  );
}

export default CertificationManagement;

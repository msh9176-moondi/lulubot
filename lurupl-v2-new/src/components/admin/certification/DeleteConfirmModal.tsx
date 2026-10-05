/**
 * DeleteConfirmModal Component
 * 인증 삭제 확인 모달
 */

import { Modal } from '@/components/common';
import { supabase } from '@/lib/supabase';

interface DeleteConfirmModalProps {
  certId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteConfirmModal({ certId, onClose, onDeleted }: DeleteConfirmModalProps) {
  const handleDelete = async () => {
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', certId);

    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      onDeleted(certId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="인증 삭제"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <p className="text-text">
          이 인증 기록을 정말 삭제하시겠습니까?
        </p>
        <p className="text-sm text-red-500">
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-bg-hover text-text rounded-lg hover:bg-border transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;

import { useCallback } from 'react';
import { updateMessage, deleteMessage } from '../lib/api.js';
import { todayLocal, toLocalDateString } from '../lib/dateUtil.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

export function useMessageActions(setMessages) {
  const { profile } = useAuth();
  const showToast = useToast();

  const canModify = useCallback((msg) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    // created_at 은 UTC ISO 문자열 → 로컬(KST) 기준 날짜로 변환 후 비교
    return msg.from_id === profile.id && toLocalDateString(msg.created_at) === todayLocal();
  }, [profile]);

  const handleEdit = useCallback(async (id, newText) => {
    try {
      const updated = await updateMessage(id, newText.trim());
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      return true;
    } catch (e) {
      showToast('수정 실패: ' + e.message, 'error');
      return false;
    }
  }, [setMessages, showToast]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('이 메시지를 삭제하시겠습니까?')) return false;
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
      return false;
    }
  }, [setMessages, showToast]);

  return { canModify, handleEdit, handleDelete };
}

import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const storageKey = (id) => `msg_last_seen_${id}`;

export function useMessageNotification() {
  const { profile } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState([]);

  const markAllRead = useCallback(() => {
    if (!profile?.id) return;
    localStorage.setItem(storageKey(profile.id), new Date().toISOString());
    setUnreadMessages([]);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const key = storageKey(profile.id);
    // 처음 로그인 시 현재 시점을 기준으로 설정 (이전 메시지는 알림 제외)
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, new Date().toISOString());
    }

    async function fetchUnread() {
      try {
        const msgs = await getMessages(profile.id);
        const lastSeen = new Date(localStorage.getItem(key));
        const unread = msgs.filter(
          m => m.to_id === profile.id && new Date(m.created_at) > lastSeen
        );
        setUnreadMessages(unread);
      } catch {
        // 조용히 실패
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  return { unreadMessages, unreadCount: unreadMessages.length, markAllRead };
}

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
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const key = storageKey(profile.id);
    const storedLastSeen = localStorage.getItem(key);
    // 처음 로그인 시 현재 시점을 기준으로 설정 (이전 메시지는 알림 제외)
    if (!storedLastSeen || Number.isNaN(Date.parse(storedLastSeen))) {
      localStorage.setItem(key, new Date().toISOString());
    }

    let active = true;
    let requestId = 0;

    async function fetchUnread() {
      const currentRequestId = ++requestId;
      try {
        const msgs = await getMessages(profile.id);
        const lastSeen = new Date(localStorage.getItem(key));
        const unread = msgs.filter(
          m => m.to_id === profile.id && new Date(m.created_at) > lastSeen
        );
        if (active && currentRequestId === requestId) setUnreadMessages(unread);
      } catch {
        // 조용히 실패
      }
    }

    let interval;

    function startPolling() {
      fetchUnread();
      interval = setInterval(fetchUnread, 10000);
    }

    function stopPolling() {
      clearInterval(interval);
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') startPolling();
      else stopPolling();
    }

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      requestId += 1;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [profile?.id]);

  return { unreadMessages, unreadCount: unreadMessages.length, markAllRead };
}

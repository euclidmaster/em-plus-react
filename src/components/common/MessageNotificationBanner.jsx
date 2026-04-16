import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function MessageNotificationBanner({ unreadMessages, onDismiss, onRead }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  if (!unreadMessages || unreadMessages.length === 0) return null;

  // 가장 최신 메시지 (created_at DESC 정렬이므로 index 0이 최신)
  const latest = unreadMessages[0];
  const chatPath = profile?.role === 'student' ? '/my/chat' : '/messages';

  const handleGoToMessages = () => {
    onRead();
    navigate(chatPath);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 24,
      zIndex: 10000,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(102,126,234,0.3)',
      border: '2px solid #667eea',
      padding: '16px 18px',
      minWidth: 300,
      maxWidth: 380,
      animation: 'msgBannerIn 0.3s cubic-bezier(.22,1,.36,1)',
    }}>
      {/* 상단: 발신자 정보 + 닫기 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 아바타 */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>
            {latest.from_name?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                {latest.from_name}
              </span>
              {unreadMessages.length > 1 && (
                <span style={{
                  background: '#667eea', color: '#fff',
                  borderRadius: 10, padding: '1px 7px',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {unreadMessages.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {formatTime(latest.created_at)}
            </div>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: 16, padding: '4px 6px',
            borderRadius: 6, lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.target.style.color = '#475569'}
          onMouseLeave={e => e.target.style.color = '#94a3b8'}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* 메시지 미리보기 */}
      <div style={{
        background: '#f5f7ff',
        borderRadius: 10,
        padding: '10px 13px',
        fontSize: 13,
        color: '#475569',
        lineHeight: 1.55,
        marginBottom: 13,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {latest.content}
      </div>

      {/* 추가 메시지 안내 */}
      {unreadMessages.length > 1 && (
        <div style={{ fontSize: 12, color: '#667eea', marginBottom: 10, fontWeight: 600 }}>
          <i className="fas fa-envelope" style={{ marginRight: 5 }}></i>
          외 {unreadMessages.length - 1}개 메시지가 더 있습니다
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleGoToMessages}
          style={{
            flex: 1, padding: '9px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', border: 'none', borderRadius: 9,
            cursor: 'pointer', fontWeight: 700, fontSize: 13,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <i className="fas fa-comment-dots" style={{ marginRight: 6 }}></i>
          메시지 확인하기
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '9px 14px',
            background: '#f1f5f9', color: '#64748b',
            border: 'none', borderRadius: 9,
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}

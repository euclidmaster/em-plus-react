import { useEffect, useRef, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getMessagesBetween, sendMessage } from '../../lib/api.js';
import { useToast } from '../../components/common/Toast.jsx';

export default function StudentChatPage() {
  const { student, loading } = useStudentSelf();
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const bottomRef               = useRef(null);
  const showToast = useToast();

  const teacher = student?.teachers ?? null;

  useEffect(() => {
    if (student && teacher?.profile_id && profile?.id) {
      load();
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
    }
  }, [student, teacher, profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  async function load() {
    if (!profile?.id || !teacher?.profile_id) return;
    try { setMessages(await getMessagesBetween(profile.id, teacher.profile_id)); }
    catch { /* 무시 */ }
  }

  async function send() {
    if (!text.trim()) return;
    if (!teacher?.profile_id) { showToast('담당 선생님이 없습니다.', 'error'); return; }
    try {
      await sendMessage({
        from_id:   profile.id,
        to_id:     teacher.profile_id,
        from_name: profile.name ?? student.name,
        to_name:   teacher.name,
        content:   text.trim(),
      });
      setText('');
      load();
    } catch (e) { showToast('전송 실패: ' + e.message, 'error'); }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return <p style={{ padding:40, textAlign:'center', color:'#64748b' }}>연결된 학생 계정이 없습니다.</p>;

  if (!teacher) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-user-slash" style={{ fontSize:32, color:'#94a3b8', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>담당 선생님이 배정되지 않았습니다.</p>
    </div>
  );

  if (!teacher.profile_id) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-link-slash" style={{ fontSize:32, color:'#f59e0b', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>
        담당 선생님 <strong>{teacher.name}</strong> 계정이 연결되지 않았습니다.<br />
        원장 선생님께 선생님 계정 연결을 요청하세요.
      </p>
    </div>
  );

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-comments"></i> 선생님과 대화</h2>
      </div>

      {/* 상대방 정보 */}
      <div className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'#4361ee', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 }}>
          {teacher.name[0]}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>{teacher.name} 선생님</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>{teacher.title ?? '담당 강사'}</div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column', height:460 }}>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {messages.length === 0
            ? (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:14 }}>
                <div style={{ textAlign:'center' }}>
                  <i className="fas fa-comment-dots" style={{ fontSize:32, marginBottom:12, display:'block' }}></i>
                  선생님께 첫 메시지를 보내보세요!
                </div>
              </div>
            )
            : messages.map(m => {
              const isMine = m.from_id === profile.id;
              return (
                <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>
                    {isMine ? '나' : `${m.from_name} 선생님`}
                  </div>
                  <div style={{
                    maxWidth:'70%', padding:'10px 14px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? '#4361ee' : '#f1f5f9',
                    color: isMine ? '#fff' : '#1e293b',
                    fontSize:14, lineHeight:1.5, wordBreak:'break-word',
                  }}>{m.content}</div>
                  <div style={{ fontSize:11, color:'#cbd5e1', marginTop:3 }}>
                    {new Date(m.created_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              );
            })
          }
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10, alignItems:'flex-end', background:'#fafafa' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            rows={2}
            style={{ flex:1, padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, resize:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5 }}
          />
          <button onClick={send} style={{
            padding:'10px 16px', background:'#4361ee', color:'#fff', border:'none', borderRadius:10,
            cursor:'pointer', fontSize:14, fontWeight:600, flexShrink:0, alignSelf:'flex-end',
          }}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

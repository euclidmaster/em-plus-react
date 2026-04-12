import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { supabase } from '../lib/supabase.js';

const ROLE_LABEL = { admin:'원장', teacher:'강사', assistant:'조교', student:'학생' };

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const showToast = useToast();

  const [name, setName]       = useState(profile?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw]   = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) { showToast('이름을 입력하세요.', 'error'); return; }
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id);
      if (error) throw error;
      showToast('이름이 변경되었습니다. 새로고침 후 반영됩니다.');
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
    finally { setSavingName(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!newPw) { showToast('새 비밀번호를 입력하세요.', 'error'); return; }
    if (newPw.length < 6) { showToast('비밀번호는 6자 이상이어야 합니다.', 'error'); return; }
    if (newPw !== confirmPw) { showToast('새 비밀번호가 일치하지 않습니다.', 'error'); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showToast('비밀번호가 변경되었습니다.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) { showToast('변경 실패: ' + e.message, 'error'); }
    finally { setSavingPw(false); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-cog"></i> 내 계정 정보</h2>
      </div>

      <div style={{ display:'grid', gap:16, maxWidth:480 }}>

        {/* 계정 요약 */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{
              width:56, height:56, borderRadius:'50%',
              background:'linear-gradient(135deg,#667eea,#764ba2)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, fontWeight:700, flexShrink:0,
            }}>
              {(profile?.name ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'#1e293b' }}>{profile?.name}</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:3 }}>
                <span style={{
                  background:'#ede9fe', color:'#7c3aed',
                  fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, marginRight:6,
                }}>
                  {ROLE_LABEL[profile?.role] ?? profile?.role}
                </span>
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* 이름 변경 */}
        <div className="card">
          <div className="card-header" style={{ marginBottom:16 }}>
            <h3><i className="fas fa-user-edit"></i> 이름 변경</h3>
          </div>
          <form onSubmit={saveName} style={{ display:'grid', gap:12 }}>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="이름 입력"
              style={{ padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }}
            />
            <button type="submit" disabled={savingName} style={{
              padding:'10px', background:'#4361ee', color:'#fff',
              border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer',
            }}>
              {savingName ? '저장 중...' : '이름 저장'}
            </button>
          </form>
        </div>

        {/* 비밀번호 변경 */}
        <div className="card">
          <div className="card-header" style={{ marginBottom:16 }}>
            <h3><i className="fas fa-lock"></i> 비밀번호 변경</h3>
          </div>
          <form onSubmit={savePassword} style={{ display:'grid', gap:12 }}>
            <input
              type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              style={{ padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }}
            />
            <input
              type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="새 비밀번호 확인"
              style={{ padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }}
            />
            <button type="submit" disabled={savingPw} style={{
              padding:'10px', background:'#4361ee', color:'#fff',
              border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer',
            }}>
              {savingPw ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

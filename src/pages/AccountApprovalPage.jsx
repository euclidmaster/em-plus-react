import { useEffect, useState } from 'react';
import { getPendingProfiles, approveProfile, rejectProfile } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';

const ROLE_LABEL = { student:'학생', teacher:'강사', assistant:'조교' };
const ROLE_COLOR = { student:'#4361ee', teacher:'#7209b7', assistant:'#0891b2' };

export default function AccountApprovalPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  async function load() {
    setLoading(true);
    try { setPending(await getPendingProfiles()); }
    catch { showToast('목록 로드 실패', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(p) {
    try {
      await approveProfile(p.id);
      showToast(`${p.name}님을 승인했습니다.`);
      setPending(prev => prev.filter(x => x.id !== p.id));
    } catch { showToast('승인 실패', 'error'); }
  }

  async function handleReject(p) {
    if (!confirm(`"${p.name}"님의 가입을 거절하시겠습니까?\n계정이 삭제됩니다.`)) return;
    try {
      await rejectProfile(p.id);
      showToast(`${p.name}님의 가입을 거절했습니다.`);
      setPending(prev => prev.filter(x => x.id !== p.id));
    } catch { showToast('거절 실패', 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-check"></i> 계정 승인 관리</h2>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <h3>가입 승인 대기 ({pending.length}명)</h3>
        </div>

        {loading ? (
          <p style={{ textAlign:'center', color:'#94a3b8', padding:30 }}>로딩 중...</p>
        ) : pending.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <i className="fas fa-check-circle" style={{ fontSize:40, color:'#22c55e', display:'block', marginBottom:12 }}></i>
            <p style={{ color:'#64748b', fontSize:14 }}>승인 대기 중인 계정이 없습니다.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {pending.map(p => (
              <div key={p.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 16px', border:'1.5px solid #e2e8f0', borderRadius:10,
                background:'#f8fafc',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%',
                    background: ROLE_COLOR[p.role] ?? '#94a3b8',
                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, fontWeight:700, flexShrink:0,
                  }}>
                    {(p.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      <span style={{
                        background: ROLE_COLOR[p.role] ?? '#94a3b8',
                        color:'#fff', fontSize:11, fontWeight:600,
                        padding:'2px 8px', borderRadius:20, marginRight:6,
                      }}>
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                      {new Date(p.created_at).toLocaleDateString('ko-KR')} 가입
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={() => handleApprove(p)} style={{
                    padding:'7px 14px', background:'#4361ee', color:'#fff',
                    border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
                  }}>
                    <i className="fas fa-check"></i> 승인
                  </button>
                  <button onClick={() => handleReject(p)} style={{
                    padding:'7px 14px', background:'#fff', color:'#dc2626',
                    border:'1.5px solid #fca5a5', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
                  }}>
                    <i className="fas fa-times"></i> 거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

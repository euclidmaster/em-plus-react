import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getHomeworks } from '../../lib/api.js';
import { useToast } from '../../components/common/Toast.jsx';

export default function StudentHomeworkPage() {
  const { student, loading } = useStudentSelf();
  const [homeworks, setHomeworks] = useState([]);
  const [filter, setFilter]       = useState('미완료'); // '전체' | '미완료' | '완료'
  const showToast = useToast();

  useEffect(() => {
    if (student) load();
  }, [student]);

  async function load() {
    try { setHomeworks(await getHomeworks(student.id)); }
    catch { showToast('숙제 로드 실패', 'error'); }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return <p style={{ padding:40, textAlign:'center', color:'#64748b' }}>연결된 학생 계정이 없습니다.</p>;

  const filtered = filter === '전체' ? homeworks
    : filter === '완료' ? homeworks.filter(h => h.is_done)
    : homeworks.filter(h => !h.is_done);

  const pending  = homeworks.filter(h => !h.is_done).length;
  const done     = homeworks.filter(h => h.is_done).length;
  const total    = homeworks.length;
  const rate     = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-tasks"></i> 나의 숙제</h2>
      </div>

      {/* 완료율 바 */}
      <div className="card" style={{ marginBottom:20, padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>숙제 완료율</span>
          <span style={{ fontWeight:700, fontSize:18, color: rate === 100 ? '#16a34a' : '#4361ee' }}>{rate}%</span>
        </div>
        <div style={{ height:10, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${rate}%`, background: rate === 100 ? '#22c55e' : '#4361ee', borderRadius:5, transition:'width 0.4s' }} />
        </div>
        <div style={{ display:'flex', gap:16, marginTop:10, fontSize:13, color:'#64748b' }}>
          <span>전체 {total}개</span>
          <span style={{ color:'#16a34a' }}>완료 {done}개</span>
          <span style={{ color:'#ef4444' }}>미완료 {pending}개</span>
        </div>
      </div>

      {/* 필터 탭 */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['미완료','전체','완료'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
            border:'1.5px solid ' + (filter===f ? '#4361ee' : '#e2e8f0'),
            background: filter===f ? '#4361ee' : '#fff',
            color: filter===f ? '#fff' : '#475569',
          }}>{f}</button>
        ))}
      </div>

      <div className="card">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['완료 여부','마감일','과목','교재','범위'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>숙제가 없습니다.</td></tr>
              : filtered.map(hw => {
                const overdue = !hw.is_done && hw.due_date < new Date().toISOString().slice(0,10);
                return (
                  <tr key={hw.id} style={{ borderBottom:'1px solid #f1f5f9', opacity: hw.is_done ? 0.55 : 1, background: overdue ? '#fff5f5' : '' }}>
                    <td style={{ padding:'10px 14px', textAlign:'center' }}>
                      {hw.is_done
                        ? <i className="fas fa-check-circle" style={{ color:'#16a34a', fontSize:16 }}></i>
                        : <i className="far fa-circle" style={{ color:'#cbd5e1', fontSize:16 }}></i>
                      }
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>
                      <span style={{ color: overdue ? '#dc2626' : '#1e293b', fontWeight: overdue ? 700 : 400 }}>
                        {hw.due_date}
                        {overdue && <span style={{ marginLeft:6, fontSize:11, background:'#fee2e2', color:'#dc2626', padding:'1px 6px', borderRadius:10 }}>기한 초과</span>}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', fontWeight:600, fontSize:13 }}>{hw.subject}</td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>{hw.material||'-'}</td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>
                      <span style={{ textDecoration: hw.is_done ? 'line-through' : 'none', color: hw.is_done ? '#94a3b8' : '#1e293b' }}>
                        {hw.hw_range||'-'}
                      </span>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getPerformances } from '../../lib/api.js';

export default function StudentPerformancePage() {
  const { student, loading } = useStudentSelf();
  const [performances, setPerformances] = useState([]);
  const [filter, setFilter]             = useState('전체');

  useEffect(() => {
    if (student) {
      getPerformances(student.id).then(setPerformances).catch(console.error);
    }
  }, [student]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );

  const subjects = ['전체', ...new Set(performances.map(p => p.subject))];
  const filtered = filter === '전체' ? performances : performances.filter(p => p.subject === filter);

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-clipboard-check"></i> 수행 관리</h2>
      </div>

      {/* 요약 카드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        <SummaryCard icon="fa-clipboard-list" label="전체 기록" value={`${performances.length}건`} color="#4361ee" bg="#eef2ff" />
        <SummaryCard icon="fa-book" label="과목 수" value={`${subjects.length - 1}과목`} color="#7209b7" bg="#f3e8ff" />
        {performances.length > 0 && (
          <SummaryCard icon="fa-calendar" label="최근 수행일"
            value={performances[0]?.eval_date ?? '-'} color="#f59e0b" bg="#fffbeb" />
        )}
      </div>

      {/* 과목 필터 */}
      {subjects.length > 1 && (
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {subjects.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
              border:'1.5px solid ' + (filter === s ? '#4361ee' : '#e2e8f0'),
              background: filter === s ? '#4361ee' : '#fff',
              color: filter === s ? '#fff' : '#475569',
              transition:'all 0.15s',
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* 목록 */}
      {filtered.length === 0
        ? <div className="card" style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <i className="fas fa-clipboard" style={{ fontSize:32, marginBottom:12, display:'block' }}></i>
            수행 기록이 없습니다.
          </div>
        : <div style={{ display:'grid', gap:12 }}>
            {filtered.map(p => (
              <div key={p.id} className="card">
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom: p.content ? 8 : 0 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#eef2ff', color:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                    <i className="fas fa-star"></i>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, color:'#4361ee', fontSize:14 }}>{p.subject}</span>
                      {p.eval_format && <span style={{ fontSize:13, color:'#64748b' }}>{p.eval_format}</span>}
                      {p.session_no  && <span style={{ fontSize:12, color:'#94a3b8', background:'#f1f5f9', padding:'1px 8px', borderRadius:10 }}>#{p.session_no}회차</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{p.eval_date}</span>
                </div>
                {p.content && (
                  <p style={{ fontSize:14, color:'#475569', lineHeight:1.6, margin:0, paddingLeft:46 }}>{p.content}</p>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function SummaryCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:16 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:17, fontWeight:700, color:'#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getAttendances } from '../../lib/api.js';
import { useToast } from '../../components/common/Toast.jsx';

const STATUS_STYLE = {
  '출석': { background:'#dcfce7', color:'#16a34a' },
  '지각': { background:'#fef9c3', color:'#92400e' },
  '결석': { background:'#fee2e2', color:'#dc2626' },
};

export default function StudentAttendancePage() {
  const { student, loading } = useStudentSelf();
  const [records, setRecords] = useState([]);
  const [filter, setFilter]   = useState('전체');
  const showToast = useToast();

  useEffect(() => {
    if (student) load();
  }, [student]);

  async function load() {
    try { setRecords(await getAttendances(student.id, null)); }
    catch { showToast('출석 기록 로드 실패', 'error'); }
  }

  if (loading) return <Spinner />;
  if (!student) return <NoStudent />;

  const filtered = filter === '전체' ? records
    : records.filter(r => r.status === filter);

  const total   = records.length;
  const attend  = records.filter(r => r.status === '출석').length;
  const late    = records.filter(r => r.status === '지각').length;
  const absent  = records.filter(r => r.status === '결석').length;
  const rate    = total ? Math.round((attend / total) * 100) : 0;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-check"></i> 출석 기록</h2>
      </div>

      {/* 요약 카드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        <SummaryCard label="출석율" value={`${rate}%`} color="#4361ee" bg="#eef2ff" icon="fa-chart-pie" />
        <SummaryCard label="출석" value={`${attend}회`} color="#16a34a" bg="#dcfce7" icon="fa-check-circle" />
        <SummaryCard label="지각" value={`${late}회`}   color="#92400e" bg="#fef9c3" icon="fa-clock" />
        <SummaryCard label="결석" value={`${absent}회`} color="#dc2626" bg="#fee2e2" icon="fa-times-circle" />
      </div>

      {/* 필터 */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['전체','출석','지각','결석'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
            border:'1.5px solid ' + (filter===f ? '#4361ee' : '#e2e8f0'),
            background: filter===f ? '#4361ee' : '#fff',
            color: filter===f ? '#fff' : '#475569',
          }}>{f}</button>
        ))}
      </div>

      {/* 출석 목록 */}
      <div className="card">
        {filtered.length === 0
          ? <p style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
              <i className="fas fa-calendar-times" style={{ fontSize:28, marginBottom:10, display:'block' }}></i>
              출석 기록이 없습니다.
            </p>
          : (
            <div style={{ display:'grid', gap:0 }}>
              {filtered.map((r, i) => (
                <div key={r.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'14px 0',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ textAlign:'center', minWidth:50 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{r.att_date?.slice(5)}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>
                        {r.att_date && new Date(r.att_date).toLocaleDateString('ko-KR', { weekday:'short' })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14, color:'#1e293b', marginBottom:2 }}>
                        {r.start_time ? r.start_time.slice(0,5) + ' 등원' : '-'}
                        {r.end_time ? ` → ${r.end_time.slice(0,5)} 하원` : ''}
                      </div>
                      {r.teachers?.name && (
                        <div style={{ fontSize:12, color:'#94a3b8' }}>
                          <i className="fas fa-chalkboard-teacher" style={{ marginRight:4 }}></i>
                          {r.teachers.name} 선생님
                        </div>
                      )}
                      {r.report_content && (
                        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{r.report_content}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, flexShrink:0,
                    ...(STATUS_STYLE[r.status] ?? { background:'#f1f5f9', color:'#64748b' }),
                  }}>{r.status ?? '-'}</span>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:12, padding:16 }}>
      <div style={{ width:36, height:36, borderRadius:9, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

function Spinner() { return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>; }
function NoStudent() {
  return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize:32, color:'#f59e0b', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );
}

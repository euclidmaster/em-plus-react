import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getHomeworks, getDailyRecords, getAttendances } from '../../lib/api.js';

export default function StudentHomePage() {
  const { student, loading } = useStudentSelf();
  const [pendingHw, setPendingHw]     = useState(0);
  const [todayAtt, setTodayAtt]       = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);

  useEffect(() => {
    if (!student) return;
    const today = new Date().toISOString().slice(0, 10);

    getHomeworks(student.id).then(hws => {
      setPendingHw(hws.filter(h => !h.is_done).length);
    }).catch(console.error);

    getAttendances(student.id, today).then(atts => {
      setTodayAtt(atts[0] ?? null);
    }).catch(console.error);

    getDailyRecords(student.id, null).then(records => {
      setRecentRecords(records.slice(0, 5));
    }).catch(console.error);
  }, [student]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize:32, color:'#f59e0b', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );

  const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-home"></i> 나의 학습</h2>
      </div>

      {/* 환영 배너 */}
      <div style={{
        background:'linear-gradient(135deg, #4361ee, #7209b7)',
        borderRadius:16, padding:'28px 32px', marginBottom:24, color:'#fff',
      }}>
        <div style={{ fontSize:13, opacity:0.8, marginBottom:8 }}>{today}</div>
        <h3 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>
          안녕하세요, <span style={{ color:'#a5b4fc' }}>{student.name}</span> 학생! 👋
        </h3>
        <p style={{ fontSize:14, opacity:0.85 }}>
          {student.grade} · {student.class_name ?? '반 미배정'} ·{' '}
          {student.teachers?.name ? `${student.teachers.name} 선생님 담당` : '담당 선생님 미배정'}
        </p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard icon="fa-tasks" label="미완료 숙제" value={`${pendingHw}개`}
          color={pendingHw > 0 ? '#ef4444' : '#22c55e'} bg={pendingHw > 0 ? '#fef2f2' : '#f0fdf4'} />
        <StatCard icon="fa-user-check" label="오늘 출석"
          value={todayAtt ? `${todayAtt.start_time ?? '?'} 등원` : '미기록'}
          color={todayAtt ? '#4361ee' : '#94a3b8'} bg="#f0f4ff" />
        <StatCard icon="fa-book-open" label="최근 학습 기록" value={`${recentRecords.length}건`}
          color="#7209b7" bg="#f3e8ff" />
      </div>

      {/* 최근 학습 기록 */}
      {recentRecords.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ marginBottom:12 }}>
            <h3><i className="fas fa-history"></i> 최근 학습 기록</h3>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {recentRecords.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontWeight:700, color:'#4361ee', marginRight:10 }}>{r.subject}</span>
                  <span style={{ fontSize:13, color:'#64748b' }}>{r.material || '-'} · {r.study_range || '-'}</span>
                </div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>{r.record_date} · {r.study_minutes}분</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:16, padding:20 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

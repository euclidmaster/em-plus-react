import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getRecentActivity, getTodaySchedule } from '../lib/api.js';

export default function DashboardPage() {
  const [stats, setStats]       = useState(null);
  const [activity, setActivity] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentActivity(), getTodaySchedule()])
      .then(([s, a, sc]) => { setStats(s); setActivity(a); setSchedule(sc); })
      .catch(console.error);
  }, []);

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-home"></i> 홈 대시보드</h2>
        <p className="section-desc">EM플러스학원 학습관리 시스템의 전체 현황을 한눈에 확인합니다.</p>
      </div>

      <div className="stats-grid">
        <StatCard color="blue"   icon="fa-users"               value={stats?.totalStudents  ?? '-'} label="전체 학생"          sub={`재원중 ${stats?.activeStudents ?? '-'}명`} onClick={() => navigate('/students')} />
        <StatCard color="green"  icon="fa-user-check"          value={stats?.todayAttended  ?? '-'} label="오늘 출석"          sub={`${stats?.attendanceRate ?? 0}% 출석률`}   onClick={() => navigate('/attendance')} />
        <StatCard color="orange" icon="fa-tasks"               value={`${stats?.homeworkRate ?? 0}%`} label="이번주 숙제 완료율" sub=""                                        onClick={() => navigate('/homework')} />
        <StatCard color="purple" icon="fa-chalkboard-teacher"  value={stats?.totalTeachers  ?? '-'} label="전체 강사"          sub=""                                         onClick={() => navigate('/teachers')} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:20 }}>
        {/* 최근 활동 */}
        <div className="card">
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3><i className="fas fa-bolt"></i> 최근 활동</h3>
            <button onClick={() => navigate('/daily-record')} style={moreBtnStyle}>
              전체 보기 <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="activity-list">
            {activity.length === 0
              ? <p style={{ textAlign:'center', color:'#94a3b8', padding:20 }}>활동이 없습니다.</p>
              : activity.map(r => (
                <div
                  className="activity-item"
                  key={r.id}
                  onClick={() => navigate(`/student-info?id=${r.students?.id}`)}
                  style={{ cursor:'pointer' }}
                >
                  <div className="act-icon blue-act"><i className="fas fa-book-open"></i></div>
                  <div className="act-info">
                    <span className="act-name">{r.students?.name ?? '-'}</span>
                    <span className="act-desc">{r.subject} — {r.study_range ?? ''}</span>
                  </div>
                  <span className="act-time">{timeAgo(r.created_at)}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* 오늘 일정 */}
        <div className="card">
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3><i className="fas fa-calendar-day"></i> 오늘 일정</h3>
            <button onClick={() => navigate('/attendance')} style={moreBtnStyle}>
              전체 보기 <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="schedule-list">
            {schedule.length === 0
              ? <p style={{ textAlign:'center', color:'#94a3b8', padding:20 }}>오늘 일정이 없습니다.</p>
              : schedule.map(a => (
                <div
                  className="schedule-item regular"
                  key={a.id}
                  onClick={() => navigate(`/student-info?id=${a.students?.id}`)}
                  style={{ cursor:'pointer' }}
                >
                  <div className="sched-time">{a.start_time?.slice(0,5) ?? '미정'}</div>
                  <div className="sched-info">
                    <span className="sched-type">정규관리</span>
                    <span className="sched-name">{a.students?.name}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ color, icon, value, label, sub, onClick }) {
  return (
    <div
      className={`stat-card ${color}`}
      onClick={onClick}
      style={{ cursor:'pointer', transition:'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
    >
      <div className="stat-icon"><i className={`fas ${icon}`}></i></div>
      <div className="stat-info">
        <span className="stat-number">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      {sub && <div className="stat-trend">{sub}</div>}
    </div>
  );
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}

const moreBtnStyle = {
  fontSize:12, color:'#667eea', background:'none', border:'none',
  cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4,
};

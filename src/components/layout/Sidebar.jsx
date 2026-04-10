import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ADMIN_NAV = [
  { group: '대시보드', items: [
    { to: '/',              icon: 'fa-home',              label: '홈 대시보드' },
  ]},
  { group: '학생 정보', items: [
    { to: '/students',      icon: 'fa-users',             label: '학생 명단' },
    { to: '/student-info',  icon: 'fa-user-graduate',     label: '개인정보 관리' },
    { to: '/grades',        icon: 'fa-chart-bar',         label: '성적 관리' },
  ]},
  { group: '학습 현황', items: [
    { to: '/weekly-plan',   icon: 'fa-calendar-week',     label: '주간 학습 플랜' },
    { to: '/daily-record',  icon: 'fa-book-open',         label: '일일 학습 기록' },
    { to: '/homework',      icon: 'fa-tasks',             label: '숙제 관리' },
    { to: '/performance',   icon: 'fa-clipboard-check',   label: '수행 관리' },
    { to: '/report',        icon: 'fa-chart-line',        label: '학습 리포트' },
  ]},
  { group: '운영 관리', items: [
    { to: '/board',         icon: 'fa-bullhorn',          label: '학원 게시판' },
    { to: '/attendance',    icon: 'fa-user-check',        label: '출석 관리' },
    { to: '/teachers',      icon: 'fa-chalkboard-teacher',label: '선생님 관리' },
  ]},
];

const STUDENT_NAV = [
  { group: '나의 학습', items: [
    { to: '/my',              icon: 'fa-home',          label: '홈' },
    { to: '/my/attendance',   icon: 'fa-user-check',    label: '출석 기록' },
    { to: '/my/weekly-plan',  icon: 'fa-calendar-week', label: '주간 플랜' },
    { to: '/my/daily-record', icon: 'fa-book-open',     label: '일일 기록' },
    { to: '/my/homework',     icon: 'fa-tasks',         label: '숙제 확인' },
  ]},
  { group: '소통', items: [
    { to: '/my/chat', icon: 'fa-comments', label: '선생님과 대화' },
  ]},
];

export default function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? 'student';

  const roleLabel = { admin:'원장', teacher:'강사', assistant:'조교', student:'학생' }[role] ?? role;
  const roleIcon  = { admin:'fa-shield-alt', teacher:'fa-chalkboard-teacher', assistant:'fa-chalkboard-teacher', student:'fa-user-graduate' }[role] ?? 'fa-user';
  const avatar    = (profile?.name ?? '?')[0].toUpperCase();

  const nav = role === 'student' ? STUDENT_NAV : ADMIN_NAV;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-icon"><i className="fas fa-graduation-cap"></i></div>
            <div className="logo-text">
              <span className="logo-em">EM<span className="logo-plus">+</span></span>
              <span className="logo-sub">학습관리 시스템</span>
            </div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{avatar}</div>
          <div className="user-info">
            <span className="user-name">{profile?.name ?? '사용자'}</span>
            <span className={`user-role${role === 'admin' ? ' admin-role' : ''}`}>
              <i className={`fas ${roleIcon}`}></i> {roleLabel}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(group => (
            <div className="nav-group" key={group.group}>
              <span className="nav-group-label">{group.group}</span>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/my'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding:'16px 20px', borderTop:'1px solid #1e293b', marginTop:'auto' }}>
          <button
            onClick={handleSignOut}
            style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid #334155', borderRadius:8, color:'#94a3b8', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}
          >
            <i className="fas fa-sign-out-alt"></i> 로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}

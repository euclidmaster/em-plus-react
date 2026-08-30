import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useState, useEffect, memo } from 'react';

const ADMIN_NAV = [
  { group: '대시보드', icon: 'fa-home', items: [
    { to: '/',              icon: 'fa-home',              label: '홈 대시보드' },
  ]},
  { group: '학생 정보', icon: 'fa-users', items: [
    { to: '/students',      icon: 'fa-users',             label: '학생 명단' },
    { to: '/student-info',  icon: 'fa-user-graduate',     label: '개인정보 관리', permission: 'can_view_personal_info' },
    { to: '/grades',        icon: 'fa-chart-bar',         label: '성적 관리',     permission: 'can_view_grades' },
    { to: '/subject-guide', icon: 'fa-graduation-cap',    label: '교과선택 가이드' },
  ]},
  { group: '학습 현황', icon: 'fa-book-open', items: [
    { to: '/weekly-plan',   icon: 'fa-calendar-week',     label: '주간 학습 플랜' },
    { to: '/daily-record',  icon: 'fa-book-open',         label: '일일 학습 기록' },
    { to: '/homework',      icon: 'fa-tasks',             label: '숙제 관리' },
    { to: '/routine',       icon: 'fa-clipboard-list',    label: '루틴 체크리스트' },
    { to: '/performance',   icon: 'fa-clipboard-check',   label: '수행 관리' },
    { to: '/clinic',        icon: 'fa-stethoscope',       label: '클리닉 관리' },
    { to: '/clinic-report', icon: 'fa-file-medical-alt',  label: '클리닉 리포트' },
    { to: '/report',        icon: 'fa-chart-line',        label: '학습 리포트',   permission: 'can_view_report' },
  ]},
  { group: '운영 관리', icon: 'fa-cog', items: [
    { to: '/board',         icon: 'fa-bullhorn',          label: '학원 게시판' },
    { to: '/attendance',    icon: 'fa-user-check',        label: '출석 관리' },
    { to: '/classes',       icon: 'fa-users-rectangle',   label: '반 관리' },
    { to: '/teachers',      icon: 'fa-chalkboard-teacher',label: '선생님 관리', adminOnly: true },
    { to: '/messages',      icon: 'fa-comments',          label: '대화 열람',     adminOnly: true },
  ]},
  { group: '계정 관리', icon: 'fa-user-shield', items: [
    { to: '/approval',      icon: 'fa-user-shield',       label: '계정 승인',     adminOnly: true },
  ]},
];

const STUDENT_NAV = [
  { group: '학습 현황', icon: 'fa-book-open', items: [
    { to: '/my',              icon: 'fa-home',              label: '홈 대시보드' },
    { to: '/my/weekly-plan',  icon: 'fa-calendar-week',     label: '주간 학습 플랜' },
    { to: '/my/daily-record', icon: 'fa-book-open',         label: '일일 학습 기록' },
    { to: '/my/homework',     icon: 'fa-tasks',             label: '숙제 관리' },
    { to: '/my/performance',  icon: 'fa-clipboard-check',   label: '수행 관리' },
    { to: '/my/report',       icon: 'fa-chart-line',        label: '학습 리포트' },
  ]},
  { group: '출석 · 소통', icon: 'fa-comments', items: [
    { to: '/my/attendance',   icon: 'fa-user-check',        label: '출석 기록' },
    { to: '/my/chat',         icon: 'fa-comments',          label: '선생님과 대화' },
  ]},
];

const Sidebar = memo(function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { user, profile, signOut, teacherPermissions } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = profile?.role ?? 'student';

  const nav = role === 'student' ? STUDENT_NAV : ADMIN_NAV;

  // 모든 그룹을 기본으로 열린 상태로 (즐겨찾기 포함)
  const getInitialOpen = () => {
    const set = new Set(['즐겨찾기']);
    nav.forEach(g => set.add(g.group));
    return set;
  };
  const [openGroups, setOpenGroups] = useState(getInitialOpen);

  // 즐겨찾기 (localStorage 영속화, 역할별)
  const FAV_KEY = `emplus:favorites:${role}`;
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* ignore */ }
  }, [favorites, FAV_KEY]);

  function toggleFav(e, to) {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => prev.includes(to) ? prev.filter(x => x !== to) : [...prev, to]);
  }

  function isVisible(item) {
    if (item.adminOnly && role !== 'admin') return false;
    if (item.permission && role === 'teacher' && teacherPermissions) {
      return teacherPermissions[item.permission] !== false;
    }
    return true;
  }

  // 즐겨찾기된(그리고 현재 보이는) 항목들
  const favItems = [];
  const favSeen = new Set();
  nav.forEach(g => g.items.forEach(it => {
    if (favorites.includes(it.to) && isVisible(it) && !favSeen.has(it.to)) {
      favSeen.add(it.to);
      favItems.push(it);
    }
  }));

  function renderItem(item) {
    const fav = favorites.includes(item.to);
    return (
      <div key={item.to} style={{ position: 'relative' }}>
        <NavLink
          to={item.to}
          end={item.to === '/' || item.to === '/my'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onClose}
          style={!collapsed ? { paddingRight: 34 } : undefined}
        >
          <i className={`fas ${item.icon}`}></i>
          <span>{item.label}</span>
        </NavLink>
        {!collapsed && (
          <button
            onClick={e => toggleFav(e, item.to)}
            title={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 5, lineHeight: 1,
              color: fav ? '#f59e0b' : '#475569', fontSize: 12,
            }}
          >
            <i className="fas fa-star"></i>
          </button>
        )}
      </div>
    );
  }

  const roleLabel = { admin:'원장', teacher:'강사', assistant:'조교', student:'학생' }[role] ?? role;
  const roleIcon  = { admin:'fa-shield-alt', teacher:'fa-chalkboard-teacher', assistant:'fa-chalkboard-teacher', student:'fa-user-graduate' }[role] ?? 'fa-user';
  const avatar    = (profile?.name ?? '?')[0].toUpperCase();

  function toggleGroup(group) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <>
      {open && <div className="sidebar-overlay mobile-only" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`} id="sidebar">
        <button onClick={onToggleCollapse} className="sidebar-tab-btn" title={collapsed ? '확장' : '축소'}>
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
        </button>

        <div className="sidebar-header">
          <img src="/logo-light.png?v=2" alt="EM플러스학원" className="sidebar-logo" />
        </div>

        <div className="sidebar-user" onClick={() => { navigate('/profile'); onClose(); }}
          style={{ cursor:'pointer' }} title="내 계정 정보">
          <div className="user-avatar">{avatar}</div>
          <div className="user-info">
            <span className="user-name">{profile?.name ?? '사용자'}</span>
            <span className={`user-role${role === 'admin' ? ' admin-role' : ''}`}>
              <i className={`fas ${roleIcon}`}></i> {roleLabel}
            </span>
            {user?.email && (
              <span style={{ fontSize:11, color:'#64748b', marginTop:2, display:'block', wordBreak:'break-all' }}>
                {user.email}
              </span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* 즐겨찾기 */}
          {favItems.length > 0 && (
            <div className="nav-group">
              <button
                className="nav-group-toggle"
                onClick={() => toggleGroup('즐겨찾기')}
              >
                <span className="nav-group-toggle-left">
                  <i className="fas fa-star" style={{ color: '#f59e0b' }}></i>
                  <span className="nav-group-toggle-label">즐겨찾기</span>
                </span>
                <i className={`fas fa-chevron-${openGroups.has('즐겨찾기') ? 'up' : 'down'} nav-group-arrow`}></i>
              </button>
              <div className={`nav-group-items${openGroups.has('즐겨찾기') ? ' open' : ''}`}>
                {favItems.map(item => renderItem(item))}
              </div>
            </div>
          )}

          {nav.map(group => {
            const visibleItems = group.items.filter(isVisible);
            if (!visibleItems.length) return null;
            const isOpen = openGroups.has(group.group);
            const hasActive = visibleItems.some(item =>
              item.to === '/' || item.to === '/my'
                ? pathname === item.to
                : pathname.startsWith(item.to)
            );

            return (
              <div className="nav-group" key={group.group}>
                {/* 그룹 헤더 (클릭 시 아코디언 열기/닫기) */}
                <button
                  className={`nav-group-toggle${hasActive ? ' has-active' : ''}`}
                  onClick={() => toggleGroup(group.group)}
                >
                  <span className="nav-group-toggle-left">
                    <i className={`fas ${group.icon}`}></i>
                    <span className="nav-group-toggle-label">{group.group}</span>
                  </span>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} nav-group-arrow`}></i>
                </button>

                {/* 아코디언 하위 메뉴 */}
                <div className={`nav-group-items${isOpen ? ' open' : ''}`}>
                  {visibleItems.map(item => renderItem(item))}
                </div>
              </div>
            );
          })}
        </nav>

        <div style={{ padding:'16px 20px', borderTop:'1px solid #1e293b', marginTop:'auto' }}>
          <button onClick={handleSignOut} className="sidebar-signout"
            style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid #334155', borderRadius:8, color:'#94a3b8', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
            <i className="fas fa-sign-out-alt"></i>
            <span className="sidebar-logout-label">로그아웃</span>
          </button>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;

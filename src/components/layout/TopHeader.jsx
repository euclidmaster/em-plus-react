import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';

const BREADCRUMB = {
  '/':             '홈 대시보드',
  '/students':     '학생 명단',
  '/student-info': '학생 개인정보',
  '/grades':       '성적 관리',
  '/subject-guide':'교과선택 가이드',
  '/weekly-plan':  '주간 학습 플랜',
  '/daily-record': '일일 학습 기록',
  '/homework':     '숙제 관리',
  '/routine':      '루틴 체크리스트',
  '/performance':  '수행 관리',
  '/clinic':       '클리닉 관리',
  '/clinic-report':'클리닉 리포트',
  '/report':       '학습 리포트',
  '/messages':     '전체 대화 열람',
  '/board':        '학원 게시판',
  '/attendance':   '출석 관리',
  '/classes':      '반 관리',
  '/teachers':     '선생님 관리',
  '/approval':     '계정 승인',
  '/profile':      '내 계정 정보',
  '/my':           '홈',
  '/my/attendance':   '출석 기록',
  '/my/weekly-plan':  '주간 플랜',
  '/my/daily-record': '일일 기록',
  '/my/homework':     '숙제 확인',
  '/my/performance':  '수행 관리',
  '/my/report':       '학습 리포트',
  '/my/chat':         '선생님과 대화',
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// 날짜/시계/달력을 별도 컴포넌트로 분리 — 1초마다 리렌더가 여기서만 발생
const DateTimeCal = memo(function DateTimeCal() {
  const [now, setNow] = useState(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const calRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false);
    }
    if (calOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [calOpen]);

  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`;
  const timeStr = now.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const cells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [calYear, calMonth]);

  const isToday = useCallback((d) =>
    d === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear(),
    [now, calMonth, calYear]
  );

  const prevMonth = useCallback(() => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }, [calMonth]);

  const goToday = useCallback(() => {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  }, [now]);

  return (
    <div style={styles.dateWrapper} ref={calRef}>
      <div
        className="header-date"
        onClick={() => setCalOpen(o => !o)}
        style={styles.dateClickable}
      >
        <span style={styles.dateText}>
          <i className="fas fa-calendar-alt" style={styles.calIcon}></i>
          {dateStr}
        </span>
        <span style={styles.timeText}>
          <i className="fas fa-clock" style={styles.clockIcon}></i>
          {timeStr}
        </span>
      </div>

      {calOpen && (
        <div style={styles.calDropdown}>
          <div style={styles.calNav}>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <span style={styles.calMonthTitle}>{calYear}년 {MONTHS[calMonth]}</span>
            <button onClick={nextMonth} style={navBtn}>›</button>
          </div>
          <div style={styles.dayHeader}>
            {DAYS.map((d, i) => (
              <div key={d} style={{
                textAlign:'center', fontSize:11, fontWeight:600,
                color: i===0 ? '#ef4444' : i===6 ? '#3b82f6' : '#94a3b8',
                padding:'4px 0',
              }}>{d}</div>
            ))}
          </div>
          <div style={styles.calGrid}>
            {cells.map((d, i) => (
              <div key={i} style={{
                textAlign:'center', fontSize:12, fontWeight: isToday(d) ? 700 : 400,
                padding:'6px 2px', borderRadius:6,
                background: isToday(d) ? '#667eea' : 'transparent',
                color: isToday(d) ? '#fff'
                  : !d ? 'transparent'
                  : (i % 7 === 0) ? '#ef4444'
                  : (i % 7 === 6) ? '#3b82f6'
                  : '#1e293b',
              }}>
                {d ?? ''}
              </div>
            ))}
          </div>
          <button onClick={goToday} style={styles.todayBtn}>오늘로</button>
        </div>
      )}
    </div>
  );
});

const TopHeader = memo(function TopHeader({ onMenuToggle, unreadCount = 0, onBellClick }) {
  const { pathname } = useLocation();

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="breadcrumb" style={styles.breadcrumb}>
          {BREADCRUMB[pathname] ?? pathname}
        </div>
      </div>
      <div className="header-right" style={styles.headerRight}>
        <button
          onClick={onBellClick}
          style={{ ...styles.bellBtn, color: unreadCount > 0 ? '#667eea' : '#94a3b8' }}
          title={unreadCount > 0 ? `읽지 않은 메시지 ${unreadCount}개` : '새 메시지 없음'}
        >
          <i
            className="fas fa-bell"
            style={{ animation: unreadCount > 0 ? 'bellShake 0.5s ease' : 'none' }}
          ></i>
          {unreadCount > 0 && (
            <span style={styles.badge}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <DateTimeCal />
      </div>
    </header>
  );
});

export default TopHeader;

const navBtn = {
  background:'none', border:'none', cursor:'pointer',
  fontSize:18, color:'#64748b', padding:'2px 8px', borderRadius:6,
  lineHeight:1,
};

const styles = {
  breadcrumb: { fontSize:17, fontWeight:700 },
  headerRight: { position:'relative', display:'flex', alignItems:'center', gap:16 },
  bellBtn: {
    position:'relative', background:'none', border:'none',
    cursor:'pointer', fontSize:20, padding:'4px 6px', borderRadius:8,
    transition:'color 0.15s',
  },
  badge: {
    position:'absolute', top:0, right:0,
    background:'#ef4444', color:'#fff',
    borderRadius:'50%', width:18, height:18,
    fontSize:10, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center',
    border:'2px solid #fff',
  },
  dateWrapper: { position:'relative' },
  dateClickable: { cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:10 },
  dateText: { fontSize:14, fontWeight:600, color:'#475569' },
  calIcon: { marginRight:6, color:'#667eea' },
  timeText: { fontSize:14, fontWeight:700, color:'#667eea', fontVariantNumeric:'tabular-nums' },
  clockIcon: { marginRight:5 },
  calDropdown: {
    position:'absolute', top:'calc(100% + 10px)', right:0,
    background:'#fff', borderRadius:14, padding:16,
    boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
    border:'1px solid #e2e8f0', zIndex:999, width:260,
  },
  calNav: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  calMonthTitle: { fontWeight:700, fontSize:14, color:'#1e293b' },
  dayHeader: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 },
  calGrid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 },
  todayBtn: {
    marginTop:10, width:'100%', padding:'7px', border:'1.5px solid #e2e8f0',
    borderRadius:8, fontSize:12, fontWeight:600, color:'#667eea',
    background:'#f8f8ff', cursor:'pointer',
  },
};

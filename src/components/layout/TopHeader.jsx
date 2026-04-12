import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const BREADCRUMB = {
  '/':             '홈 대시보드',
  '/students':     '학생 명단',
  '/student-info': '학생 개인정보',
  '/grades':       '성적 관리',
  '/weekly-plan':  '주간 학습 플랜',
  '/daily-record': '일일 학습 기록',
  '/homework':     '숙제 관리',
  '/performance':  '수행 관리',
  '/report':       '학습 리포트',
  '/board':        '학원 게시판',
  '/attendance':   '출석 관리',
  '/teachers':     '선생님 관리',
  '/approval':     '계정 승인',
  '/profile':      '내 계정 정보',
  '/my':           '홈',
  '/my/attendance':   '출석 기록',
  '/my/weekly-plan':  '주간 플랜',
  '/my/daily-record': '일일 기록',
  '/my/homework':     '숙제 확인',
  '/my/chat':         '선생님과 대화',
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function TopHeader({ onMenuToggle }) {
  const { pathname } = useLocation();
  const [now, setNow] = useState(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const calRef = useRef(null);

  // 매 초 시간 업데이트
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 달력 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e) {
      if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false);
    }
    if (calOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [calOpen]);

  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`;
  const timeStr = now.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  // 달력 날짜 계산
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="breadcrumb" style={{ fontSize:17, fontWeight:700 }}>
          {BREADCRUMB[pathname] ?? pathname}
        </div>
      </div>
      <div className="header-right" style={{ position:'relative' }} ref={calRef}>
        <div
          className="header-date"
          onClick={() => setCalOpen(o => !o)}
          style={{ cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:10 }}
        >
          <span style={{ fontSize:14, fontWeight:600, color:'#475569' }}>
            <i className="fas fa-calendar-alt" style={{ marginRight:6, color:'#667eea' }}></i>
            {dateStr}
          </span>
          <span style={{ fontSize:14, fontWeight:700, color:'#667eea', fontVariantNumeric:'tabular-nums' }}>
            <i className="fas fa-clock" style={{ marginRight:5 }}></i>
            {timeStr}
          </span>
        </div>

        {/* 미니 달력 */}
        {calOpen && (
          <div style={{
            position:'absolute', top:'calc(100% + 10px)', right:0,
            background:'#fff', borderRadius:14, padding:16,
            boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
            border:'1px solid #e2e8f0', zIndex:999, width:260,
          }}>
            {/* 월 네비게이션 */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); }
                else setCalMonth(m => m-1);
              }} style={navBtn}>‹</button>
              <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>
                {calYear}년 {MONTHS[calMonth]}
              </span>
              <button onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); }
                else setCalMonth(m => m+1);
              }} style={navBtn}>›</button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{
                  textAlign:'center', fontSize:11, fontWeight:600,
                  color: i===0 ? '#ef4444' : i===6 ? '#3b82f6' : '#94a3b8',
                  padding:'4px 0',
                }}>{d}</div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
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

            {/* 오늘로 돌아가기 */}
            <button onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}
              style={{
                marginTop:10, width:'100%', padding:'7px', border:'1.5px solid #e2e8f0',
                borderRadius:8, fontSize:12, fontWeight:600, color:'#667eea',
                background:'#f8f8ff', cursor:'pointer',
              }}>
              오늘로
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const navBtn = {
  background:'none', border:'none', cursor:'pointer',
  fontSize:18, color:'#64748b', padding:'2px 8px', borderRadius:6,
  lineHeight:1,
};

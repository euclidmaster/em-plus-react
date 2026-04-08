import { useLocation } from 'react-router-dom';

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
};

export default function TopHeader({ onMenuToggle }) {
  const { pathname } = useLocation();
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월`;

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="breadcrumb">{BREADCRUMB[pathname] ?? pathname}</div>
      </div>
      <div className="header-right">
        <div className="header-date">
          <i className="fas fa-calendar"></i> {dateStr}
        </div>
      </div>
    </header>
  );
}

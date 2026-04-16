import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import TopHeader from './components/layout/TopHeader.jsx';
import MessageNotificationBanner from './components/common/MessageNotificationBanner.jsx';
import { useMessageNotification } from './hooks/useMessageNotification.js';

import LoginPage       from './pages/LoginPage.jsx';
import DashboardPage   from './pages/DashboardPage.jsx';
import StudentListPage from './pages/StudentListPage.jsx';
import StudentInfoPage from './pages/StudentInfoPage.jsx';
import GradePage       from './pages/GradePage.jsx';
import SubjectGuidePage from './pages/SubjectGuidePage.jsx';
import WeeklyPlanPage  from './pages/WeeklyPlanPage.jsx';
import DailyRecordPage from './pages/DailyRecordPage.jsx';
import HomeworkPage    from './pages/HomeworkPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import ClinicPage       from './pages/ClinicPage.jsx';
import ClinicReportPage from './pages/ClinicReportPage.jsx';
import ReportPage      from './pages/ReportPage.jsx';
import BoardPage       from './pages/BoardPage.jsx';
import AttendancePage  from './pages/AttendancePage.jsx';
import TeacherPage          from './pages/TeacherPage.jsx';
import AccountApprovalPage  from './pages/AccountApprovalPage.jsx';
import ProfilePage          from './pages/ProfilePage.jsx';
import MessagesPage         from './pages/MessagesPage.jsx';

// 학생 전용 페이지
import StudentHomePage        from './pages/student/StudentHomePage.jsx';
import StudentAttendancePage  from './pages/student/StudentAttendancePage.jsx';
import StudentWeeklyPlanPage  from './pages/student/StudentWeeklyPlanPage.jsx';
import StudentDailyRecordPage from './pages/student/StudentDailyRecordPage.jsx';
import StudentHomeworkPage    from './pages/student/StudentHomeworkPage.jsx';
import StudentPerformancePage from './pages/student/StudentPerformancePage.jsx';
import StudentReportPage      from './pages/student/StudentReportPage.jsx';
import StudentChatPage        from './pages/student/StudentChatPage.jsx';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useAuth();
  const role = profile?.role ?? 'admin';

  const { unreadMessages, unreadCount, markAllRead } = useMessageNotification();
  const [bannerVisible, setBannerVisible] = useState(false);
  const prevCountRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  // 새 메시지 도착 시 배너 표시
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setBannerVisible(true);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // 메시지 페이지 방문 시 자동으로 읽음 처리
  useEffect(() => {
    const msgPath = role === 'student' ? '/my/chat' : '/messages';
    if (location.pathname === msgPath) {
      markAllRead();
      setBannerVisible(false);
    }
  }, [location.pathname, role, markAllRead]);

  const handleBellClick = () => {
    const chatPath = role === 'student' ? '/my/chat' : '/messages';
    markAllRead();
    setBannerVisible(false);
    navigate(chatPath);
  };

  return (
    <div className={`app-wrapper${sidebarCollapsed ? ' sidebar-hidden' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(o => !o)}
      />
      <main className="main-content">
        <TopHeader
          onMenuToggle={() => setSidebarOpen(o => !o)}
          unreadCount={unreadCount}
          onBellClick={handleBellClick}
        />
        {bannerVisible && (
          <MessageNotificationBanner
            unreadMessages={unreadMessages}
            onDismiss={() => setBannerVisible(false)}
            onRead={() => { markAllRead(); setBannerVisible(false); }}
          />
        )}
        <div className="content-area">
          <Routes>
            {role === 'student' ? (
              /* ── 학생 전용 라우트 ── */
              <>
                <Route path="/my"               element={<StudentHomePage />} />
                <Route path="/my/attendance"    element={<StudentAttendancePage />} />
                <Route path="/my/weekly-plan"   element={<StudentWeeklyPlanPage />} />
                <Route path="/my/daily-record"  element={<StudentDailyRecordPage />} />
                <Route path="/my/homework"      element={<StudentHomeworkPage />} />
                <Route path="/my/performance"   element={<StudentPerformancePage />} />
                <Route path="/my/report"        element={<StudentReportPage />} />
                <Route path="/my/chat"          element={<StudentChatPage />} />
                <Route path="/profile"          element={<ProfilePage />} />
                <Route path="*"                 element={<Navigate to="/my" replace />} />
              </>
            ) : (
              /* ── 관리자 / 선생님 라우트 ── */
              <>
                <Route path="/"             element={<DashboardPage />} />
                <Route path="/students"     element={<StudentListPage />} />
                <Route path="/student-info" element={<StudentInfoPage />} />
                <Route path="/grades"       element={<GradePage />} />
                <Route path="/subject-guide" element={<SubjectGuidePage />} />
                <Route path="/weekly-plan"  element={<WeeklyPlanPage />} />
                <Route path="/daily-record" element={<DailyRecordPage />} />
                <Route path="/homework"     element={<HomeworkPage />} />
                <Route path="/performance"  element={<PerformancePage />} />
                <Route path="/clinic"        element={<ClinicPage />} />
                <Route path="/clinic-report" element={<ClinicReportPage />} />
                <Route path="/report"       element={<ReportPage />} />
                <Route path="/board"        element={<BoardPage />} />
                <Route path="/attendance"   element={<AttendancePage />} />
                <Route path="/teachers"     element={<TeacherPage />} />
                <Route path="/messages"     element={<MessagesPage />} />
                <Route path="/approval"     element={<AccountApprovalPage />} />
                <Route path="/profile"      element={<ProfilePage />} />
                <Route path="*"             element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

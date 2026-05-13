import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import TopHeader from './components/layout/TopHeader.jsx';
import MessageNotificationBanner from './components/common/MessageNotificationBanner.jsx';
import { useMessageNotification } from './hooks/useMessageNotification.js';

// 페이지는 필요할 때만 로드 (코드 스플리팅)
const LoginPage            = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage.jsx'));
const StudentListPage      = lazy(() => import('./pages/StudentListPage.jsx'));
const StudentInfoPage      = lazy(() => import('./pages/StudentInfoPage.jsx'));
const GradePage            = lazy(() => import('./pages/GradePage.jsx'));
const SubjectGuidePage     = lazy(() => import('./pages/SubjectGuidePage.jsx'));
const WeeklyPlanPage       = lazy(() => import('./pages/WeeklyPlanPage.jsx'));
const DailyRecordPage      = lazy(() => import('./pages/DailyRecordPage.jsx'));
const HomeworkPage         = lazy(() => import('./pages/HomeworkPage.jsx'));
const PerformancePage      = lazy(() => import('./pages/PerformancePage.jsx'));
const ClinicPage           = lazy(() => import('./pages/ClinicPage.jsx'));
const ClassPage            = lazy(() => import('./pages/ClassPage.jsx'));
const RoutinePage          = lazy(() => import('./pages/RoutinePage.jsx'));
const ClinicReportPage     = lazy(() => import('./pages/ClinicReportPage.jsx'));
const ReportPage           = lazy(() => import('./pages/ReportPage.jsx'));
const BoardPage            = lazy(() => import('./pages/BoardPage.jsx'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage.jsx'));
const TeacherPage          = lazy(() => import('./pages/TeacherPage.jsx'));
const AccountApprovalPage  = lazy(() => import('./pages/AccountApprovalPage.jsx'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage.jsx'));
const MessagesPage         = lazy(() => import('./pages/MessagesPage.jsx'));

// 학생 전용 페이지
const StudentHomePage        = lazy(() => import('./pages/student/StudentHomePage.jsx'));
const StudentAttendancePage  = lazy(() => import('./pages/student/StudentAttendancePage.jsx'));
const StudentWeeklyPlanPage  = lazy(() => import('./pages/student/StudentWeeklyPlanPage.jsx'));
const StudentDailyRecordPage = lazy(() => import('./pages/student/StudentDailyRecordPage.jsx'));
const StudentHomeworkPage    = lazy(() => import('./pages/student/StudentHomeworkPage.jsx'));
const StudentPerformancePage = lazy(() => import('./pages/student/StudentPerformancePage.jsx'));
const StudentReportPage      = lazy(() => import('./pages/student/StudentReportPage.jsx'));
const StudentChatPage        = lazy(() => import('./pages/student/StudentChatPage.jsx'));

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBannerVisible(true);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // 메시지 페이지 방문 시 자동으로 읽음 처리
  useEffect(() => {
    const msgPath = role === 'student' ? '/my/chat' : '/messages';
    if (location.pathname === msgPath) {
      markAllRead();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBannerVisible(false);
    }
  }, [location.pathname, role, markAllRead]);

  const handleBellClick = useCallback(() => {
    const chatPath = role === 'student' ? '/my/chat' : '/messages';
    markAllRead();
    setBannerVisible(false);
    navigate(chatPath);
  }, [role, markAllRead, navigate]);

  const handleMenuToggle  = useCallback(() => setSidebarOpen(o => !o), []);
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarCollapse = useCallback(() => setSidebarCollapsed(o => !o), []);
  const handleBannerDismiss = useCallback(() => setBannerVisible(false), []);
  const handleBannerRead = useCallback(() => { markAllRead(); setBannerVisible(false); }, [markAllRead]);

  return (
    <div className={`app-wrapper${sidebarCollapsed ? ' sidebar-hidden' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarCollapse}
      />
      <main className="main-content">
        <TopHeader
          onMenuToggle={handleMenuToggle}
          unreadCount={unreadCount}
          onBellClick={handleBellClick}
        />
        {bannerVisible && (
          <MessageNotificationBanner
            unreadMessages={unreadMessages}
            onDismiss={handleBannerDismiss}
            onRead={handleBannerRead}
          />
        )}
        <div className="content-area">
          <Suspense fallback={<div className="page-loading">로딩 중...</div>}>
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
                <Route path="/routine"       element={<RoutinePage />} />
                <Route path="/clinic"        element={<ClinicPage />} />
                <Route path="/clinic-report" element={<ClinicReportPage />} />
                <Route path="/report"       element={<ReportPage />} />
                <Route path="/board"        element={<BoardPage />} />
                <Route path="/attendance"   element={<AttendancePage />} />
                <Route path="/classes"      element={<ClassPage />} />
                <Route path="/teachers"     element={<TeacherPage />} />
                <Route path="/messages"     element={<MessagesPage />} />
                <Route path="/approval"     element={<AccountApprovalPage />} />
                <Route path="/profile"      element={<ProfilePage />} />
                <Route path="*"             element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
          </Suspense>
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
          <Suspense fallback={<div className="page-loading">로딩 중...</div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

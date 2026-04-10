import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import TopHeader from './components/layout/TopHeader.jsx';

import LoginPage       from './pages/LoginPage.jsx';
import DashboardPage   from './pages/DashboardPage.jsx';
import StudentListPage from './pages/StudentListPage.jsx';
import StudentInfoPage from './pages/StudentInfoPage.jsx';
import GradePage       from './pages/GradePage.jsx';
import WeeklyPlanPage  from './pages/WeeklyPlanPage.jsx';
import DailyRecordPage from './pages/DailyRecordPage.jsx';
import HomeworkPage    from './pages/HomeworkPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import ReportPage      from './pages/ReportPage.jsx';
import BoardPage       from './pages/BoardPage.jsx';
import AttendancePage  from './pages/AttendancePage.jsx';
import TeacherPage     from './pages/TeacherPage.jsx';

// 학생 전용 페이지
import StudentHomePage       from './pages/student/StudentHomePage.jsx';
import StudentAttendancePage from './pages/student/StudentAttendancePage.jsx';
import StudentWeeklyPlanPage from './pages/student/StudentWeeklyPlanPage.jsx';
import StudentDailyRecordPage from './pages/student/StudentDailyRecordPage.jsx';
import StudentHomeworkPage   from './pages/student/StudentHomeworkPage.jsx';
import StudentChatPage       from './pages/student/StudentChatPage.jsx';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();
  const role = profile?.role ?? 'admin';

  return (
    <div className="app-wrapper">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <TopHeader onMenuToggle={() => setSidebarOpen(o => !o)} />
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
                <Route path="/my/chat"          element={<StudentChatPage />} />
                <Route path="*"                 element={<Navigate to="/my" replace />} />
              </>
            ) : (
              /* ── 관리자 / 선생님 라우트 ── */
              <>
                <Route path="/"             element={<DashboardPage />} />
                <Route path="/students"     element={<StudentListPage />} />
                <Route path="/student-info" element={<StudentInfoPage />} />
                <Route path="/grades"       element={<GradePage />} />
                <Route path="/weekly-plan"  element={<WeeklyPlanPage />} />
                <Route path="/daily-record" element={<DailyRecordPage />} />
                <Route path="/homework"     element={<HomeworkPage />} />
                <Route path="/performance"  element={<PerformancePage />} />
                <Route path="/report"       element={<ReportPage />} />
                <Route path="/board"        element={<BoardPage />} />
                <Route path="/attendance"   element={<AttendancePage />} />
                <Route path="/teachers"     element={<TeacherPage />} />
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

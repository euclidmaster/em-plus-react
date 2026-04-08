import { supabase } from './supabase.js';

// ==================== 학생 ====================
export async function getStudents() {
  const { data, error } = await supabase.from('students').select(`*, teachers(name, title)`).order('name');
  if (error) throw error;
  return data;
}
export async function getStudent(id) {
  const { data, error } = await supabase.from('students').select(`*, teachers(name, title)`).eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function createStudent(payload) {
  const { data, error } = await supabase.from('students').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function updateStudent(id, payload) {
  const { data, error } = await supabase.from('students').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 성적 ====================
export async function getGrades(studentId, examType) {
  let q = supabase.from('grades').select('*').eq('student_id', studentId);
  if (examType) q = q.eq('exam_type', examType);
  const { data, error } = await q.order('subject');
  if (error) throw error;
  return data;
}
export async function upsertGrade(payload) {
  if (payload.id) {
    const { id, ...fields } = payload;
    const { data, error } = await supabase.from('grades').update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('grades').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}
export async function deleteGrade(id) {
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 주간 학습 플랜 ====================
export async function getWeeklyPlans(studentId, weekStart) {
  let q = supabase.from('weekly_plans').select('*').eq('student_id', studentId);
  if (weekStart) q = q.eq('week_start', weekStart);
  const { data, error } = await q.order('subject');
  if (error) throw error;
  return data;
}
export async function upsertWeeklyPlan(payload) {
  if (payload.id) {
    const { id, ...fields } = payload;
    const { data, error } = await supabase.from('weekly_plans').update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('weekly_plans').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}
export async function deleteWeeklyPlan(id) {
  const { error } = await supabase.from('weekly_plans').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 일일 학습 기록 ====================
export async function getDailyRecords(studentId, date) {
  let q = supabase.from('daily_records').select('*').eq('student_id', studentId);
  if (date) q = q.eq('record_date', date);
  const { data, error } = await q.order('record_date', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createDailyRecord(payload) {
  const { data, error } = await supabase.from('daily_records').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function updateDailyRecord(id, payload) {
  const { data, error } = await supabase.from('daily_records').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteDailyRecord(id) {
  const { error } = await supabase.from('daily_records').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 숙제 ====================
export async function getHomeworks(studentId) {
  const { data, error } = await supabase.from('homeworks').select('*').eq('student_id', studentId).order('due_date', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createHomework(payload) {
  const { data, error } = await supabase.from('homeworks').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function toggleHomework(id, isDone) {
  const { data, error } = await supabase.from('homeworks').update({ is_done: isDone }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteHomework(id) {
  const { error } = await supabase.from('homeworks').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 출석 ====================
export async function getAttendances(studentId, date) {
  let q = supabase.from('attendances').select(`*, teachers(name)`).eq('student_id', studentId);
  if (date) q = q.eq('att_date', date);
  const { data, error } = await q.order('att_date', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createAttendance(payload) {
  const { data, error } = await supabase.from('attendances').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function getComments(attendanceId) {
  const { data, error } = await supabase.from('comments').select('*').eq('attendance_id', attendanceId).order('created_at');
  if (error) throw error;
  return data;
}
export async function addComment(payload) {
  const { data, error } = await supabase.from('comments').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ==================== 강사 ====================
export async function getTeachers() {
  const { data, error } = await supabase.from('teachers').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function createTeacher(payload) {
  const { data, error } = await supabase.from('teachers').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ==================== 수행 관리 ====================
export async function getPerformances(studentId) {
  const { data, error } = await supabase.from('performances').select('*').eq('student_id', studentId).order('eval_date', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createPerformance(payload) {
  const { data, error } = await supabase.from('performances').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function deletePerformance(id) {
  const { error } = await supabase.from('performances').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 쪽지 ====================
export async function getMessages(profileId) {
  const { data, error } = await supabase.from('messages').select('*').or(`from_id.eq.${profileId},to_id.eq.${profileId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function sendMessage(payload) {
  const { data, error } = await supabase.from('messages').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ==================== 게시판 ====================
export async function getBoardPosts() {
  const { data, error } = await supabase.from('board_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createBoardPost(payload) {
  const { data, error } = await supabase.from('board_posts').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ==================== 대시보드 ====================
export async function getRecentActivity() {
  const { data, error } = await supabase.from('daily_records').select('*, students(name)').order('created_at', { ascending: false }).limit(5);
  if (error) throw error;
  return data;
}
export async function getTodaySchedule() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('attendances').select('*, students(name)').eq('att_date', today).order('start_time');
  if (error) throw error;
  return data;
}
export async function getDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = getMondayOfWeek(new Date()).toISOString().slice(0, 10);

  const [
    { count: totalStudents },
    { count: activeStudents },
    { count: totalTeachers },
    { count: todayAttended },
    { count: hwTotal },
    { count: hwDone },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', '재원중'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }),
    supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('att_date', today).eq('status', '출석'),
    supabase.from('homeworks').select('*', { count: 'exact', head: true }).gte('due_date', monday),
    supabase.from('homeworks').select('*', { count: 'exact', head: true }).gte('due_date', monday).eq('is_done', true),
  ]);

  return {
    totalStudents:  totalStudents  ?? 0,
    activeStudents: activeStudents ?? 0,
    totalTeachers:  totalTeachers  ?? 0,
    todayAttended:  todayAttended  ?? 0,
    attendanceRate: activeStudents ? Math.round((todayAttended / activeStudents) * 100) : 0,
    homeworkRate:   hwTotal ? Math.round((hwDone / hwTotal) * 100) : 0,
  };
}

// ==================== 리포트 통계 ====================
export async function getGradeStats(studentId) {
  const { data, error } = await supabase.from('grades').select('*').eq('student_id', studentId).order('exam_date');
  if (error) throw error;
  return data;
}
export async function getAttendanceStats(studentId) {
  const { data, error } = await supabase.from('attendances').select('att_date,status,study_minutes').eq('student_id', studentId).order('att_date');
  if (error) throw error;
  return data;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

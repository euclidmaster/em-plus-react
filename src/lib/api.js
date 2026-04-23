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
export async function getStudentLinkedProfile(profileId) {
  if (!profileId) return null;
  const { data } = await supabase.from('profiles').select('id, name, role').eq('id', profileId).single();
  return data ?? null;
}
export async function getStaffProfiles() {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, role')
    .in('role', ['admin', 'assistant', 'teacher']);
  return data ?? [];
}
export async function clearStudentAccount(studentId) {
  const { error } = await supabase.from('students').update({ profile_id: null }).eq('id', studentId);
  if (error) throw error;
}
// 학생 역할 계정 중 students에 아직 연결 안 된 것만 반환
export async function getUnlinkedStudentProfiles() {
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('role', 'student');
  if (error) throw error;

  const { data: linked } = await supabase
    .from('students')
    .select('profile_id')
    .not('profile_id', 'is', null);

  const linkedIds = new Set((linked ?? []).map(s => s.profile_id));
  return (allProfiles ?? []).filter(p => !linkedIds.has(p.id));
}
export async function linkStudentAccount(studentId, profileId) {
  const { error } = await supabase
    .from('students')
    .update({ profile_id: profileId })
    .eq('id', studentId);
  if (error) throw error;
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
    const { id: _id, ...insertPayload } = payload;
    const { data, error } = await supabase.from('grades').insert(insertPayload).select().single();
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
    const { id: _id, ...insertPayload } = payload; // id: null 제거
    const { data, error } = await supabase.from('weekly_plans').insert(insertPayload).select().single();
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
export async function updateAttendance(id, payload) {
  const { data, error } = await supabase.from('attendances').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteAttendance(id) {
  const { error } = await supabase.from('attendances').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 담당 강사 다중 배정 ====================
export async function getStudentTeachers(studentId) {
  const { data, error } = await supabase
    .from('student_teachers')
    .select('id, teacher_id, teachers(id, name, title, profile_id)')
    .eq('student_id', studentId)
    .order('created_at');
  if (error) throw error;
  return data;
}
export async function addStudentTeacher(studentId, teacherId) {
  const { data, error } = await supabase
    .from('student_teachers')
    .insert({ student_id: studentId, teacher_id: teacherId })
    .select('id, teacher_id, teachers(id, name, title)')
    .single();
  if (error) throw error;
  return data;
}
export async function removeStudentTeacher(id) {
  const { error } = await supabase.from('student_teachers').delete().eq('id', id);
  if (error) throw error;
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
export async function updateTeacher(id, payload) {
  const { data, error } = await supabase.from('teachers').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteTeacher(id) {
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
}

export async function getStudentsByClass(grade, className) {
  let q = supabase.from('students').select('id, name, grade, class_name, status').eq('status', '재원중');
  if (grade) q = q.eq('grade', grade);
  if (className) q = q.eq('class_name', className);
  const { data, error } = await q.order('name');
  if (error) throw error;
  return data;
}
export async function bulkCreateHomework(studentIds, payload) {
  const rows = studentIds.map(student_id => ({ ...payload, student_id }));
  const { data, error } = await supabase.from('homeworks').insert(rows).select();
  if (error) throw error;
  return data;
}

// ==================== 선생님 역할: 담당 학생 조회 ====================
export async function getTeacherByProfileId(profileId) {
  const { data } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return data ?? null;
}
export async function getTeacherByName(name) {
  const { data } = await supabase
    .from('teachers')
    .select('*')
    .eq('name', name)
    .maybeSingle();
  return data ?? null;
}
export async function linkTeacherProfile(teacherId, profileId) {
  const { error } = await supabase
    .from('teachers')
    .update({ profile_id: profileId })
    .eq('id', teacherId);
  if (error) throw error;
}
export async function getStudentsForTeacher(teacherRecordId) {
  // student_teachers 다대다 테이블에서 담당 학생 ID 수집
  const { data: links, error: linkErr } = await supabase
    .from('student_teachers')
    .select('student_id')
    .eq('teacher_id', teacherRecordId);
  if (linkErr) console.warn('[getStudentsForTeacher] student_teachers 조회 오류:', linkErr);
  const junctionIds = (links ?? []).map(l => l.student_id);

  // students.teacher_id(단일 배정) + junction 테이블 배정 모두 포함
  let query = supabase
    .from('students')
    .select('*, teachers(name, title)');

  if (junctionIds.length > 0) {
    query = query.or(`teacher_id.eq.${teacherRecordId},id.in.(${junctionIds.join(',')})`);
  } else {
    query = query.eq('teacher_id', teacherRecordId);
  }

  const { data, error } = await query.order('name');
  if (error) {
    console.error('[getStudentsForTeacher] students 조회 오류:', error);
    throw error;
  }
  return data ?? [];
}

// ==================== 학생 본인 조회 ====================
export async function getStudentByProfileId(profileId) {
  // 1단계: 학생 기본 정보 + FK 선생님 조회
  const { data, error } = await supabase
    .from('students')
    .select('*, teachers(id, name, title, profile_id)')
    .eq('profile_id', profileId)
    .single();
  if (error) throw error;

  // 2단계: student_teachers 별도 조회 (RLS 허용 시 사용)
  const { data: stData } = await supabase
    .from('student_teachers')
    .select('id, teacher_id, teachers(id, name, title, profile_id)')
    .eq('student_id', data.id);

  // 3단계: 메시지 발신자 기반 fallback — 이 학생에게 메시지를 보낸 선생님 조회
  // (student_teachers RLS가 막혀도 동작)
  const { data: msgData } = await supabase
    .from('messages')
    .select('from_id')
    .eq('to_id', profileId);

  let extraTeachers = [];
  if (msgData && msgData.length > 0) {
    const senderIds = [...new Set(msgData.map(m => m.from_id))];
    const { data: tData } = await supabase
      .from('teachers')
      .select('id, name, title, profile_id')
      .in('profile_id', senderIds);
    if (tData) {
      extraTeachers = tData.map(t => ({ teachers: t }));
    }
  }

  // student_teachers + 메시지 기반 선생님 합치기 (중복은 teacher_id 기준 제거)
  const merged = [...(stData ?? [])];
  for (const et of extraTeachers) {
    const alreadyIn = merged.some(st => st.teachers?.id === et.teachers?.id);
    if (!alreadyIn) merged.push(et);
  }

  return { ...data, student_teachers: merged };
}
export async function getMessagesBetween(userId1, userId2) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// ==================== 선생님 열람 권한 ====================
export async function getTeacherPermissions() {
  const { data, error } = await supabase.from('teacher_permissions').select('*');
  if (error) throw error;
  return data; // [{ teacher_id, can_view_personal_info, can_view_grades, can_view_report }]
}
export async function getTeacherPermissionById(teacherId) {
  const { data } = await supabase
    .from('teacher_permissions')
    .select('*')
    .eq('teacher_id', teacherId)
    .maybeSingle();
  return data ?? null;
}
export async function upsertTeacherPermission(teacherId, payload) {
  const { data, error } = await supabase
    .from('teacher_permissions')
    .upsert({ teacher_id: teacherId, ...payload }, { onConflict: 'teacher_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ==================== 교사 소통 노트 ====================
// Supabase에 teacher_notes 테이블 필요:
// create table teacher_notes (
//   id uuid default gen_random_uuid() primary key,
//   student_id uuid references students(id) on delete cascade not null,
//   author_name text not null, content text not null,
//   created_at timestamptz default now()
// );
export async function getTeacherNotes(studentId) {
  const { data, error } = await supabase
    .from('teacher_notes')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
export async function addTeacherNote(payload) {
  const { data, error } = await supabase.from('teacher_notes').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function deleteTeacherNote(id) {
  const { error } = await supabase.from('teacher_notes').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 수행 관리 ====================
export async function getAllPerformances() {
  const { data, error } = await supabase
    .from('performances')
    .select('*, performance_sessions(*), students(id, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(p => ({
    ...p,
    student_name: p.students?.name ?? '알 수 없음',
    performance_sessions: (p.performance_sessions ?? []).sort((a, b) => a.session_no - b.session_no),
  }));
}
export async function getPerformances(studentId) {
  const { data, error } = await supabase
    .from('performances')
    .select('*, performance_sessions(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(p => ({
    ...p,
    performance_sessions: (p.performance_sessions ?? []).sort((a, b) => a.session_no - b.session_no),
  }));
}
export async function createPerformance(payload) {
  const { sessions, ...perfData } = payload;
  const { data: perf, error } = await supabase.from('performances').insert(perfData).select().single();
  if (error) throw error;
  if (sessions?.length) {
    const rows = sessions
      .filter(s => s.eval_date || s.eval_types?.length || s.is_done)
      .map(s => ({ performance_id: perf.id, session_no: s.session_no, eval_date: s.eval_date || null, eval_types: s.eval_types ?? [], is_done: s.is_done ?? false }));
    if (rows.length) {
      const { error: sErr } = await supabase.from('performance_sessions').insert(rows);
      if (sErr) throw sErr;
    }
  }
  return perf;
}
export async function updatePerformance(id, payload) {
  const { sessions, performance_sessions, ...perfData } = payload;
  const { data: perf, error } = await supabase.from('performances').update(perfData).eq('id', id).select().single();
  if (error) throw error;
  await supabase.from('performance_sessions').delete().eq('performance_id', id);
  const src = sessions ?? performance_sessions ?? [];
  if (src.length) {
    const rows = src
      .filter(s => s.eval_date || s.eval_types?.length || s.is_done)
      .map(s => ({ performance_id: id, session_no: s.session_no, eval_date: s.eval_date || null, eval_types: s.eval_types ?? [], is_done: s.is_done ?? false }));
    if (rows.length) await supabase.from('performance_sessions').insert(rows);
  }
  return perf;
}
export async function deletePerformance(id) {
  const { error } = await supabase.from('performances').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 파일 업로드 ====================
export async function uploadAttachment(file) {
  const ext  = file.name.split('.').pop();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return data.publicUrl;
}

// ==================== 쪽지 (관리자 전체 열람) ====================
export async function getAllMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
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
export async function updateMessage(id, content) {
  const { data, error } = await supabase.from('messages').update({ content }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw error;
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
export async function updateBoardPost(id, payload) {
  const { data, error } = await supabase.from('board_posts').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteBoardPost(id) {
  const { error } = await supabase.from('board_posts').delete().eq('id', id);
  if (error) throw error;
}
export async function getBoardComments(postId) {
  const { data, error } = await supabase.from('board_comments').select('*').eq('post_id', postId).order('created_at');
  if (error) throw error;
  return data;
}
export async function addBoardComment(payload) {
  const { data, error } = await supabase.from('board_comments').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function deleteBoardComment(id) {
  const { error } = await supabase.from('board_comments').delete().eq('id', id);
  if (error) throw error;
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
// ==================== 루틴 체크리스트 ====================
// Supabase에 아래 두 테이블 필요:
//
// create table routine_templates (
//   id uuid primary key default gen_random_uuid(),
//   student_id uuid references students(id) on delete cascade not null,
//   title text not null,
//   subject text default '',
//   sort_order int default 0,
//   created_by uuid references profiles(id),
//   created_at timestamptz default now()
// );
//
// create table routine_logs (
//   id uuid primary key default gen_random_uuid(),
//   template_id uuid references routine_templates(id) on delete cascade not null,
//   student_id uuid references students(id) on delete cascade not null,
//   log_date date not null default current_date,
//   is_done boolean default false,
//   comment text default '',
//   checked_by uuid references profiles(id),
//   checked_by_name text default '',
//   created_at timestamptz default now(),
//   unique(template_id, log_date)
// );
//
// RLS (Supabase Dashboard > Table Editor > RLS):
// routine_templates: SELECT / INSERT / UPDATE / DELETE — auth.role() = 'authenticated'
// routine_logs: 동일

export async function getRoutineTemplates(studentId) {
  const { data, error } = await supabase
    .from('routine_templates')
    .select('*')
    .eq('student_id', studentId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function createRoutineTemplate(payload) {
  const { data, error } = await supabase.from('routine_templates').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function updateRoutineTemplate(id, payload) {
  const { data, error } = await supabase.from('routine_templates').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteRoutineTemplate(id) {
  const { error } = await supabase.from('routine_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function getRoutineLogs(studentId, date) {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('student_id', studentId)
    .eq('log_date', date);
  if (error) throw error;
  return data ?? [];
}
export async function upsertRoutineLog(payload) {
  const { id, ...rest } = payload;
  if (id) {
    const { data, error } = await supabase.from('routine_logs').update(rest).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('routine_logs')
    .upsert(rest, { onConflict: 'template_id,log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function getRoutineHistory(studentId) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const { data, error } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('student_id', studentId)
    .gte('log_date', since.toISOString().slice(0, 10))
    .order('log_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getRoutineMonthlyData(studentId, yearMonth) {
  const [year, month] = yearMonth.split('-');
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const [tmpl, lgRes] = await Promise.all([
    getRoutineTemplates(studentId),
    supabase
      .from('routine_logs')
      .select('*')
      .eq('student_id', studentId)
      .gte('log_date', `${yearMonth}-01`)
      .lte('log_date', `${yearMonth}-${String(lastDay).padStart(2, '0')}`),
  ]);
  if (lgRes.error) throw lgRes.error;
  return { templates: tmpl, logs: lgRes.data ?? [] };
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

// ==================== 계정 승인 ====================
export async function getPendingProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at')
    .eq('approved', false)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}
export async function approveProfile(id) {
  // profiles + auth 메타데이터 조회
  const { data: prof, error: fetchErr } = await supabase
    .from('profiles').select('id, name, role').eq('id', id).single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', id);
  if (error) throw error;

  // 강사/조교 → teachers 테이블 자동 등록
  if (prof.role === 'teacher' || prof.role === 'assistant') {
    // 1) 이미 profile_id로 연결된 레코드 확인
    const { data: existingByProfile } = await supabase
      .from('teachers').select('id').eq('profile_id', id).maybeSingle();
    if (!existingByProfile) {
      // 2) 수동으로 만들어진 동명 레코드(profile_id null)가 있으면 profile_id만 업데이트
      const { data: existingByName } = await supabase
        .from('teachers').select('id').eq('name', prof.name).is('profile_id', null).maybeSingle();
      if (existingByName) {
        const { error: updateErr } = await supabase
          .from('teachers').update({ profile_id: id, role: prof.role })
          .eq('id', existingByName.id);
        if (updateErr) throw new Error('teachers 연결 실패: ' + updateErr.message);
      } else {
        // 3) 없으면 새로 생성
        const { error: insertErr } = await supabase.from('teachers').insert({
          name: prof.name, role: prof.role, profile_id: id,
        });
        if (insertErr) throw new Error('teachers 등록 실패: ' + insertErr.message);
      }
    }
  }

  // 학생 → students 테이블 자동 등록 (profiles에 저장된 학생 정보 활용)
  if (prof.role === 'student') {
    const { data: existing } = await supabase
      .from('students').select('id').eq('profile_id', id).maybeSingle();
    if (!existing) {
      const { data: fullProf } = await supabase
        .from('profiles')
        .select('name, grade, class_name, school_name, phone')
        .eq('id', id).single();
      const { error: insertErr } = await supabase.from('students').insert({
        name:        fullProf?.name       ?? prof.name,
        grade:       fullProf?.grade      ?? null,
        class_name:  fullProf?.class_name ?? null,
        school_name: fullProf?.school_name ?? null,
        phone:       fullProf?.phone      ?? null,
        profile_id:  id,
        status:      '재원중',
      });
      if (insertErr) throw new Error('students 등록 실패: ' + insertErr.message);
    }
  }
}
export async function rejectProfile(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 클리닉 관리 ====================
// 필요한 Supabase SQL (처음 1회 실행):
// create table if not exists clinic_sessions (
//   id uuid default gen_random_uuid() primary key,
//   teacher_id uuid references teachers(id) on delete set null,
//   assistant_id uuid references teachers(id) on delete set null,
//   session_date date not null default current_date,
//   created_at timestamptz default now()
// );
// create table if not exists clinic_items (
//   id uuid default gen_random_uuid() primary key,
//   session_id uuid references clinic_sessions(id) on delete cascade not null,
//   student_id uuid references students(id) on delete set null,
//   subject text default '',
//   clinic_type text default '',
//   instructions text default '',
//   result text default '',
//   sort_order int default 0,
//   created_at timestamptz default now()
// );
// create table if not exists clinic_replies (
//   id uuid default gen_random_uuid() primary key,
//   item_id uuid references clinic_items(id) on delete cascade not null,
//   author_id uuid references teachers(id) on delete set null,
//   author_name text default '',
//   content text default '',
//   created_at timestamptz default now()
// );
export async function getClinicSessions(date) {
  const { data, error } = await supabase
    .from('clinic_sessions')
    .select(`
      *,
      teacher:teacher_id (id, name, role),
      assistant:assistant_id (id, name, role),
      clinic_items (
        id, session_id, student_id, subject, clinic_type,
        instructions, result, sort_order, created_at,
        students (id, name),
        clinic_replies (id, item_id, author_id, author_name, content, created_at)
      )
    `)
    .eq('session_date', date)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(s => ({
    ...s,
    clinic_items: (s.clinic_items ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));
}
export async function createClinicSession(payload) {
  const { data, error } = await supabase
    .from('clinic_sessions')
    .insert(payload)
    .select(`
      *,
      teacher:teacher_id (id, name, role),
      assistant:assistant_id (id, name, role)
    `)
    .single();
  if (error) throw error;
  return { ...data, clinic_items: [] };
}
export async function updateClinicSession(id, payload) {
  const { data, error } = await supabase
    .from('clinic_sessions')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      teacher:teacher_id (id, name, role),
      assistant:assistant_id (id, name, role)
    `)
    .single();
  if (error) throw error;
  return data;
}
export async function deleteClinicSession(id) {
  const { error } = await supabase.from('clinic_sessions').delete().eq('id', id);
  if (error) throw error;
}
export async function createClinicItem(payload) {
  const { data, error } = await supabase
    .from('clinic_items')
    .insert(payload)
    .select('*, students(id, name)')
    .single();
  if (error) throw error;
  return data;
}
export async function updateClinicItem(id, payload) {
  const { data, error } = await supabase
    .from('clinic_items')
    .update(payload)
    .eq('id', id)
    .select('*, students(id, name)')
    .single();
  if (error) throw error;
  return data;
}
export async function deleteClinicItem(id) {
  const { error } = await supabase.from('clinic_items').delete().eq('id', id);
  if (error) throw error;
}

// ==================== 클리닉 보고 (replies) ====================
export async function createClinicReply(payload) {
  const { data, error } = await supabase
    .from('clinic_replies')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateClinicReply(id, content) {
  const { data, error } = await supabase
    .from('clinic_replies')
    .update({ content })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteClinicReply(id) {
  const { error } = await supabase.from('clinic_replies').delete().eq('id', id);
  if (error) throw error;
}

export async function getClinicReportData(studentId, yearMonth) {
  const [year, month] = yearMonth.split('-');
  const start = `${yearMonth}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const { data: sessions, error: sErr } = await supabase
    .from('clinic_sessions')
    .select('id, session_date, teacher:teacher_id(name), assistant:assistant_id(name)')
    .gte('session_date', start)
    .lte('session_date', end);
  if (sErr) throw sErr;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map(s => s.id);
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));

  const { data: items, error: iErr } = await supabase
    .from('clinic_items')
    .select('id, session_id, subject, clinic_type, instructions')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);
  if (iErr) throw iErr;
  if (!items?.length) return [];

  const itemIds = items.map(i => i.id);
  const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

  const { data: replies, error: rErr } = await supabase
    .from('clinic_replies')
    .select('id, item_id, author_name, content, created_at')
    .in('item_id', itemIds)
    .order('created_at');
  if (rErr) throw rErr;

  return (replies ?? [])
    .map(reply => {
      const item = itemMap[reply.item_id];
      const session = item ? (sessionMap[item.session_id] ?? null) : null;
      return {
        id: reply.id,
        subject: item?.subject ?? '',
        clinic_type: item?.clinic_type ?? '',
        instructions: item?.instructions ?? '',
        result: reply.content,
        author: reply.author_name,
        session,
      };
    })
    .sort((a, b) => (a.session?.session_date ?? '') > (b.session?.session_date ?? '') ? 1 : -1);
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

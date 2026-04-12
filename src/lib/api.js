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
    .select('id, teacher_id, teachers(id, name, title)')
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
  console.log('[getStudentsForTeacher] teacherRecordId:', teacherRecordId, '| junction IDs:', junctionIds);

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
  console.log('[getStudentsForTeacher] 조회된 학생:', data?.length, data);
  return data ?? [];
}

// ==================== 학생 본인 조회 ====================
export async function getStudentByProfileId(profileId) {
  const { data, error } = await supabase
    .from('students')
    .select('*, teachers(id, name, title, profile_id), student_teachers(id, teacher_id, teachers(id, name, title, profile_id))')
    .eq('profile_id', profileId)
    .single();
  if (error) throw error;
  return data;
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
export async function updatePerformance(id, payload) {
  const { data, error } = await supabase.from('performances').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deletePerformance(id) {
  const { error } = await supabase.from('performances').delete().eq('id', id);
  if (error) throw error;
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

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

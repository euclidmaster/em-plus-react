import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getTeacherByProfileId, getTeacherPermissionById } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null);
  const [profile, setProfile]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [teacherPermissions, setTeacherPermissions] = useState(null);

  async function loadProfile(u) {
    if (!u) { setProfile(null); return; }

    const meta     = u.user_metadata ?? {};
    const metaRole = meta.role;           // 회원가입 때 선택한 역할 (없으면 undefined)
    const metaName = meta.name;           // 회원가입 때 입력한 이름 (없으면 undefined)

    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();

    let prof;

    const studentInfo = meta.studentInfo ?? {};

    if (data) {
      const needsUpdate = (metaRole && data.role !== metaRole) || (metaName && data.name !== metaName);
      if (needsUpdate) {
        const patch = {};
        if (metaRole && data.role !== metaRole) patch.role = metaRole;
        if (metaName && data.name !== metaName) patch.name = metaName;
        // 지점은 모든 역할 공통 저장
        if (studentInfo.branch)                         patch.branch      = studentInfo.branch;
        // 학생이면 추가 정보도 저장
        if ((metaRole ?? data.role) === 'student' && studentInfo) {
          if (studentInfo.grade)                        patch.grade       = studentInfo.grade;
          if (studentInfo.class_name)                   patch.class_name  = studentInfo.class_name;
          if (studentInfo.school_name)                  patch.school_name = studentInfo.school_name;
          if (studentInfo.phone)                        patch.phone       = studentInfo.phone;
          if (studentInfo.subjects?.length)             patch.subjects    = studentInfo.subjects;
        }
        const { data: updated } = await supabase.from('profiles').update(patch).eq('id', u.id).select().single();
        prof = updated ?? { ...data, ...patch };
      } else {
        prof = data;
      }
    } else {
      // profile 행 없음 → 새로 생성
      const fallback = {
        id:   u.id,
        name: metaName ?? u.email,
        role: metaRole ?? 'student',
        branch: studentInfo.branch ?? null,
        ...(metaRole === 'student' && studentInfo ? {
          grade:       studentInfo.grade       ?? null,
          class_name:  studentInfo.class_name  ?? null,
          school_name: studentInfo.school_name ?? null,
          phone:       studentInfo.phone       ?? null,
          subjects:    studentInfo.subjects    ?? [],
        } : {}),
      };
      await supabase.from('profiles').upsert(fallback);
      prof = fallback;
    }

    setProfile(prof);

    // teacher 역할이면 열람 권한 로드
    if (prof.role === 'teacher') {
      try {
        const teacher = await getTeacherByProfileId(prof.id);
        if (teacher) {
          const perms = await getTeacherPermissionById(teacher.id);
          setTeacherPermissions(perms); // null = 권한 레코드 없음 (기본 허용)
        }
      } catch { /* 권한 로드 실패 시 기본 허용 */ }
    } else {
      setTeacherPermissions(null);
    }

    // 학생 역할이고, students.profile_id 미연결이면 자동 연결 (결과 불필요 — fire-and-forget)
    if (prof.role === 'student' && meta.studentId) {
      supabase
        .from('students')
        .select('id, profile_id')
        .eq('id', meta.studentId)
        .single()
        .then(({ data: linked }) => {
          if (linked && !linked.profile_id) {
            return supabase
              .from('students')
              .update({ profile_id: u.id })
              .eq('id', meta.studentId);
          }
        })
        .catch(e => console.warn('학생 자동 연결 실패:', e));
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, teacherPermissions, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

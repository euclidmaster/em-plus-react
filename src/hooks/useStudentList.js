import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getStudents, getTeacherByProfileId, getStudentsForTeacher } from '../lib/api.js';

/**
 * 역할에 따라 학생 목록을 반환하는 훅.
 * - admin / assistant: 전체 학생
 * - teacher: student_teachers 테이블 기준 담당 학생만
 */
export function useStudentList() {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (profile.role === 'teacher') {
        const teacher = await getTeacherByProfileId(profile.id);
        setStudents(teacher ? await getStudentsForTeacher(teacher.id) : []);
      } else {
        setStudents(await getStudents());
      }
    } catch (e) {
      console.error('useStudentList fetch error:', e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => { fetch(); }, [fetch]);

  return { students, loading, refresh: fetch };
}

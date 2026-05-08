import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getStudents, getTeacherByProfileId, getTeacherByName, linkTeacherProfile, getStudentsForTeacher } from '../lib/api.js';

/**
 * 역할에 따라 학생 목록을 반환하는 훅.
 * - admin / assistant: 전체 학생
 * - teacher: student_teachers 또는 students.teacher_id 기준 담당 학생
 *
 * 교사 레코드가 여러 개일 수 있음 (수동 생성본 + 승인 생성본).
 * profile_id 연결 레코드와 이름 일치 레코드를 모두 찾아 합산.
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
        // 가능한 교사 레코드를 모두 수집 (profile_id 기준 + 이름 기준)
        const [byProfileId, byName] = await Promise.all([
          getTeacherByProfileId(profile.id),
          profile.name ? getTeacherByName(profile.name) : Promise.resolve(null),
        ]);

        // 고유 ID 기준으로 중복 제거
        const teacherMap = new Map();
        if (byProfileId) teacherMap.set(byProfileId.id, byProfileId);
        if (byName)      teacherMap.set(byName.id, byName);

        // profile_id 미연결 레코드에 자동 백필
        if (byName && !byName.profile_id) {
          linkTeacherProfile(byName.id, profile.id).catch(() => {});
        }

        if (teacherMap.size === 0) {
          // 교사 레코드를 찾지 못한 경우 전체 학생 목록으로 폴백
          setStudents(await getStudents());
          return;
        }

        // 각 교사 레코드 기준으로 학생 조회 후 id 기준 중복 제거
        const results = await Promise.all(
          [...teacherMap.keys()].map(tid => getStudentsForTeacher(tid))
        );
        const merged = [...new Map(
          results.flat().map(s => [s.id, s])
        ).values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

        setStudents(merged);
      } else {
        setStudents(await getStudents());
      }
    } catch (e) {
      console.error('[StudentList] fetch error:', e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => { fetch(); }, [fetch]);

  return { students, loading, refresh: fetch };
}

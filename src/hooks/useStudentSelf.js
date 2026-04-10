import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getStudentByProfileId } from '../lib/api.js';

export function useStudentSelf() {
  const { profile } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    getStudentByProfileId(profile.id)
      .then(setStudent)
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [profile?.id]);

  return { student, loading };
}

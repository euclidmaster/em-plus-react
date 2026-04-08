import { useEffect, useState } from 'react';
import { getStudents, getStudent, updateStudent, getTeachers } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';

export default function StudentInfoPage() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const showToast = useToast();

  useEffect(() => {
    Promise.all([getStudents(), getTeachers()]).then(([s, t]) => {
      setStudents(s);
      setTeachers(t);
      if (s.length) selectStudent(s[0].id);
    }).catch(console.error);
  }, []);

  async function selectStudent(id) {
    setSelectedId(id);
    setEditing(false);
    try {
      const d = await getStudent(id);
      setDetail(d);
      setForm({ name: d.name, grade: d.grade??'', school_name: d.school_name??'', phone: d.phone??'', teacher_id: d.teacher_id??'', status: d.status });
    } catch { showToast('학생 정보 로드 실패', 'error'); }
  }

  async function save() {
    try {
      await updateStudent(selectedId, { ...form, teacher_id: form.teacher_id || null });
      showToast('정보가 저장되었습니다.');
      setEditing(false);
      const d = await getStudent(selectedId);
      setDetail(d);
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-graduate"></i> 학생 개인정보</h2>
      </div>

      {/* 학생 선택 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
        <StudentSelect students={students} value={selectedId} onChange={id => selectStudent(id)} />
      </div>

      {detail && (
        <div className="card" style={{ maxWidth:560 }}>
          <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3><i className="fas fa-id-card"></i> 기본 정보</h3>
            {!editing
              ? <button className="btn-sm-outline" onClick={() => setEditing(true)}><i className="fas fa-edit"></i> 수정</button>
              : <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setEditing(false)} style={{ padding:'6px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>취소</button>
                  <button onClick={save} style={{ padding:'6px 14px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    <i className="fas fa-save"></i> 저장
                  </button>
                </div>
            }
          </div>
          <div style={{ display:'grid', gap:14, marginTop:16 }}>
            {[
              { label:'이름',   key:'name',        type:'text' },
              { label:'학년',   key:'grade',       type:'text' },
              { label:'학교',   key:'school_name', type:'text' },
              { label:'연락처', key:'phone',       type:'text' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={{ width:60, fontSize:13, fontWeight:600, color:'#64748b', flexShrink:0 }}>{label}</span>
                {editing
                  ? <input type={type} value={form[key] ?? ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }} />
                  : <span style={{ flex:1, fontSize:14 }}>{detail[key] ?? '-'}</span>
                }
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ width:60, fontSize:13, fontWeight:600, color:'#64748b', flexShrink:0 }}>담당강사</span>
              {editing
                ? <select value={form.teacher_id ?? ''} onChange={e => setForm(f => ({...f, teacher_id: e.target.value}))}
                    style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }}>
                    <option value="">미배정</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                : <span style={{ flex:1, fontSize:14 }}>{detail.teachers?.name ? `${detail.teachers.name} 선생님` : '-'}</span>
              }
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ width:60, fontSize:13, fontWeight:600, color:'#64748b', flexShrink:0 }}>상태</span>
              {editing
                ? <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                    style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }}>
                    <option value="재원중">재원중</option>
                    <option value="휴원">휴원</option>
                    <option value="퇴원">퇴원</option>
                  </select>
                : <span style={{ flex:1, fontSize:14 }}>{detail.status}</span>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

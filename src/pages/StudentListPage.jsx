import { useEffect, useState } from 'react';
import { getStudents, createStudent, getTeachers } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';

export default function StudentListPage() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', grade:'', school_name:'', phone:'', teacher_id:'', status:'재원중' });
  const showToast = useToast();

  useEffect(() => {
    load();
    getTeachers().then(setTeachers).catch(console.error);
  }, []);

  async function load() {
    try {
      const data = await getStudents();
      setStudents(data);
      setFiltered(data);
    } catch { showToast('학생 명단 로드 실패', 'error'); }
  }

  function search(q) {
    const kw = q.toLowerCase();
    setFiltered(students.filter(s =>
      s.name.toLowerCase().includes(kw) ||
      (s.school_name ?? '').toLowerCase().includes(kw) ||
      (s.grade ?? '').toLowerCase().includes(kw)
    ));
  }

  async function submit() {
    if (!form.name.trim()) { showToast('이름을 입력하세요.', 'error'); return; }
    try {
      await createStudent({ ...form, teacher_id: form.teacher_id || null });
      showToast(`${form.name} 학생이 등록되었습니다.`);
      setShowModal(false);
      setForm({ name:'', grade:'', school_name:'', phone:'', teacher_id:'', status:'재원중' });
      load();
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-users"></i> 학생 명단</h2>
      </div>

      <div className="card">
        <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <input className="search-input" placeholder="이름 / 학교 / 학년 검색..."
            onChange={e => search(e.target.value)}
            style={{ padding:'8px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, width:260 }} />
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-user-plus"></i> 학생 등록
          </button>
        </div>

        <table className="student-list-table" style={{ width:'100%', borderCollapse:'collapse', marginTop:16 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['#','이름','학교','학년','담당강사','등록일','상태',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={8} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>등록된 학생이 없습니다.</td></tr>
              : filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{i+1}</td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>{s.name}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.school_name ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.grade ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.teachers?.name ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.enrolled_at?.slice(0,7).replace('-','.') ?? '-'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: s.status==='재원중' ? '#dcfce7' : '#fee2e2', color: s.status==='재원중' ? '#16a34a' : '#dc2626' }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button className="btn-sm-outline">상세</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-user-plus"></i> 학생 등록</>} onClose={() => setShowModal(false)}>
          <div style={{ display:'grid', gap:12 }}>
            {[
              { label:'이름 *', key:'name', type:'text', ph:'학생 이름' },
              { label:'학년',   key:'grade', type:'text', ph:'예: 고등학교 2학년' },
              { label:'학교명', key:'school_name', type:'text', ph:'학교명' },
              { label:'연락처', key:'phone', type:'text', ph:'010-0000-0000' },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                  placeholder={ph} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>담당강사</label>
              <select value={form.teacher_id} onChange={e => setForm(f => ({...f, teacher_id: e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }}>
                <option value="">미배정</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>상태</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }}>
                <option value="재원중">재원중</option>
                <option value="휴원">휴원</option>
                <option value="퇴원">퇴원</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submit} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-save"></i> 저장
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

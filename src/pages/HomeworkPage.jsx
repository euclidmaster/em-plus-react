import { useEffect, useState } from 'react';
import { getStudents, getHomeworks, createHomework, toggleHomework, deleteHomework } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';

const SUBJECTS = ['국어','수학','영어','과학','사회','한국사'];

export default function HomeworkPage() {
  const [students, setStudents]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ due_date:'', subject:'국어', material:'', hw_range:'' });
  const showToast = useToast();

  useEffect(() => {
    getStudents().then(s => {
      setStudents(s);
      if (s.length) { setSelectedId(s[0].id); loadHw(s[0].id); }
    }).catch(console.error);
  }, []);

  async function loadHw(id) {
    try {
      const data = await getHomeworks(id);
      setHomeworks(data);
    } catch { showToast('숙제 로드 실패', 'error'); }
  }

  async function toggle(id, isDone) {
    try {
      await toggleHomework(id, isDone);
      showToast(isDone ? '숙제 완료!' : '완료 취소');
      loadHw(selectedId);
    } catch { showToast('처리 실패', 'error'); }
  }

  async function remove(id) {
    if (!confirm('이 숙제를 삭제하시겠습니까?')) return;
    try {
      await deleteHomework(id);
      showToast('삭제되었습니다.');
      loadHw(selectedId);
    } catch { showToast('삭제 실패', 'error'); }
  }

  async function submit() {
    if (!form.due_date) { showToast('마감일을 입력하세요.', 'error'); return; }
    if (!selectedId)    { showToast('학생을 선택하세요.', 'error'); return; }
    try {
      await createHomework({ ...form, student_id: selectedId });
      showToast('숙제가 등록되었습니다.');
      setShowModal(false);
      setForm({ due_date:'', subject:'국어', material:'', hw_range:'' });
      loadHw(selectedId);
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-tasks"></i> 숙제 관리</h2>
      </div>

      <div className="card">
        <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
            <StudentSelect students={students} value={selectedId} onChange={id => { setSelectedId(id); loadHw(id); }} />
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus"></i> 숙제 추가
          </button>
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:16 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['마감일','과목','교재','범위','완료',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {homeworks.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>숙제가 없습니다.</td></tr>
              : homeworks.map(hw => (
                <tr key={hw.id} style={{ borderBottom:'1px solid #f1f5f9', opacity: hw.is_done ? 0.5 : 1 }}>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{hw.due_date}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{hw.subject}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{hw.material ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{hw.hw_range ?? '-'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <input type="checkbox" checked={hw.is_done} onChange={e => toggle(hw.id, e.target.checked)}
                      style={{ width:18, height:18, cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={() => remove(hw.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:14 }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-plus"></i> 숙제 추가</>} onClose={() => setShowModal(false)}>
          <div style={{ display:'grid', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>마감일 *</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>과목</label>
              <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>교재</label>
              <input type="text" value={form.material} onChange={e => setForm(f => ({...f, material: e.target.value}))}
                placeholder="교재명" style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>범위</label>
              <input type="text" value={form.hw_range} onChange={e => setForm(f => ({...f, hw_range: e.target.value}))}
                placeholder="페이지 or 단원" style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
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

import { useEffect, useState } from 'react';
import { getPerformances, createPerformance, updatePerformance, deletePerformance } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';

const SUBJECTS = ['국어','수학','영어','과학','사회','한국사'];
const EMPTY_FORM = { subject:'국어', eval_format:'', session_no:'', content:'', eval_date: new Date().toISOString().slice(0,10) };

export default function PerformancePage() {
  const { students } = useStudentList();
  const [selectedId, setSelectedId]     = useState(null);
  const [performances, setPerformances] = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [editTarget, setEditTarget]     = useState(null);
  const [editForm, setEditForm]         = useState(EMPTY_FORM);
  const showToast = useToast();

  useEffect(() => {
    if (students.length && selectedId === null) { setSelectedId(students[0].id); load(students[0].id); }
  }, [students]);

  async function load(id) {
    try { setPerformances(await getPerformances(id ?? selectedId)); }
    catch { showToast('수행 관리 로드 실패', 'error'); }
  }

  async function submit() {
    if (!selectedId) { showToast('학생을 선택하세요.', 'error'); return; }
    try {
      await createPerformance({ ...form, student_id: selectedId, session_no: form.session_no ? parseInt(form.session_no) : null });
      showToast('수행 기록이 등록되었습니다.');
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  function openEdit(p) {
    setEditTarget(p);
    setEditForm({
      subject:    p.subject     ?? '국어',
      eval_format: p.eval_format ?? '',
      session_no: p.session_no != null ? String(p.session_no) : '',
      content:    p.content     ?? '',
      eval_date:  p.eval_date   ?? new Date().toISOString().slice(0,10),
    });
  }

  async function submitEdit() {
    try {
      await updatePerformance(editTarget.id, {
        ...editForm,
        session_no: editForm.session_no ? parseInt(editForm.session_no) : null,
      });
      showToast('수정되었습니다.');
      setEditTarget(null);
      load();
    } catch (e) { showToast('수정 실패: ' + e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await deletePerformance(id); showToast('삭제되었습니다.'); load(); }
    catch { showToast('삭제 실패', 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-clipboard-check"></i> 수행 관리</h2>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
          <StudentSelect students={students} value={selectedId} onChange={id => { setSelectedId(id); load(id); }} />
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> 수행 추가
        </button>
      </div>

      <div style={{ display:'grid', gap:12 }}>
        {performances.length === 0
          ? <div className="card" style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>수행 기록이 없습니다.</div>
          : performances.map(p => (
            <div key={p.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, color:'#4361ee' }}>{p.subject}</span>
                  {p.eval_format && <span style={{ fontSize:13, color:'#64748b' }}>{p.eval_format}</span>}
                  {p.session_no && <span style={{ fontSize:12, color:'#94a3b8' }}>#{p.session_no}회차</span>}
                  <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>{p.eval_date}</span>
                </div>
                {p.content && <p style={{ fontSize:14, color:'#475569', lineHeight:1.6 }}>{p.content}</p>}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => openEdit(p)} style={btnEdit}>
                  <i className="fas fa-edit"></i>
                </button>
                <button onClick={() => remove(p.id)} style={btnDel}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* 추가 모달 */}
      {showModal && (
        <Modal title={<><i className="fas fa-clipboard-check"></i> 수행 추가</>} onClose={() => setShowModal(false)}>
          <PerformanceForm form={form} setForm={setForm} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnCancel}>취소</button>
            <button onClick={submit} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <Modal title={<><i className="fas fa-edit"></i> 수행 수정</>} onClose={() => setEditTarget(null)}>
          <PerformanceForm form={editForm} setForm={setEditForm} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setEditTarget(null)} style={btnCancel}>취소</button>
            <button onClick={submitEdit} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PerformanceForm({ form, setForm }) {
  return (
    <div style={{ display:'grid', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={lbl}>과목</label>
          <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} style={inp}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>평가일</label>
          <input type="date" value={form.eval_date} onChange={e => setForm(f => ({...f, eval_date: e.target.value}))} style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>평가 형식</label>
        <input type="text" value={form.eval_format} onChange={e => setForm(f => ({...f, eval_format: e.target.value}))}
          placeholder="예: 단원 테스트, 구술 평가" style={inp} />
      </div>
      <div>
        <label style={lbl}>회차</label>
        <input type="number" value={form.session_no} onChange={e => setForm(f => ({...f, session_no: e.target.value}))}
          placeholder="예: 1" min={1} style={inp} />
      </div>
      <div>
        <label style={lbl}>내용</label>
        <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
          placeholder="수행 평가 내용 및 결과" rows={3} style={{ ...inp, resize:'vertical', minHeight:80 }} />
      </div>
    </div>
  );
}

const lbl     = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp     = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };
const btnCancel = { padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 };
const btnSave   = { padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 };
const btnEdit   = { padding:'5px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fff', color:'#475569', cursor:'pointer', fontSize:13 };
const btnDel    = { padding:'5px 10px', border:'1.5px solid #fca5a5', borderRadius:7, background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:13 };

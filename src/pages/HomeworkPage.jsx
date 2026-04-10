import { useEffect, useState } from 'react';
import { getStudents, getHomeworks, createHomework, toggleHomework, deleteHomework, bulkCreateHomework } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';

const SUBJECTS = ['국어','수학','영어','과학','사회','한국사'];
const GRADE_OPTIONS = ['중1','중2','중3','고1','고2','고3'];

export default function HomeworkPage() {
  const [tab, setTab] = useState('개인별'); // '개인별' | '반별'
  const showToast = useToast();

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-tasks"></i> 숙제 관리</h2>
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'2px solid #e2e8f0' }}>
        {['개인별','반별'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 24px', fontSize:14, fontWeight:700, cursor:'pointer', border:'none',
            background:'none', color: tab === t ? '#4361ee' : '#94a3b8',
            borderBottom: tab === t ? '2px solid #4361ee' : '2px solid transparent',
            marginBottom: -2, transition:'color 0.15s',
          }}>{t} 숙제</button>
        ))}
      </div>

      {tab === '개인별'
        ? <IndividualHomework showToast={showToast} />
        : <ClassHomework showToast={showToast} />
      }
    </div>
  );
}

/* ── 개인별 ─────────────────────────────────────────── */
function IndividualHomework({ showToast }) {
  const [students, setStudents]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [homeworks, setHomeworks]   = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm] = useState({ due_date:'', subject:'국어', material:'', hw_range:'' });

  useEffect(() => {
    getStudents().then(s => {
      setStudents(s);
      if (s.length) { setSelectedId(s[0].id); loadHw(s[0].id); }
    }).catch(console.error);
  }, []);

  async function loadHw(id) {
    try { setHomeworks(await getHomeworks(id)); }
    catch { showToast('숙제 로드 실패', 'error'); }
  }

  async function toggle(id, isDone) {
    try { await toggleHomework(id, isDone); showToast(isDone ? '숙제 완료!' : '완료 취소'); loadHw(selectedId); }
    catch { showToast('처리 실패', 'error'); }
  }

  async function remove(id) {
    if (!confirm('이 숙제를 삭제하시겠습니까?')) return;
    try { await deleteHomework(id); showToast('삭제되었습니다.'); loadHw(selectedId); }
    catch { showToast('삭제 실패', 'error'); }
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

      {showModal && (
        <Modal title={<><i className="fas fa-plus"></i> 숙제 추가</>} onClose={() => setShowModal(false)}>
          <HomeworkForm form={form} setForm={setForm} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnCancel}>취소</button>
            <button onClick={submit} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── 반별 ────────────────────────────────────────────── */
function ClassHomework({ showToast }) {
  const [allStudents, setAllStudents]   = useState([]);
  const [gradeFilter, setGradeFilter]   = useState('');
  const [classFilter, setClassFilter]   = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm] = useState({ due_date:'', subject:'국어', material:'', hw_range:'' });

  useEffect(() => {
    getStudents().then(setAllStudents).catch(console.error);
  }, []);

  // 선택된 학년의 반 목록
  const availableClasses = (() => {
    const base = gradeFilter
      ? allStudents.filter(s => s.grade === gradeFilter && s.status === '재원중')
      : allStudents.filter(s => s.status === '재원중');
    return [...new Set(base.map(s => s.class_name).filter(Boolean))].sort();
  })();

  // 학년+반 선택 시 학생 목록 갱신
  useEffect(() => {
    if (!gradeFilter && !classFilter) { setClassStudents([]); return; }
    const base = allStudents.filter(s => s.status === '재원중');
    const filtered = base.filter(s => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (classFilter && s.class_name !== classFilter) return false;
      return true;
    });
    setClassStudents(filtered);
  }, [gradeFilter, classFilter, allStudents]);

  function handleGradeChange(g) {
    setGradeFilter(g);
    setClassFilter('');
    setClassStudents([]);
  }

  async function submitBulk() {
    if (!form.due_date) { showToast('마감일을 입력하세요.', 'error'); return; }
    if (classStudents.length === 0) { showToast('학생이 없습니다.', 'error'); return; }
    try {
      const ids = classStudents.map(s => s.id);
      await bulkCreateHomework(ids, form);
      showToast(`${classStudents.length}명에게 숙제가 등록되었습니다.`);
      setShowModal(false);
      setForm({ due_date:'', subject:'국어', material:'', hw_range:'' });
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      {/* 필터 */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <label style={lbl}>학년</label>
            <select value={gradeFilter} onChange={e => handleGradeChange(e.target.value)} style={{ ...inp, width:120 }}>
              <option value="">전체</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>반</label>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ ...inp, width:180 }}
              disabled={availableClasses.length === 0}>
              <option value="">반 선택</option>
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginTop:18 }}>
            <button className="btn-primary" onClick={() => setShowModal(true)}
              disabled={classStudents.length === 0}
              style={{ opacity: classStudents.length === 0 ? 0.5 : 1 }}>
              <i className="fas fa-plus"></i> 반 전체 숙제 추가
            </button>
          </div>
        </div>
      </div>

      {/* 해당 반 학생 목록 */}
      <div className="card">
        <div className="card-header" style={{ marginBottom:12 }}>
          <h3>
            {gradeFilter || classFilter
              ? `${gradeFilter} ${classFilter} 학생 목록 (${classStudents.length}명)`
              : '학년과 반을 선택하세요'}
          </h3>
        </div>
        {classStudents.length === 0
          ? <p style={{ textAlign:'center', color:'#94a3b8', padding:30 }}>
              {gradeFilter || classFilter ? '해당하는 학생이 없습니다.' : '학년과 반을 선택하면 학생 목록이 표시됩니다.'}
            </p>
          : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  {['#','이름','학년','반','학교'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontSize:13, color:'#94a3b8' }}>{i+1}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:26, height:26, borderRadius:'50%', background:'#e8ecff', color:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{s.name[0]}</div>
                        {s.name}
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>{s.grade ?? '-'}</td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>
                      {s.class_name
                        ? <span style={{ padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600, background:'#f3e8ff', color:'#7209b7' }}>{s.class_name}</span>
                        : '-'}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>{s.school_name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-plus"></i> 반 전체 숙제 추가</>} onClose={() => setShowModal(false)}>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>
            <strong>{gradeFilter} {classFilter}</strong> · {classStudents.length}명에게 동일한 숙제가 등록됩니다.
          </p>
          <HomeworkForm form={form} setForm={setForm} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnCancel}>취소</button>
            <button onClick={submitBulk} style={btnSave}>
              <i className="fas fa-save"></i> {classStudents.length}명에게 저장
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── 공통 폼 ─────────────────────────────────────────── */
function HomeworkForm({ form, setForm }) {
  return (
    <div style={{ display:'grid', gap:12 }}>
      <div>
        <label style={lbl}>마감일 *</label>
        <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} style={inp} />
      </div>
      <div>
        <label style={lbl}>과목</label>
        <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} style={inp}>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>교재</label>
        <input type="text" value={form.material} onChange={e => setForm(f => ({...f, material: e.target.value}))}
          placeholder="교재명" style={inp} />
      </div>
      <div>
        <label style={lbl}>범위</label>
        <input type="text" value={form.hw_range} onChange={e => setForm(f => ({...f, hw_range: e.target.value}))}
          placeholder="페이지 or 단원" style={inp} />
      </div>
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };
const btnCancel = { padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 };
const btnSave   = { padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 };

import { useEffect, useState } from 'react';
import { getAttendances, createAttendance, updateAttendance, deleteAttendance, getComments, addComment, getTeachers } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';

const EMPTY_FORM = {
  att_date: new Date().toISOString().slice(0,10),
  att_type:'정규', start_time:'', end_time:'',
  status:'출석', attitude:'보통', task_desc:'', report_content:'', reporter_id:'',
};

export default function AttendancePage() {
  const { students } = useStudentList();
  const [teachers, setTeachers]       = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [comments, setComments]       = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editTarget, setEditTarget]   = useState(null);
  const [editForm, setEditForm]       = useState(EMPTY_FORM);
  const showToast = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    getTeachers().then(setTeachers).catch(console.error);
  }, []);

  useEffect(() => {
    if (students.length && selectedId === null) {
      setSelectedId(students[0].id);
      loadAtt(students[0].id);
    }
  }, [students]);

  async function loadAtt(id) {
    try {
      const data = await getAttendances(id);
      setAttendances(data);
      const cm = {};
      await Promise.all(data.map(async a => {
        const c = await getComments(a.id);
        cm[a.id] = c;
      }));
      setComments(cm);
    } catch { showToast('출석 로드 실패', 'error'); }
  }

  async function submitComment(attId) {
    const text = commentInputs[attId]?.trim();
    if (!text) return;
    try {
      await addComment({ attendance_id: attId, author_name: profile?.name ?? '사용자', content: text });
      setCommentInputs(p => ({...p, [attId]: ''}));
      const c = await getComments(attId);
      setComments(p => ({...p, [attId]: c}));
      showToast('댓글이 등록되었습니다.');
    } catch { showToast('댓글 등록 실패', 'error'); }
  }

  async function submitAttendance() {
    if (!selectedId) { showToast('학생을 선택하세요.', 'error'); return; }
    try {
      await createAttendance({ ...form, student_id: selectedId, reporter_id: form.reporter_id || null });
      showToast('출석이 등록되었습니다.');
      setShowModal(false);
      setForm(EMPTY_FORM);
      loadAtt(selectedId);
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  function openEdit(att) {
    setEditTarget(att);
    setEditForm({
      att_date:       att.att_date       ?? '',
      att_type:       att.att_type       ?? '정규',
      start_time:     att.start_time     ?? '',
      end_time:       att.end_time       ?? '',
      status:         att.status         ?? '출석',
      attitude:       att.attitude       ?? '보통',
      task_desc:      att.task_desc      ?? '',
      report_content: att.report_content ?? '',
      reporter_id:    att.reporter_id    ?? '',
    });
  }

  async function submitEdit() {
    try {
      await updateAttendance(editTarget.id, { ...editForm, reporter_id: editForm.reporter_id || null });
      showToast('수정되었습니다.');
      setEditTarget(null);
      loadAtt(selectedId);
    } catch (e) { showToast('수정 실패: ' + e.message, 'error'); }
  }

  async function remove(att) {
    if (!confirm(`${att.att_date} 출석 기록을 삭제하시겠습니까?`)) return;
    try {
      await deleteAttendance(att.id);
      showToast('삭제되었습니다.');
      loadAtt(selectedId);
    } catch (e) { showToast('삭제 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-check"></i> 출석 관리</h2>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
          <StudentSelect students={students} value={selectedId} onChange={id => { setSelectedId(id); loadAtt(id); }} />
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> 출석 입력
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {attendances.length === 0
          ? <div className="card" style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>출석 기록이 없습니다.</div>
          : attendances.map(att => (
            <div className="card" key={att.id}>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, color:'#1e293b' }}>{att.att_date}</span>
                <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: att.att_type==='정규' ? '#e8ecff' : '#fff4eb', color: att.att_type==='정규' ? '#4361ee' : '#f4a261' }}>{att.att_type}</span>
                <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: att.status==='출석' ? '#dcfce7' : att.status==='지각' ? '#fef9c3' : '#fee2e2', color: att.status==='출석' ? '#16a34a' : att.status==='지각' ? '#92400e' : '#dc2626' }}>{att.status}</span>
                {att.attitude && <span style={{ fontSize:12, color:'#64748b' }}>태도: {att.attitude}</span>}
                {att.teachers?.name && <span style={{ fontSize:12, color:'#64748b' }}>{att.teachers.name} 작성</span>}
                {(att.start_time || att.end_time) && (
                  <span style={{ fontSize:12, color:'#94a3b8' }}>
                    {att.start_time && att.start_time.slice(0,5)}{att.start_time && att.end_time && ' ~ '}{att.end_time && att.end_time.slice(0,5)}
                  </span>
                )}
                {/* 수정/삭제 버튼 */}
                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  <button onClick={() => openEdit(att)} style={btnEdit}>
                    <i className="fas fa-edit"></i> 수정
                  </button>
                  <button onClick={() => remove(att)} style={btnDel}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              {att.task_desc && <p style={{ fontSize:13, color:'#64748b', marginBottom:6 }}><strong>과제:</strong> {att.task_desc}</p>}
              {att.report_content && <p style={{ fontSize:14, color:'#475569', marginBottom:12, lineHeight:1.6 }}>{att.report_content}</p>}
              <div>
                {(comments[att.id] ?? []).map(c => (
                  <div key={c.id} style={{ padding:'6px 0', borderTop:'1px solid #f1f5f9', display:'flex', gap:8, fontSize:13 }}>
                    <span style={{ fontWeight:600, color:'#4361ee' }}>{c.author_name}</span>
                    <span style={{ color:'#475569' }}>{c.content}</span>
                  </div>
                ))}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <input value={commentInputs[att.id] ?? ''} onChange={e => setCommentInputs(p => ({...p, [att.id]: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && submitComment(att.id)}
                    placeholder="댓글 입력..."
                    style={{ flex:1, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 }} />
                  <button onClick={() => submitComment(att.id)} style={{ padding:'8px 14px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* 출석 입력 모달 */}
      {showModal && (
        <Modal title={<><i className="fas fa-user-check"></i> 출석 입력</>} onClose={() => setShowModal(false)} width={520}>
          <AttendanceForm form={form} setForm={setForm} teachers={teachers} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnCancel}>취소</button>
            <button onClick={submitAttendance} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}

      {/* 출석 수정 모달 */}
      {editTarget && (
        <Modal title={<><i className="fas fa-edit"></i> 출석 수정</>} onClose={() => setEditTarget(null)} width={520}>
          <AttendanceForm form={editForm} setForm={setEditForm} teachers={teachers} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setEditTarget(null)} style={btnCancel}>취소</button>
            <button onClick={submitEdit} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AttendanceForm({ form, setForm, teachers }) {
  return (
    <div style={{ display:'grid', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={lbl}>날짜 *</label>
          <input type="date" value={form.att_date} onChange={e => setForm(f => ({...f, att_date: e.target.value}))} style={inp} />
        </div>
        <div>
          <label style={lbl}>유형</label>
          <select value={form.att_type} onChange={e => setForm(f => ({...f, att_type: e.target.value}))} style={inp}>
            <option>정규</option><option>비정규</option>
          </select>
        </div>
        <div>
          <label style={lbl}>시작시간</label>
          <input type="time" value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))} style={inp} />
        </div>
        <div>
          <label style={lbl}>종료시간</label>
          <input type="time" value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))} style={inp} />
        </div>
        <div>
          <label style={lbl}>출석 상태</label>
          <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={inp}>
            <option>출석</option><option>지각</option><option>결석</option>
          </select>
        </div>
        <div>
          <label style={lbl}>수업 태도</label>
          <select value={form.attitude} onChange={e => setForm(f => ({...f, attitude: e.target.value}))} style={inp}>
            <option>매우 좋음</option><option>보통</option><option>산만</option>
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>담당강사</label>
        <select value={form.reporter_id} onChange={e => setForm(f => ({...f, reporter_id: e.target.value}))} style={inp}>
          <option value="">선택 안함</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>과제 내용</label>
        <input type="text" value={form.task_desc} onChange={e => setForm(f => ({...f, task_desc: e.target.value}))}
          placeholder="오늘 진행한 과제" style={inp} />
      </div>
      <div>
        <label style={lbl}>수업 보고</label>
        <textarea value={form.report_content} onChange={e => setForm(f => ({...f, report_content: e.target.value}))}
          placeholder="수업 내용 및 특이사항" rows={3}
          style={{ ...inp, resize:'vertical', minHeight:80 }} />
      </div>
    </div>
  );
}

const lbl     = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp     = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };
const btnCancel = { padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 };
const btnSave   = { padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 };
const btnEdit   = { padding:'5px 12px', border:'1.5px solid #e2e8f0', borderRadius:7, background:'#fff', color:'#475569', cursor:'pointer', fontSize:12, fontWeight:600 };
const btnDel    = { padding:'5px 10px', border:'1.5px solid #fca5a5', borderRadius:7, background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:12 };

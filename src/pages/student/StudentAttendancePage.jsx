import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getAttendances, createAttendance } from '../../lib/api.js';
import { useToast } from '../../components/common/Toast.jsx';
import Modal from '../../components/common/Modal.jsx';

const STATUS_STYLE = {
  '출석': { background:'#dcfce7', color:'#16a34a' },
  '지각': { background:'#fef9c3', color:'#92400e' },
  '결석': { background:'#fee2e2', color:'#dc2626' },
};

export default function StudentAttendancePage() {
  const { student, loading } = useStudentSelf();
  const [records, setRecords]     = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ att_date: new Date().toISOString().slice(0,10), start_time:'', end_time:'' });
  const showToast = useToast();

  useEffect(() => {
    if (student) load();
  }, [student]);

  async function load() {
    try { setRecords(await getAttendances(student.id, null)); }
    catch { showToast('출석 기록 로드 실패', 'error'); }
  }

  async function submit() {
    if (!form.start_time) { showToast('등원 시간을 입력하세요.', 'error'); return; }
    try {
      await createAttendance({
        student_id: student.id,
        att_date:   form.att_date,
        start_time: form.start_time,
        end_time:   form.end_time || null,
        att_type:   '정규',
        status:     '출석',
      });
      showToast('출석이 기록되었습니다.');
      setShowModal(false);
      setForm({ att_date: new Date().toISOString().slice(0,10), start_time:'', end_time:'' });
      load();
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
  }

  if (loading) return <Spinner />;
  if (!student) return <NoStudent />;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-check"></i> 출석 기록</h2>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> 출석 기록하기
        </button>
      </div>

      <div className="card">
        {records.length === 0
          ? <p style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>출석 기록이 없습니다.</p>
          : (
            <div style={{ display:'grid', gap:10 }}>
              {records.map(r => (
                <div key={r.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'14px 0', borderBottom:'1px solid #f1f5f9',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ textAlign:'center', minWidth:50 }}>
                      <div style={{ fontSize:12, color:'#94a3b8' }}>{r.att_date?.slice(5)}</div>
                      <div style={{ fontSize:11, color:'#cbd5e1' }}>
                        {new Date(r.att_date).toLocaleDateString('ko-KR',{weekday:'short'})}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:'#1e293b', marginBottom:2 }}>
                        {r.start_time ? r.start_time.slice(0,5) : '-'} 등원
                        {r.end_time ? ` → ${r.end_time.slice(0,5)} 하원` : ''}
                      </div>
                      {r.report_content && (
                        <div style={{ fontSize:12, color:'#64748b' }}>{r.report_content}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                    ...(STATUS_STYLE[r.status] ?? { background:'#f1f5f9', color:'#64748b' }),
                  }}>{r.status}</span>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-user-check"></i> 출석 기록하기</>} onClose={() => setShowModal(false)}>
          <div style={{ display:'grid', gap:14 }}>
            <div>
              <label style={lbl}>날짜</label>
              <input type="date" value={form.att_date}
                onChange={e => setForm(f => ({...f, att_date: e.target.value}))} style={inp} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>등원 시간 *</label>
                <input type="time" value={form.start_time}
                  onChange={e => setForm(f => ({...f, start_time: e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={lbl}>하원 시간</label>
                <input type="time" value={form.end_time}
                  onChange={e => setForm(f => ({...f, end_time: e.target.value}))} style={inp} />
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={btnCancel}>취소</button>
            <button onClick={submit} style={btnSave}><i className="fas fa-save"></i> 저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Spinner() { return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>; }
function NoStudent() {
  return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize:32, color:'#f59e0b', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };
const btnCancel = { padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 };
const btnSave   = { padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 };

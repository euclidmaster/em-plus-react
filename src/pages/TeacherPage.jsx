import { useEffect, useState } from 'react';
import {
  getTeachers, createTeacher, updateTeacher, deleteTeacher,
  getMessages, sendMessage,
  getTeacherPermissions, upsertTeacherPermission,
} from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/common/Modal.jsx';

const AVATAR_COLORS = ['#4361ee','#2dc653','#f4a261','#7209b7','#e63946'];

const PERM_LABELS = [
  { key: 'can_view_personal_info', label: '개인정보', desc: '연락처, 학교명 등 학생 개인정보 열람', icon: 'fa-id-card' },
  { key: 'can_view_grades',        label: '성적',    desc: '성적 관리 페이지 접근',              icon: 'fa-chart-bar' },
  { key: 'can_view_report',        label: '학습 리포트', desc: '학습 리포트 페이지 접근',        icon: 'fa-file-alt' },
];

const DEFAULT_PERMS = { can_view_personal_info: true, can_view_grades: true, can_view_report: true };

export default function TeacherPage() {
  const [teachers, setTeachers]         = useState([]);
  const [messages, setMessages]         = useState([]);
  const [permissions, setPermissions]   = useState({}); // { [teacher_id]: { can_view_personal_info, ... } }
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMsgModal, setShowMsgModal]   = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permTarget, setPermTarget]     = useState(null);
  const [permForm, setPermForm]         = useState(DEFAULT_PERMS);
  const [msgTo, setMsgTo]               = useState(null);
  const [msgContent, setMsgContent]     = useState('');
  const [teacherForm, setTeacherForm]   = useState({ name:'', title:'', role:'teacher' });
  const [editTarget, setEditTarget]     = useState(null);
  const [editForm, setEditForm]         = useState({ name:'', title:'', role:'teacher' });
  const showToast = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    load();
    if (profile?.id) getMessages(profile.id).then(setMessages).catch(console.error);
  }, [profile]);

  async function load() {
    try {
      const [ts, perms] = await Promise.all([getTeachers(), getTeacherPermissions()]);
      setTeachers(ts);
      const map = {};
      perms.forEach(p => { map[p.teacher_id] = p; });
      setPermissions(map);
    } catch { showToast('강사 로드 실패', 'error'); }
  }

  async function submitTeacher() {
    if (!teacherForm.name.trim()) { showToast('이름을 입력하세요.', 'error'); return; }
    try {
      await createTeacher(teacherForm);
      showToast(`${teacherForm.name} 선생님이 등록되었습니다.`);
      setShowAddModal(false);
      setTeacherForm({ name:'', title:'', role:'teacher' });
      load();
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  function openEdit(t) {
    setEditTarget(t);
    setEditForm({ name: t.name, title: t.title ?? '', role: t.role ?? 'teacher' });
    setShowEditModal(true);
  }

  async function submitEdit() {
    if (!editForm.name.trim()) { showToast('이름을 입력하세요.', 'error'); return; }
    try {
      await updateTeacher(editTarget.id, editForm);
      showToast('수정되었습니다.');
      setShowEditModal(false);
      load();
    } catch (e) { showToast('수정 실패: ' + e.message, 'error'); }
  }

  async function remove(t) {
    if (!confirm(`"${t.name}" 선생님을 삭제하시겠습니까?`)) return;
    try {
      await deleteTeacher(t.id);
      showToast(`${t.name} 선생님이 삭제되었습니다.`);
      load();
    } catch (e) { showToast('삭제 실패: ' + e.message, 'error'); }
  }

  function openPerm(t) {
    setPermTarget(t);
    const existing = permissions[t.id];
    setPermForm(existing
      ? { can_view_personal_info: existing.can_view_personal_info, can_view_grades: existing.can_view_grades, can_view_report: existing.can_view_report }
      : { ...DEFAULT_PERMS }
    );
    setShowPermModal(true);
  }

  async function submitPerm() {
    try {
      const saved = await upsertTeacherPermission(permTarget.id, permForm);
      setPermissions(prev => ({ ...prev, [permTarget.id]: saved }));
      showToast(`${permTarget.name} 선생님 권한이 저장되었습니다.`);
      setShowPermModal(false);
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
  }

  async function submitMsg() {
    if (!msgContent.trim()) { showToast('내용을 입력하세요.', 'error'); return; }
    if (!profile) { showToast('로그인이 필요합니다.', 'error'); return; }
    try {
      await sendMessage({ from_id: profile.id, to_id: msgTo.profile_id, from_name: profile.name, to_name: msgTo.name, content: msgContent });
      showToast('쪽지가 전송되었습니다.');
      setShowMsgModal(false);
      setMsgContent('');
      if (profile?.id) getMessages(profile.id).then(setMessages);
    } catch (e) { showToast('전송 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-chalkboard-teacher"></i> 선생님 관리</h2>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <i className="fas fa-user-plus"></i> 강사 추가
        </button>
      </div>

      {/* 강사 카드 목록 */}
      <div className="teacher-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16, marginBottom:30 }}>
        {teachers.map((t, i) => {
          const perm = permissions[t.id];
          return (
            <div key={t.id} className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:24, gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>
                {t.name[0]}
              </div>
              <div style={{ textAlign:'center' }}>
                <h4 style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>{t.name}</h4>
                <span style={{ fontSize:13, color:'#64748b' }}>{t.title ?? (t.role==='assistant' ? '조교' : '담당강사')}</span>
              </div>

              {/* 권한 뱃지 */}
              {perm && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
                  {PERM_LABELS.map(({ key, label }) => (
                    <span key={key} style={{
                      padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600,
                      background: perm[key] ? '#dcfce7' : '#fee2e2',
                      color:      perm[key] ? '#16a34a' : '#dc2626',
                    }}>
                      {label} {perm[key] ? '✓' : '✗'}
                    </span>
                  ))}
                </div>
              )}

              {/* 버튼 */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                <button onClick={() => { setMsgTo(t); setShowMsgModal(true); }} style={btnCard('#f0f4ff','#4361ee','#c7d2fe')}>
                  <i className="fas fa-envelope"></i> 쪽지
                </button>
                <button onClick={() => openPerm(t)} style={btnCard('#fefce8','#92400e','#fde68a')}>
                  <i className="fas fa-shield-alt"></i> 권한
                </button>
                <button onClick={() => openEdit(t)} style={btnCard('#f0fdf4','#16a34a','#bbf7d0')}>
                  <i className="fas fa-edit"></i> 수정
                </button>
                <button onClick={() => remove(t)} style={btnCard('#fff5f5','#dc2626','#fca5a5')}>
                  <i className="fas fa-trash"></i> 삭제
                </button>
              </div>
            </div>
          );
        })}
        {teachers.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#94a3b8' }}>등록된 강사가 없습니다.</div>
        )}
      </div>

      {/* 권한 현황 테이블 */}
      {teachers.length > 0 && (
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-header" style={{ marginBottom:12 }}>
            <h3><i className="fas fa-shield-alt"></i> 선생님 열람 권한 현황</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                <th style={th}>선생님</th>
                {PERM_LABELS.map(({ label }) => <th key={label} style={th}>{label}</th>)}
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => {
                const perm = permissions[t.id];
                return (
                  <tr key={t.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontWeight:600, fontSize:14 }}>{t.name}</td>
                    {PERM_LABELS.map(({ key }) => (
                      <td key={key} style={{ padding:'10px 14px', textAlign:'center' }}>
                        {perm == null
                          ? <span style={{ color:'#94a3b8', fontSize:12 }}>미설정</span>
                          : perm[key]
                            ? <span style={{ color:'#16a34a', fontSize:16 }}>●</span>
                            : <span style={{ color:'#dc2626', fontSize:16 }}>○</span>
                        }
                      </td>
                    ))}
                    <td style={{ padding:'10px 14px' }}>
                      <button onClick={() => openPerm(t)}
                        style={{ padding:'5px 12px', fontSize:12, fontWeight:600, border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', color:'#475569' }}>
                        설정
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 쪽지 목록 */}
      <div className="card">
        <div className="card-header"><h3><i className="fas fa-envelope"></i> 쪽지함</h3></div>
        <div style={{ marginTop:12 }}>
          {messages.length === 0
            ? <p style={{ textAlign:'center', color:'#94a3b8', padding:20 }}>쪽지가 없습니다.</p>
            : messages.map(m => (
              <div key={m.id} style={{ padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#4361ee', marginBottom:4 }}>{m.from_name} → {m.to_name}</div>
                <div style={{ fontSize:14, color:'#1e293b' }}>{m.content}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{new Date(m.created_at).toLocaleString('ko-KR')}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* 강사 추가 모달 */}
      {showAddModal && (
        <Modal title={<><i className="fas fa-user-plus"></i> 강사 추가</>} onClose={() => setShowAddModal(false)}>
          <TeacherForm form={teacherForm} setForm={setTeacherForm} />
          <ModalFooter onCancel={() => setShowAddModal(false)} onSave={submitTeacher} />
        </Modal>
      )}

      {/* 강사 수정 모달 */}
      {showEditModal && (
        <Modal title={<><i className="fas fa-edit"></i> 강사 수정</>} onClose={() => setShowEditModal(false)}>
          <TeacherForm form={editForm} setForm={setEditForm} />
          <ModalFooter onCancel={() => setShowEditModal(false)} onSave={submitEdit} />
        </Modal>
      )}

      {/* 권한 설정 모달 */}
      {showPermModal && permTarget && (
        <Modal title={<><i className="fas fa-shield-alt"></i> 열람 권한 설정</>} onClose={() => setShowPermModal(false)}>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>
            <strong>{permTarget.name}</strong> 선생님이 볼 수 있는 정보를 설정합니다.
          </p>
          <div style={{ display:'grid', gap:12 }}>
            {PERM_LABELS.map(({ key, label, desc, icon }) => {
              const on = permForm[key];
              return (
                <div key={key} onClick={() => setPermForm(f => ({ ...f, [key]: !f[key] }))}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'14px 16px', borderRadius:10, cursor:'pointer',
                    border: '1.5px solid ' + (on ? '#bbf7d0' : '#e2e8f0'),
                    background: on ? '#f0fdf4' : '#fafafa',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{
                      width:36, height:36, borderRadius:8,
                      background: on ? '#dcfce7' : '#f1f5f9',
                      color: on ? '#16a34a' : '#94a3b8',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                    }}>
                      <i className={`fas ${icon}`}></i>
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{label}</div>
                      <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{desc}</div>
                    </div>
                  </div>
                  {/* 토글 스위치 */}
                  <div style={{
                    width:44, height:24, borderRadius:12, position:'relative', flexShrink:0,
                    background: on ? '#22c55e' : '#cbd5e1',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position:'absolute', top:3, left: on ? 23 : 3,
                      width:18, height:18, borderRadius:'50%', background:'#fff',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          <ModalFooter onCancel={() => setShowPermModal(false)} onSave={submitPerm} saveLabel="저장" />
        </Modal>
      )}

      {/* 쪽지 보내기 모달 */}
      {showMsgModal && msgTo && (
        <Modal title={<><i className="fas fa-envelope"></i> 쪽지 보내기</>} onClose={() => setShowMsgModal(false)}>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>받는 사람: <strong>{msgTo.name}</strong></p>
          <textarea value={msgContent} onChange={e => setMsgContent(e.target.value)}
            placeholder="쪽지 내용을 입력하세요..." rows={4}
            style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
          <ModalFooter onCancel={() => setShowMsgModal(false)} onSave={submitMsg} saveLabel="전송" saveIcon="fa-paper-plane" />
        </Modal>
      )}
    </div>
  );
}

function TeacherForm({ form, setForm }) {
  return (
    <div style={{ display:'grid', gap:12 }}>
      {[{ label:'이름 *', key:'name', ph:'강사 이름' }, { label:'직함', key:'title', ph:'예: 수학 전문강사' }].map(({ label, key, ph }) => (
        <div key={key}>
          <label style={lbl}>{label}</label>
          <input type="text" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
            placeholder={ph} style={inp} />
        </div>
      ))}
      <div>
        <label style={lbl}>역할</label>
        <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} style={inp}>
          <option value="teacher">강사</option>
          <option value="assistant">조교</option>
        </select>
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saveLabel = '저장', saveIcon = 'fa-save' }) {
  return (
    <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
      <button onClick={onCancel} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
      <button onClick={onSave}   style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
        <i className={`fas ${saveIcon}`}></i> {saveLabel}
      </button>
    </div>
  );
}

const btnCard = (bg, color, border) => ({
  padding:'7px 14px', background:bg, color, border:`1.5px solid ${border}`,
  borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
});
const th  = { padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 };
const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };

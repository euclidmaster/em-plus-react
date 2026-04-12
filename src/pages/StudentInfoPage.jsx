import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getStudent, updateStudent, deleteStudent, getTeachers,
  getStudentLinkedProfile, clearStudentAccount,
  getUnlinkedStudentProfiles, linkStudentAccount,
  getStudentTeachers, addStudentTeacher, removeStudentTeacher,
  getTeacherNotes, addTeacherNote, deleteTeacherNote,
  sendMessage, getAdminProfiles,
} from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';

export default function StudentInfoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { students } = useStudentList();
  const initDone = useRef(false);
  const [teachers, setTeachers]             = useState([]);
  const [selectedId, setSelectedId]         = useState(null);
  const [detail, setDetail]                 = useState(null);
  const [linkedProfile, setLinkedProfile]   = useState(null);
  const [unlinkedProfiles, setUnlinkedProfiles] = useState([]);
  const [linkTarget, setLinkTarget]         = useState('');
  const [editing, setEditing]               = useState(false);
  const [form, setForm]                     = useState({});
  const [assignedTeachers, setAssignedTeachers] = useState([]);
  const [addTeacherId, setAddTeacherId]     = useState('');
  const [notes, setNotes]                   = useState([]);
  const [noteInput, setNoteInput]           = useState('');
  const [msgRecipient, setMsgRecipient]     = useState('');   // profile_id or '' (shared)
  const [recipientOptions, setRecipientOptions] = useState([]); // [{ id, name, label }]
  const showToast = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    getTeachers().then(setTeachers).catch(console.error);
  }, []);

  useEffect(() => {
    if (!students.length || initDone.current) return;
    initDone.current = true;
    const urlId = searchParams.get('id');
    const initId = urlId ?? students[0].id;
    if (initId) selectStudent(initId);
  }, [students]);

  async function selectStudent(id) {
    setSelectedId(id);
    setEditing(false);
    setLinkedProfile(null);
    setLinkTarget('');
    setAddTeacherId('');
    setNotes([]);
    setNoteInput('');
    setMsgRecipient('');
    setSearchParams({ id });
    try {
      const [d, assigned, noteList, admins] = await Promise.all([
        getStudent(id), getStudentTeachers(id), getTeacherNotes(id), getAdminProfiles(),
      ]);
      setDetail(d);
      setAssignedTeachers(assigned);
      setNotes(noteList);
      setForm({ name: d.name, grade: d.grade??'', class_name: d.class_name??'', school_name: d.school_name??'', phone: d.phone??'', status: d.status });

      // 수신자 옵션 빌드
      const opts = [];
      // 학생 (계정 연결된 경우)
      if (d.profile_id) {
        const prof = await getStudentLinkedProfile(d.profile_id);
        setLinkedProfile(prof);
        if (prof) opts.push({ id: prof.id, name: prof.name, label: `${prof.name} (학생)` });
      } else {
        const unlinked = await getUnlinkedStudentProfiles();
        setUnlinkedProfiles(unlinked);
      }
      // 담당 선생님 (본인 제외, profile_id 있는 경우)
      assigned.forEach(a => {
        const t = a.teachers;
        if (t?.profile_id && t.profile_id !== profile?.id) {
          opts.push({ id: t.profile_id, name: t.name, label: `${t.name} 선생님` });
        }
      });
      // 원장 / 관리자 (본인 제외)
      admins.forEach(a => {
        if (a.id !== profile?.id) {
          opts.push({ id: a.id, name: a.name, label: `${a.name} (${a.role === 'admin' ? '원장' : '관리자'})` });
        }
      });
      setRecipientOptions(opts);
    } catch { showToast('학생 정보 로드 실패', 'error'); }
  }

  async function submitNote() {
    const text = noteInput.trim();
    if (!text || !selectedId) return;
    try {
      if (msgRecipient) {
        // 특정 대상에게 직접 메시지 전송
        const to = recipientOptions.find(o => o.id === msgRecipient);
        if (!to) { showToast('수신자를 찾을 수 없습니다.', 'error'); return; }
        if (!profile?.id) { showToast('로그인 정보가 없습니다.', 'error'); return; }
        await sendMessage({
          from_id:   profile.id,
          to_id:     to.id,
          from_name: profile.name ?? '선생님',
          to_name:   to.name,
          content:   text,
        });
        showToast(`${to.name}에게 메시지를 보냈습니다.`);
        setNoteInput('');
      } else {
        // 공유 메모 등록
        const row = await addTeacherNote({ student_id: selectedId, author_name: profile?.name ?? '선생님', content: text });
        setNotes(prev => [...prev, row]);
        setNoteInput('');
      }
    } catch (e) { showToast('전송 실패: ' + e.message, 'error'); }
  }

  async function removeNote(id) {
    try {
      await deleteTeacherNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { showToast('삭제 실패: ' + e.message, 'error'); }
  }

  async function handleAddTeacher() {
    if (!addTeacherId) return;
    if (assignedTeachers.length >= 10) { showToast('담당 강사는 최대 10명까지 배정 가능합니다.', 'error'); return; }
    if (assignedTeachers.some(a => a.teacher_id === addTeacherId)) { showToast('이미 배정된 강사입니다.', 'error'); return; }
    try {
      const row = await addStudentTeacher(selectedId, addTeacherId);
      setAssignedTeachers(prev => [...prev, row]);
      setAddTeacherId('');
      showToast('담당 강사가 추가되었습니다.');
    } catch (e) { showToast('추가 실패: ' + e.message, 'error'); }
  }

  async function handleRemoveTeacher(id) {
    try {
      await removeStudentTeacher(id);
      setAssignedTeachers(prev => prev.filter(a => a.id !== id));
      showToast('담당 강사가 제거되었습니다.');
    } catch (e) { showToast('제거 실패: ' + e.message, 'error'); }
  }

  async function save() {
    try {
      await updateStudent(selectedId, form);
      showToast('정보가 저장되었습니다.');
      setEditing(false);
      const d = await getStudent(selectedId);
      setDetail(d);
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
  }

  async function remove() {
    if (!confirm(`"${detail.name}" 학생을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteStudent(selectedId);
      showToast(`${detail.name} 학생이 삭제되었습니다.`);
      navigate('/students');
    } catch (e) { showToast('삭제 실패: ' + e.message, 'error'); }
  }

  async function disconnectAccount() {
    if (!confirm(`"${detail.name}" 학생의 계정 연결을 해제하시겠습니까?`)) return;
    try {
      await clearStudentAccount(selectedId);
      showToast('계정 연결이 해제되었습니다.');
      setLinkedProfile(null);
      const [d, unlinked] = await Promise.all([getStudent(selectedId), getUnlinkedStudentProfiles()]);
      setDetail(d);
      setUnlinkedProfiles(unlinked);
      setLinkTarget('');
    } catch (e) { showToast('해제 실패: ' + e.message, 'error'); }
  }

  async function connectAccount() {
    if (!linkTarget) { showToast('연결할 계정을 선택하세요.', 'error'); return; }
    try {
      await linkStudentAccount(selectedId, linkTarget);
      showToast('계정이 연결되었습니다.');
      const [d, prof] = await Promise.all([getStudent(selectedId), getStudentLinkedProfile(linkTarget)]);
      setDetail(d);
      setLinkedProfile(prof);
      setLinkTarget('');
      setUnlinkedProfiles([]);
    } catch (e) { showToast('연결 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-user-graduate"></i> 학생 개인정보</h2>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
        <StudentSelect students={students} value={selectedId} onChange={id => selectStudent(id)} />
      </div>

      {detail && (
        <div style={{ display:'grid', gap:16, maxWidth:560 }}>

          {/* 기본 정보 */}
          <div className="card">
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3><i className="fas fa-id-card"></i> 기본 정보</h3>
              <div style={{ display:'flex', gap:8 }}>
                {!editing ? (
                  <>
                    <button className="btn-sm-outline" onClick={() => setEditing(true)}>
                      <i className="fas fa-edit"></i> 수정
                    </button>
                    <button onClick={remove} style={{
                      padding:'6px 14px', border:'1.5px solid #fca5a5', borderRadius:8,
                      background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600,
                    }}>
                      <i className="fas fa-trash"></i> 삭제
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(false)} style={{ padding:'6px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>취소</button>
                    <button onClick={save} style={{ padding:'6px 14px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      <i className="fas fa-save"></i> 저장
                    </button>
                  </>
                )}
              </div>
            </div>
            <div style={{ display:'grid', gap:14, marginTop:16 }}>
              {[
                { label:'이름',   key:'name',        type:'text' },
                { label:'학교',   key:'school_name', type:'text' },
                { label:'연락처', key:'phone',       type:'text' },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <span style={labelStyle}>{label}</span>
                  {editing
                    ? <input type={type} value={form[key] ?? ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                        style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }} />
                    : <span style={{ flex:1, fontSize:14 }}>{detail[key] ?? '-'}</span>
                  }
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={labelStyle}>학년</span>
                {editing
                  ? <select value={form.grade ?? ''} onChange={e => setForm(f => ({...f, grade: e.target.value}))}
                      style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }}>
                      <option value="">선택</option>
                      {['중1','중2','중3','고1','고2','고3'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  : <span style={{ flex:1, fontSize:14 }}>{detail.grade ?? '-'}</span>
                }
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={labelStyle}>반</span>
                {editing
                  ? <input type="text" value={form.class_name ?? ''} onChange={e => setForm(f => ({...f, class_name: e.target.value}))}
                      placeholder="예: 수학 심화반"
                      style={{ flex:1, padding:'8px 12px', border:'1.5px solid #4361ee', borderRadius:8, fontSize:14 }} />
                  : <span style={{ flex:1, fontSize:14 }}>{detail.class_name ?? '-'}</span>
                }
              </div>
              {/* 담당강사는 별도 카드에서 관리 */}
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={labelStyle}>상태</span>
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

          {/* 담당 강사 다중 배정 */}
          <div className="card">
            <div className="card-header" style={{ marginBottom:14 }}>
              <h3><i className="fas fa-chalkboard-teacher"></i> 담당 강사
                <span style={{ marginLeft:10, fontSize:12, fontWeight:400, color:'#94a3b8' }}>
                  {assignedTeachers.length}/10명
                </span>
              </h3>
            </div>

            {/* 배정된 강사 목록 */}
            {assignedTeachers.length === 0
              ? <p style={{ fontSize:13, color:'#94a3b8', marginBottom:14 }}>배정된 담당 강사가 없습니다.</p>
              : <div style={{ display:'grid', gap:8, marginBottom:14 }}>
                  {assignedTeachers.map(a => (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', background:'#f8fafc', borderRadius:8, border:'1.5px solid #e2e8f0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'#eef2ff', color:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                          <i className="fas fa-user-tie"></i>
                        </div>
                        <div>
                          <span style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{a.teachers?.name} 선생님</span>
                          {a.teachers?.title && <span style={{ fontSize:12, color:'#94a3b8', marginLeft:8 }}>{a.teachers.title}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveTeacher(a.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:14, padding:'4px 8px', borderRadius:6 }} title="제거">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
            }

            {/* 강사 추가 */}
            {assignedTeachers.length < 10 && (
              <div style={{ display:'flex', gap:8 }}>
                <select
                  value={addTeacherId}
                  onChange={e => setAddTeacherId(e.target.value)}
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }}
                >
                  <option value="">강사 선택...</option>
                  {teachers
                    .filter(t => !assignedTeachers.some(a => a.teacher_id === t.id))
                    .map(t => <option key={t.id} value={t.id}>{t.name}{t.title ? ` (${t.title})` : ''}</option>)
                  }
                </select>
                <button
                  onClick={handleAddTeacher}
                  disabled={!addTeacherId}
                  style={{ padding:'9px 18px', background: addTeacherId ? '#4361ee' : '#e2e8f0', color: addTeacherId ? '#fff' : '#94a3b8', border:'none', borderRadius:8, cursor: addTeacherId ? 'pointer' : 'default', fontSize:13, fontWeight:600, flexShrink:0 }}
                >
                  <i className="fas fa-plus"></i> 추가
                </button>
              </div>
            )}
            {assignedTeachers.length >= 10 && (
              <p style={{ fontSize:12, color:'#f59e0b', marginTop:4 }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight:4 }}></i>최대 10명까지 배정 가능합니다.
              </p>
            )}
          </div>

          {/* 계정 연결 현황 */}
          <div className="card">
            <div className="card-header" style={{ marginBottom:14 }}>
              <h3><i className="fas fa-link"></i> 계정 연결 현황</h3>
            </div>

            {detail.profile_id ? (
              /* ── 연결됨 ── */
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#f0fdf4', borderRadius:10, border:'1.5px solid #bbf7d0', marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#22c55e', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#16a34a' }}>계정 연결됨</div>
                    <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>
                      {linkedProfile ? linkedProfile.name : '로드 중...'}
                    </div>
                  </div>
                </div>
                <button onClick={disconnectAccount} style={{
                  padding:'8px 16px', border:'1.5px solid #fca5a5', borderRadius:8,
                  background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600,
                }}>
                  <i className="fas fa-unlink"></i> 연결 해제
                </button>
              </div>
            ) : (
              /* ── 미연결 ── */
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fff7ed', borderRadius:10, border:'1.5px solid #fed7aa', marginBottom:16 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#fb923c', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    <i className="fas fa-unlink"></i>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#c2410c' }}>계정 미연결</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>로그인 계정과 연결되지 않은 상태입니다.</div>
                  </div>
                </div>

                {/* 관리자 직접 연결 */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', border:'1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:10 }}>
                    <i className="fas fa-user-plus" style={{ marginRight:6 }}></i>
                    관리자 직접 연결
                  </div>
                  {unlinkedProfiles.length === 0 ? (
                    <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>
                      연결 가능한 학생 계정이 없습니다.<br/>
                      학생이 먼저 회원가입을 완료해야 합니다.
                    </p>
                  ) : (
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <select
                        value={linkTarget}
                        onChange={e => setLinkTarget(e.target.value)}
                        style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }}
                      >
                        <option value="">계정 선택...</option>
                        {unlinkedProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={connectAccount}
                        disabled={!linkTarget}
                        style={{
                          padding:'9px 16px', background: linkTarget ? '#4361ee' : '#e2e8f0',
                          color: linkTarget ? '#fff' : '#94a3b8',
                          border:'none', borderRadius:8, cursor: linkTarget ? 'pointer' : 'default',
                          fontSize:13, fontWeight:600, flexShrink:0,
                        }}
                      >
                        <i className="fas fa-link"></i> 연결
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:8, marginBottom:0 }}>
                    * 학생이 회원가입 시 본인 이름을 선택했다면 자동으로 연결됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 교사 소통 */}
          <div className="card">
            <div className="card-header" style={{ marginBottom:14 }}>
              <h3><i className="fas fa-comments"></i> 교사 소통
                <span style={{ marginLeft:8, fontSize:12, fontWeight:400, color:'#94a3b8' }}>담당 선생님 간 공유 메모</span>
              </h3>
            </div>

            {notes.length === 0
              ? <p style={{ fontSize:13, color:'#94a3b8', marginBottom:14 }}>작성된 메모가 없습니다.</p>
              : <div style={{ display:'grid', gap:8, marginBottom:14 }}>
                  {notes.map(n => (
                    <div key={n.id} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 14px', background:'#f8fafc', borderRadius:8, border:'1.5px solid #e2e8f0' }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'#e8ecff', color:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {(n.author_name ?? '?')[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{n.author_name}</span>
                          <span style={{ fontSize:11, color:'#94a3b8' }}>
                            {new Date(n.created_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize:14, color:'#475569', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{n.content}</p>
                      </div>
                      <button onClick={() => removeNote(n.id)} style={{ background:'none', border:'none', color:'#cbd5e1', cursor:'pointer', fontSize:12, padding:'2px 6px', flexShrink:0 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
            }

            {/* 수신자 선택 + 메시지 입력 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#64748b', flexShrink:0 }}>
                  <i className="fas fa-paper-plane" style={{ marginRight:4 }}></i>받는 사람
                </span>
                <select
                  value={msgRecipient}
                  onChange={e => setMsgRecipient(e.target.value)}
                  style={{ flex:1, padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer' }}
                >
                  <option value="">공유 메모 (담당 선생님 전체)</option>
                  {recipientOptions.length > 0 && (
                    <optgroup label="──────────────">
                      {recipientOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitNote()}
                  placeholder={msgRecipient
                    ? `${recipientOptions.find(o=>o.id===msgRecipient)?.name ?? ''}에게 메시지 입력... (Enter로 전송)`
                    : '공유 메모 입력... (Enter로 등록)'}
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 }}
                />
                <button
                  onClick={submitNote}
                  style={{ padding:'9px 16px', background: msgRecipient ? '#7209b7' : '#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, flexShrink:0 }}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const labelStyle = { width:60, fontSize:13, fontWeight:600, color:'#64748b', flexShrink:0 };

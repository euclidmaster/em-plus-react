import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getStudents, getStudent, updateStudent, deleteStudent, getTeachers,
  getStudentLinkedProfile, clearStudentAccount,
  getUnlinkedStudentProfiles, linkStudentAccount,
} from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';

export default function StudentInfoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [students, setStudents]             = useState([]);
  const [teachers, setTeachers]             = useState([]);
  const [selectedId, setSelectedId]         = useState(null);
  const [detail, setDetail]                 = useState(null);
  const [linkedProfile, setLinkedProfile]   = useState(null);
  const [unlinkedProfiles, setUnlinkedProfiles] = useState([]);
  const [linkTarget, setLinkTarget]         = useState('');
  const [editing, setEditing]               = useState(false);
  const [form, setForm]                     = useState({});
  const showToast = useToast();

  useEffect(() => {
    Promise.all([getStudents(), getTeachers()]).then(([s, t]) => {
      setStudents(s);
      setTeachers(t);
      const urlId = searchParams.get('id');
      const initId = urlId ?? (s.length ? s[0].id : null);
      if (initId) selectStudent(initId);
    }).catch(console.error);
  }, []);

  async function selectStudent(id) {
    setSelectedId(id);
    setEditing(false);
    setLinkedProfile(null);
    setLinkTarget('');
    setSearchParams({ id });
    try {
      const d = await getStudent(id);
      setDetail(d);
      setForm({ name: d.name, grade: d.grade??'', class_name: d.class_name??'', school_name: d.school_name??'', phone: d.phone??'', teacher_id: d.teacher_id??'', status: d.status });
      if (d.profile_id) {
        const prof = await getStudentLinkedProfile(d.profile_id);
        setLinkedProfile(prof);
      } else {
        // 미연결 상태면 연결 가능한 계정 목록 로드
        const unlinked = await getUnlinkedStudentProfiles();
        setUnlinkedProfiles(unlinked);
      }
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
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <span style={labelStyle}>담당강사</span>
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

        </div>
      )}
    </div>
  );
}

const labelStyle = { width:60, fontSize:13, fontWeight:600, color:'#64748b', flexShrink:0 };

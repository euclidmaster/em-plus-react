import { useEffect, useState } from 'react';
import { getTeachers, createTeacher, getMessages, sendMessage } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/common/Modal.jsx';

const AVATAR_COLORS = ['#4361ee','#2dc653','#f4a261','#7209b7','#e63946'];

export default function TeacherPage() {
  const [teachers, setTeachers]   = useState([]);
  const [messages, setMessages]   = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgTo, setMsgTo]         = useState(null);
  const [msgContent, setMsgContent] = useState('');
  const [teacherForm, setTeacherForm] = useState({ name:'', title:'', role:'teacher' });
  const showToast = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    load();
    if (profile?.id) getMessages(profile.id).then(setMessages).catch(console.error);
  }, [profile]);

  async function load() {
    try { setTeachers(await getTeachers()); }
    catch { showToast('강사 로드 실패', 'error'); }
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

      <div className="teacher-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginBottom:30 }}>
        {teachers.map((t, i) => (
          <div key={t.id} className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:24, gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:AVATAR_COLORS[i%AVATAR_COLORS.length], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>
              {t.name[0]}
            </div>
            <div style={{ textAlign:'center' }}>
              <h4 style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>{t.name}</h4>
              <span style={{ fontSize:13, color:'#64748b' }}>{t.title ?? (t.role==='assistant' ? '조교' : '담당강사')}</span>
            </div>
            <button onClick={() => { setMsgTo(t); setShowMsgModal(true); }}
              style={{ padding:'8px 16px', background:'#f0f4ff', color:'#4361ee', border:'1.5px solid #c7d2fe', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
              <i className="fas fa-envelope"></i> 쪽지
            </button>
          </div>
        ))}
        {teachers.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#94a3b8' }}>등록된 강사가 없습니다.</div>
        )}
      </div>

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
          <div style={{ display:'grid', gap:12 }}>
            {[{ label:'이름 *', key:'name', ph:'강사 이름' }, { label:'직함', key:'title', ph:'예: 수학 전문강사' }].map(({ label, key, ph }) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input type="text" value={teacherForm[key]} onChange={e => setTeacherForm(f => ({...f, [key]: e.target.value}))}
                  placeholder={ph} style={inp} />
              </div>
            ))}
            <div>
              <label style={lbl}>역할</label>
              <select value={teacherForm.role} onChange={e => setTeacherForm(f => ({...f, role: e.target.value}))} style={inp}>
                <option value="teacher">강사</option>
                <option value="assistant">조교</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowAddModal(false)} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submitTeacher} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-save"></i> 저장
            </button>
          </div>
        </Modal>
      )}

      {/* 쪽지 보내기 모달 */}
      {showMsgModal && msgTo && (
        <Modal title={<><i className="fas fa-envelope"></i> 쪽지 보내기</>} onClose={() => setShowMsgModal(false)}>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>받는 사람: <strong>{msgTo.name}</strong></p>
          <textarea value={msgContent} onChange={e => setMsgContent(e.target.value)}
            placeholder="쪽지 내용을 입력하세요..." rows={4}
            style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowMsgModal(false)} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submitMsg} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-paper-plane"></i> 전송
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };

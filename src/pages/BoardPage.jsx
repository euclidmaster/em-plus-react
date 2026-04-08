import { useEffect, useState } from 'react';
import { getBoardPosts, createBoardPost } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/common/Modal.jsx';

const CATEGORIES = ['공지','일반','자료'];

export default function BoardPage() {
  const [posts, setPosts]         = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ category:'일반', title:'', content:'' });
  const showToast = useToast();
  const { profile } = useAuth();

  useEffect(() => { load(); }, []);

  async function load() {
    try { setPosts(await getBoardPosts()); }
    catch { showToast('게시판 로드 실패', 'error'); }
  }

  async function submit() {
    if (!form.title.trim()) { showToast('제목을 입력하세요.', 'error'); return; }
    try {
      await createBoardPost({ ...form, author_name: profile?.name ?? '관리자' });
      showToast('게시글이 등록되었습니다.');
      setShowModal(false);
      setForm({ category:'일반', title:'', content:'' });
      load();
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-bullhorn"></i> 학원 게시판</h2>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-pen"></i> 글 작성
        </button>
      </div>

      <div className="card">
        {posts.length === 0
          ? <p style={{ textAlign:'center', color:'#94a3b8', padding:30 }}>게시글이 없습니다.</p>
          : posts.map(p => (
            <div key={p.id} style={{
              padding:'14px 0', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:12
            }}>
              <span style={{
                padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, flexShrink:0,
                background: p.category==='공지' ? '#e8ecff' : '#f1f5f9',
                color:      p.category==='공지' ? '#4361ee' : '#64748b',
              }}>
                {p.category}
              </span>
              <span style={{ flex:1, fontSize:14, fontWeight: p.category==='공지' ? 700 : 400, color:'#1e293b' }}>{p.title}</span>
              <span style={{ fontSize:13, color:'#94a3b8', flexShrink:0 }}>{p.author_name ?? '-'}</span>
              <span style={{ fontSize:12, color:'#94a3b8', flexShrink:0 }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          ))
        }
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-pen"></i> 글 작성</>} onClose={() => setShowModal(false)} width={500}>
          <div style={{ display:'grid', gap:12 }}>
            <div>
              <label style={lbl}>분류</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder="제목 입력" style={inp} />
            </div>
            <div>
              <label style={lbl}>내용</label>
              <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
                placeholder="내용 입력" rows={4} style={{ ...inp, resize:'vertical', minHeight:100 }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submit} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-save"></i> 등록
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };

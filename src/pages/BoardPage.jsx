import { useEffect, useState } from 'react';
import { getBoardPosts, createBoardPost, updateBoardPost, deleteBoardPost, getBoardComments, addBoardComment, deleteBoardComment } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from '../components/common/Modal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';

const CATEGORIES = ['전체', '공지', '일반', '자료'];
const CAT_STYLE = {
  공지: { bg: '#e8ecff', color: '#4361ee' },
  일반: { bg: '#f1f5f9', color: '#64748b' },
  자료: { bg: '#dcfce7', color: '#16a34a' },
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function BoardPage() {
  const [posts, setPosts]           = useState([]);
  const [catFilter, setCatFilter]   = useState('전체');
  const [searchQ, setSearchQ]       = useState('');
  const debouncedQ = useDebounce(searchQ);
  const [selected, setSelected]     = useState(null); // 상세 보기
  const [comments, setComments]     = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [showWrite, setShowWrite]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ category: '일반', title: '', content: '' });
  const showToast = useToast();
  const { profile } = useAuth();

  async function load() {
    try { setPosts(await getBoardPosts()); }
    catch { showToast('게시판 로드 실패', 'error'); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function openPost(post) {
    setSelected(post);
    try { setComments(await getBoardComments(post.id)); }
    catch { setComments([]); }
  }

  function closeWrite() {
    setShowWrite(false);
    setEditTarget(null);
    setForm({ category: '일반', title: '', content: '' });
  }

  async function submit() {
    if (!form.title.trim()) { showToast('제목을 입력하세요.', 'error'); return; }

    if (editTarget) {
      // 수정: 낙관적 업데이트, 실패 시 모달 유지 + 입력 보존
      const prevPost = posts.find(p => p.id === editTarget.id);
      const optimistic = { ...prevPost, ...form };
      setPosts(ps => ps.map(p => p.id === editTarget.id ? optimistic : p));
      if (selected?.id === editTarget.id) setSelected(optimistic);
      try {
        const updated = await updateBoardPost(editTarget.id, { category: form.category, title: form.title, content: form.content });
        setPosts(ps => ps.map(p => p.id === updated.id ? updated : p));
        if (selected?.id === updated.id) setSelected(updated);
        showToast('수정되었습니다.');
        closeWrite();
      } catch (e) {
        setPosts(ps => ps.map(p => p.id === prevPost.id ? prevPost : p));
        if (selected?.id === prevPost.id) setSelected(prevPost);
        showToast('수정 실패: ' + e.message, 'error');
      }
    } else {
      // 등록: 낙관적 업데이트, 실패 시 모달 유지 + 입력 보존
      const tempId = `temp-${Date.now()}`;
      const tempPost = { id: tempId, ...form, author_name: profile?.name ?? '관리자', created_at: new Date().toISOString() };
      setPosts(ps => [tempPost, ...ps]);
      try {
        const saved = await createBoardPost({ ...form, author_name: profile?.name ?? '관리자' });
        setPosts(ps => ps.map(p => p.id === tempId ? saved : p));
        showToast('게시글이 등록되었습니다.');
        closeWrite();
      } catch (e) {
        setPosts(ps => ps.filter(p => p.id !== tempId));
        showToast('등록 실패: ' + e.message, 'error');
      }
    }
  }

  async function remove(post) {
    if (!confirm(`"${post.title}" 글을 삭제하시겠습니까?`)) return;
    // 낙관적 삭제
    setPosts(ps => ps.filter(p => p.id !== post.id));
    if (selected?.id === post.id) setSelected(null);
    try {
      await deleteBoardPost(post.id);
      showToast('삭제되었습니다.');
    } catch (e) {
      setPosts(ps => [post, ...ps]);
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  function startEdit(post) {
    setEditTarget(post);
    setForm({ category: post.category, title: post.title, content: post.content ?? '' });
    setShowWrite(true);
  }

  async function submitComment() {
    const text = commentInput.trim();
    if (!text || !selected) return;
    // 낙관적 추가
    const tempId = `temp-${Date.now()}`;
    const tempComment = { id: tempId, post_id: selected.id, author_name: profile?.name ?? '관리자', content: text, created_at: new Date().toISOString() };
    setComments(prev => [...prev, tempComment]);
    setCommentInput('');
    try {
      const saved = await addBoardComment({ post_id: selected.id, author_name: profile?.name ?? '관리자', content: text });
      setComments(prev => prev.map(c => c.id === tempId ? saved : c));
    } catch (e) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      setCommentInput(text);
      showToast('댓글 등록 실패: ' + e.message, 'error');
    }
  }

  async function removeComment(id) {
    // 낙관적 삭제
    const backup = comments.find(c => c.id === id);
    setComments(prev => prev.filter(c => c.id !== id));
    try {
      await deleteBoardComment(id);
    } catch {
      setComments(prev => [...prev, backup].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      showToast('댓글 삭제 실패', 'error');
    }
  }

  const filtered = posts
    .filter(p => {
      if (catFilter !== '전체' && p.category !== catFilter) return false;
      if (debouncedQ) {
        const q = debouncedQ.toLowerCase();
        return p.title.toLowerCase().includes(q) || (p.content ?? '').toLowerCase().includes(q) || (p.author_name ?? '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const aPin = a.category === '공지' ? 0 : 1;
      const bPin = b.category === '공지' ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const catCount = cat => cat === '전체' ? posts.length : posts.filter(p => p.category === cat).length;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-bullhorn"></i> 학원 게시판</h2>
      </div>

      {/* 상세 보기 */}
      {selected ? (
        <div>
          {/* 뒤로가기 */}
          <button onClick={() => setSelected(null)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:14, marginBottom:16, padding:0 }}>
            <i className="fas fa-arrow-left"></i> 목록으로
          </button>

          <div className="card" style={{ marginBottom:16 }}>
            {/* 헤더 */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700,
                    background: CAT_STYLE[selected.category]?.bg ?? '#f1f5f9',
                    color: CAT_STYLE[selected.category]?.color ?? '#64748b',
                  }}>{selected.category}</span>
                </div>
                <h3 style={{ fontSize:18, fontWeight:700, color:'#1e293b', lineHeight:1.4, margin:0 }}>{selected.title}</h3>
                <div style={{ display:'flex', gap:16, marginTop:8, fontSize:13, color:'#94a3b8' }}>
                  <span><i className="fas fa-user" style={{ marginRight:4 }}></i>{selected.author_name ?? '관리자'}</span>
                  <span><i className="fas fa-clock" style={{ marginRight:4 }}></i>{timeAgo(selected.created_at)}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => startEdit(selected)} style={{ padding:'6px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13, color:'#475569' }}>
                  <i className="fas fa-edit"></i> 수정
                </button>
                <button onClick={() => remove(selected)} style={{ padding:'6px 14px', border:'1.5px solid #fee2e2', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13, color:'#ef4444' }}>
                  <i className="fas fa-trash"></i> 삭제
                </button>
              </div>
            </div>

            <hr style={{ border:'none', borderTop:'1px solid #f1f5f9', margin:'0 0 16px' }} />

            {/* 본문 */}
            <div style={{ fontSize:15, color:'#334155', lineHeight:1.8, whiteSpace:'pre-wrap', minHeight:80 }}>
              {selected.content || <span style={{ color:'#94a3b8' }}>내용이 없습니다.</span>}
            </div>
          </div>

          {/* 댓글 */}
          <div className="card">
            <h4 style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:14 }}>
              <i className="fas fa-comments" style={{ color:'#4361ee', marginRight:6 }}></i>
              댓글 {comments.length}
            </h4>

            {comments.length === 0 ? (
              <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:'16px 0' }}>첫 번째 댓글을 남겨보세요.</p>
            ) : (
              <div style={{ marginBottom:14 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ padding:'10px 0', borderBottom:'1px solid #f8fafc', display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'#e8ecff', color:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                      {(c.author_name ?? '?')[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{c.author_name}</span>
                        <span style={{ fontSize:11, color:'#94a3b8' }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize:14, color:'#475569', margin:0, lineHeight:1.6 }}>{c.content}</p>
                    </div>
                    <button onClick={() => removeComment(c.id)} style={{ background:'none', border:'none', color:'#cbd5e1', cursor:'pointer', fontSize:12, padding:'4px', flexShrink:0 }}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 댓글 입력 */}
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="댓글 입력... (Enter로 등록)"
                style={{ flex:1, padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none' }}
              />
              <button onClick={submitComment} style={{ padding:'9px 18px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 목록 */
        <div>
          {/* 카테고리 탭 + 검색 */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:6 }}>
              {CATEGORIES.map(c => {
                const active = catFilter === c;
                return (
                  <button key={c} onClick={() => setCatFilter(c)} style={{
                    padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                    border: '1.5px solid ' + (active ? (CAT_STYLE[c]?.color ?? '#4361ee') : '#e2e8f0'),
                    background: active ? (CAT_STYLE[c]?.bg ?? '#e8ecff') : '#fff',
                    color: active ? (CAT_STYLE[c]?.color ?? '#4361ee') : '#64748b',
                    display:'flex', alignItems:'center', gap:5,
                  }}>
                    {c}
                    <span style={{
                      fontSize:11, fontWeight:700, minWidth:18, height:18, borderRadius:9, padding:'0 4px',
                      background: active ? 'rgba(0,0,0,0.1)' : '#f1f5f9', color: active ? 'inherit' : '#94a3b8',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>{catCount(c)}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <i className="fas fa-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:12 }}></i>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="제목, 내용, 작성자 검색..."
                  style={{ padding:'8px 12px 8px 30px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, width:220 }} />
              </div>
              <button className="btn-primary" onClick={() => { setEditTarget(null); setForm({ category:'일반', title:'', content:'' }); setShowWrite(true); }}>
                <i className="fas fa-pen"></i> 글 작성
              </button>
            </div>
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {/* 테이블 헤더 */}
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 100px 90px', padding:'10px 18px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', fontSize:12, fontWeight:700, color:'#94a3b8' }}>
              <span>분류</span><span>제목</span><span>작성자</span><span style={{ textAlign:'right' }}>날짜</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8', fontSize:14 }}>
                <i className="fas fa-inbox" style={{ fontSize:32, display:'block', marginBottom:10, opacity:0.3 }}></i>
                게시글이 없습니다.
              </div>
            ) : (
              filtered.map((p, i) => (
                <div key={p.id}
                  onClick={() => openPost(p)}
                  style={{
                    display:'grid', gridTemplateColumns:'80px 1fr 100px 90px',
                    padding:'12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor:'pointer', alignItems:'center', transition:'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:700,
                    background: CAT_STYLE[p.category]?.bg ?? '#f1f5f9',
                    color: CAT_STYLE[p.category]?.color ?? '#64748b',
                  }}>{p.category}</span>
                  <span style={{ fontSize:14, fontWeight: p.category === '공지' ? 700 : 400, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:16 }}>
                    {p.title}
                  </span>
                  <span style={{ fontSize:13, color:'#64748b' }}>{p.author_name ?? '관리자'}</span>
                  <span style={{ fontSize:12, color:'#94a3b8', textAlign:'right' }}>{timeAgo(p.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 작성 / 수정 모달 */}
      {showWrite && (
        <Modal title={<><i className={`fas fa-${editTarget ? 'edit' : 'pen'}`}></i> {editTarget ? '글 수정' : '글 작성'}</>}
          onClose={closeWrite}
          width={560}>
          <div style={{ display:'grid', gap:12 }}>
            <div>
              <label style={lbl}>분류</label>
              <div style={{ display:'flex', gap:6 }}>
                {['공지','일반','자료'].map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({...f, category: c}))} style={{
                    padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer',
                    border: '1.5px solid ' + (form.category === c ? (CAT_STYLE[c]?.color ?? '#4361ee') : '#e2e8f0'),
                    background: form.category === c ? (CAT_STYLE[c]?.bg ?? '#e8ecff') : '#fff',
                    color: form.category === c ? (CAT_STYLE[c]?.color ?? '#4361ee') : '#64748b',
                  }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder="제목 입력" style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>내용</label>
              <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
                placeholder="내용 입력" rows={6} style={{ ...inp, resize:'vertical', minHeight:140 }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={closeWrite} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submit} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-save"></i> {editTarget ? '수정 완료' : '등록'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };

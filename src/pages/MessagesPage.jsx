import { useEffect, useRef, useState, useMemo } from 'react';
import { getAllMessages } from '../lib/api.js';

/* 두 ID를 정렬해 대화 쌍 식별 키 생성 */
function pairKey(a, b) { return [a, b].sort().join('::'); }

/* 날짜 포맷 */
const fmtTime = iso => new Date(iso).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
const fmtDate = iso => new Date(iso).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

export default function MessagesPage() {
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);

  /* 필터 */
  const [filterFrom, setFilterFrom] = useState(''); // 발신인 profile_id
  const [filterTo,   setFilterTo]   = useState(''); // 수신인 profile_id

  const bottomRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setAllMessages(await getAllMessages()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  /* ── 전체 참여자 목록 (id + name) ── */
  const participants = useMemo(() => {
    const map = new Map();
    allMessages.forEach(m => {
      if (!map.has(m.from_id)) map.set(m.from_id, m.from_name);
      if (!map.has(m.to_id))   map.set(m.to_id,   m.to_name);
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [allMessages]);

  /* ── 대화 쌍 목록 빌드 (필터 적용) ── */
  const conversations = useMemo(() => {
    const map = new Map();
    allMessages.forEach(m => {
      const key = pairKey(m.from_id, m.to_id);
      if (!map.has(key)) {
        map.set(key, {
          key,
          idA: m.from_id, nameA: m.from_name,
          idB: m.to_id,   nameB: m.to_name,
          senderIds:   new Set([m.from_id]),
          receiverIds: new Set([m.to_id]),
          lastMsg: m.content,
          lastAt:  m.created_at,
          count: 1,
        });
      } else {
        const c = map.get(key);
        c.senderIds.add(m.from_id);
        c.receiverIds.add(m.to_id);
        c.count++;
        if (m.created_at > c.lastAt) { c.lastMsg = m.content; c.lastAt = m.created_at; }
      }
    });

    return [...map.values()]
      .filter(c => {
        if (filterFrom && !c.senderIds.has(filterFrom))   return false;
        if (filterTo   && !c.receiverIds.has(filterTo))   return false;
        return true;
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [allMessages, filterFrom, filterTo]);

  /* ── 선택된 대화 스레드 (전체 — 필터 무관) ── */
  const selectedConv = conversations.find(c => c.key === selectedKey)
    ?? allMessages.reduce((found, m) => {
      if (found) return found;
      if (pairKey(m.from_id, m.to_id) === selectedKey) {
        return { key: selectedKey, idA: m.from_id, nameA: m.from_name, idB: m.to_id, nameB: m.to_name };
      }
      return null;
    }, null);

  const thread = useMemo(() =>
    selectedKey ? allMessages.filter(m => pairKey(m.from_id, m.to_id) === selectedKey) : [],
  [allMessages, selectedKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [thread.length]);

  /* 선택된 대화가 필터 결과에 없으면 초기화 */
  useEffect(() => {
    if (selectedKey && !conversations.find(c => c.key === selectedKey)) setSelectedKey(null);
  }, [conversations]);

  /* 필터 모드 라벨 */
  function filterLabel() {
    const fromName = participants.find(p => p.id === filterFrom)?.name;
    const toName   = participants.find(p => p.id === filterTo)?.name;
    if (filterFrom && filterTo)   return { text:`${fromName} → ${toName} 1:1 대화`, color:'#7209b7', bg:'#f3e8ff' };
    if (filterFrom && !filterTo)  return { text:`${fromName} 발신 대화`, color:'#4361ee', bg:'#eef2ff' };
    if (!filterFrom && filterTo)  return { text:`${toName} 수신 대화`, color:'#16a34a', bg:'#f0fdf4' };
    return null;
  }
  const label = filterLabel();

  function resetFilter() { setFilterFrom(''); setFilterTo(''); setSelectedKey(null); }

  /* 스레드 렌더링 */
  function renderThread() {
    let lastDate = null;
    const items = [];
    thread.forEach((m, i) => {
      const d = new Date(m.created_at).toDateString();
      if (d !== lastDate) {
        lastDate = d;
        items.push(
          <div key={`d${i}`} style={{ textAlign:'center', margin:'16px 0 8px' }}>
            <span style={{ fontSize:11, color:'#94a3b8', background:'#f8fafc', padding:'3px 12px', borderRadius:20, border:'1px solid #e2e8f0' }}>
              {fmtDate(m.created_at)}
            </span>
          </div>
        );
      }
      const isLeft = selectedConv && m.from_id === selectedConv.idA;
      items.push(
        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isLeft ? 'flex-start' : 'flex-end' }}>
          <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>{m.from_name}</div>
          <div style={{
            maxWidth:'68%', padding:'10px 14px', fontSize:14, lineHeight:1.5, wordBreak:'break-word',
            borderRadius: isLeft ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
            background: isLeft ? '#f1f5f9' : '#eef2ff',
            border: '1px solid ' + (isLeft ? '#e2e8f0' : '#c7d2fe'),
            color:'#1e293b',
          }}>{m.content}</div>
          <div style={{ fontSize:11, color:'#cbd5e1', marginTop:3 }}>{fmtTime(m.created_at)}</div>
        </div>
      );
    });
    return items;
  }

  const selDrop = { flex:1, padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="section-title-area">
        <h2><i className="fas fa-comments"></i> 전체 대화 열람</h2>
        <span style={{ fontSize:12, color:'#94a3b8', marginLeft:8 }}>관리자 전용</span>
      </div>

      {/* ── 필터 바 ── */}
      <div className="card" style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>

          {/* 발신인 */}
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#4361ee', display:'block', marginBottom:5 }}>
              <i className="fas fa-paper-plane" style={{ marginRight:4 }}></i>발신인
            </label>
            <select value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setSelectedKey(null); }} style={selDrop}>
              <option value="">전체</option>
              {participants
                .filter(p => !filterTo || p.id !== filterTo)
                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              }
            </select>
          </div>

          <div style={{ paddingBottom:8, color:'#94a3b8', fontSize:18 }}>→</div>

          {/* 수신인 */}
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#16a34a', display:'block', marginBottom:5 }}>
              <i className="fas fa-inbox" style={{ marginRight:4 }}></i>수신인
            </label>
            <select value={filterTo} onChange={e => { setFilterTo(e.target.value); setSelectedKey(null); }} style={selDrop}>
              <option value="">전체</option>
              {participants
                .filter(p => !filterFrom || p.id !== filterFrom)
                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              }
            </select>
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetFilter}
            disabled={!filterFrom && !filterTo}
            style={{
              padding:'8px 16px', border:'1.5px solid #e2e8f0', borderRadius:8,
              background: (filterFrom || filterTo) ? '#fff' : '#f8fafc',
              color: (filterFrom || filterTo) ? '#475569' : '#cbd5e1',
              cursor: (filterFrom || filterTo) ? 'pointer' : 'default',
              fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
            }}
          >
            <i className="fas fa-times"></i> 초기화
          </button>
        </div>

        {/* 필터 상태 배지 */}
        {label && (
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>현재 필터:</span>
            <span style={{ fontSize:12, fontWeight:700, color:label.color, background:label.bg, padding:'3px 12px', borderRadius:20 }}>
              {label.text}
            </span>
            <span style={{ fontSize:12, color:'#94a3b8' }}>— {conversations.length}건의 대화</span>
          </div>
        )}

        {/* 빠른 필터 안내 */}
        {!filterFrom && !filterTo && (
          <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              { icon:'fa-exchange-alt', text:'수신+발신 모두 보기', desc:'발신인·수신인 모두 비워두기' },
              { icon:'fa-paper-plane',  text:'발신인만',            desc:'발신인만 선택' },
              { icon:'fa-inbox',        text:'수신인만',            desc:'수신인만 선택' },
              { icon:'fa-user-friends', text:'특정 1:1 대화',       desc:'발신인·수신인 모두 선택' },
            ].map(({ icon, text, desc }) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#94a3b8', background:'#f8fafc', padding:'4px 10px', borderRadius:20, border:'1px solid #e2e8f0' }}>
                <i className={`fas ${icon}`} style={{ fontSize:10 }}></i>
                <span><strong style={{ color:'#475569' }}>{text}</strong>: {desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2패널 레이아웃 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, height:'calc(100vh - 320px)', minHeight:440 }}>

        {/* 왼쪽: 대화 목록 */}
        <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'8px 14px', fontSize:11, color:'#94a3b8', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
            대화 {conversations.length}건 · 전체 메시지 {allMessages.length}개
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {loading
              ? <div style={{ padding:30, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>
              : conversations.length === 0
                ? <div style={{ padding:30, textAlign:'center', color:'#94a3b8' }}>
                    <i className="fas fa-filter" style={{ fontSize:24, marginBottom:10, display:'block' }}></i>
                    조건에 맞는 대화가 없습니다.
                  </div>
                : conversations.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setSelectedKey(c.key)}
                      style={{
                        width:'100%', textAlign:'left', padding:'12px 14px',
                        background: selectedKey === c.key ? '#eef2ff' : 'transparent',
                        border:'none', borderBottom:'1px solid #f1f5f9',
                        borderLeft: selectedKey === c.key ? '3px solid #4361ee' : '3px solid transparent',
                        cursor:'pointer', transition:'all 0.15s',
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <div style={{ position:'relative', width:36, height:24, flexShrink:0 }}>
                          <Avatar name={c.nameA} size={24} color="#4361ee" style={{ position:'absolute', left:0, top:0 }} />
                          <Avatar name={c.nameB} size={24} color="#7209b7" style={{ position:'absolute', left:12, top:0, border:'2px solid #fff' }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontWeight:600, fontSize:13, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {c.nameA} · {c.nameB}
                            </span>
                            <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0, marginLeft:4 }}>{c.count}개</span>
                          </div>
                          <div style={{ fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>
                            {c.lastMsg}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:'#cbd5e1', paddingLeft:44 }}>{fmtTime(c.lastAt)}</div>
                    </button>
                  ))
            }
          </div>
        </div>

        {/* 오른쪽: 스레드 */}
        <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {!selectedConv
            ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8', gap:12 }}>
                <i className="fas fa-comment-dots" style={{ fontSize:40 }} />
                <p style={{ fontSize:14 }}>왼쪽에서 대화를 선택하세요.</p>
                {!filterFrom && !filterTo && (
                  <p style={{ fontSize:12, color:'#cbd5e1' }}>위 필터로 특정 인물의 대화만 볼 수 있습니다.</p>
                )}
              </div>
            )
            : (
              <>
                {/* 헤더 */}
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <Avatar name={selectedConv.nameA} size={36} color="#4361ee" />
                  <i className="fas fa-exchange-alt" style={{ color:'#94a3b8', fontSize:12 }} />
                  <Avatar name={selectedConv.nameB} size={36} color="#7209b7" />
                  <div style={{ marginLeft:4 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>
                      {selectedConv.nameA} · {selectedConv.nameB}
                    </div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>메시지 {thread.length}개</div>
                  </div>
                  <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 12px', background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:20, flexShrink:0 }}>
                    <i className="fas fa-eye" style={{ fontSize:11, color:'#f59e0b' }} />
                    <span style={{ fontSize:11, color:'#f59e0b', fontWeight:600 }}>관리자 열람 모드</span>
                  </div>
                </div>

                {/* 메시지 스레드 */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
                  {renderThread()}
                  <div ref={bottomRef} />
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, size, color, style: extra }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:color, color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size * 0.42, fontWeight:700, flexShrink:0,
      ...extra,
    }}>
      {name?.[0] ?? '?'}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { getAllPerformances, getPerformances, createPerformance, updatePerformance, deletePerformance } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import AttachmentInput from '../components/common/AttachmentInput.jsx';

/* ── 상수 ── */
const EVAL_TYPES = ['평가형 (단순 문제풀이)','활동형 (논술·보고서)','활동형 (토의·발표)','활동형 (독서활동)'];
const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const emptySession = (no) => ({ session_no:no, eval_date:'', eval_types:[], is_done:false });
const EMPTY_FORM = { subject:'', description:'', attachment_url:'', final_done:false,
  sessions:[emptySession(1), emptySession(2), emptySession(3)] };

function getDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((new Date(dateStr) - today) / 86400000);
  if (diff === 0)          return { label:'D-Day', color:'#ef4444', bg:'#fee2e2' };
  if (diff > 0 && diff<=3) return { label:`D-${diff}`, color:'#ef4444', bg:'#fee2e2' };
  if (diff > 0 && diff<=7) return { label:`D-${diff}`, color:'#f59e0b', bg:'#fffbeb' };
  if (diff > 0)            return { label:`D-${diff}`, color:'#64748b', bg:'#f1f5f9' };
  return { label:`D+${Math.abs(diff)}`, color:'#94a3b8', bg:'#f8fafc' };
}

/* ════════════════════════════════════════════════
   메인 페이지
════════════════════════════════════════════════ */
export default function PerformancePage() {
  const { students } = useStudentList();
  const [tab, setTab]             = useState('calendar');
  const [allPerfs, setAllPerfs]   = useState([]);   // 달력·목록용 (전체 학생)
  const [perfs, setPerfs]         = useState([]);   // 관리탭용 (선택 학생)
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const showToast = useToast();

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (students.length && selectedId === null) { setSelectedId(students[0].id); loadOne(students[0].id); }
  }, [students]);

  async function loadAll() {
    try { setAllPerfs(await getAllPerformances()); } catch {}
  }
  async function loadOne(id) {
    try { setPerfs(await getPerformances(id ?? selectedId)); } catch {}
  }

  function openAdd() { setForm(EMPTY_FORM); setModal('add'); }
  function openEdit(p) {
    const sessions = [1,2,3].map(no => {
      const s = (p.performance_sessions??[]).find(s=>s.session_no===no);
      return s ? { session_no:no, eval_date:s.eval_date??'', eval_types:s.eval_types??[], is_done:s.is_done??false } : emptySession(no);
    });
    setForm({ subject:p.subject??'', description:p.description??'', attachment_url:p.attachment_url??'', final_done:p.final_done??false, sessions });
    setModal(p);
  }
  async function submit() {
    if (!selectedId) { showToast('학생을 선택하세요.','error'); return; }
    if (!form.subject.trim()) { showToast('과목명을 입력하세요.','error'); return; }
    try {
      await createPerformance({ ...form, student_id: selectedId });
      showToast('수행 기록이 등록되었습니다.');
      setModal(null); loadOne(); loadAll();
    } catch(e) { showToast('등록 실패: '+e.message,'error'); }
  }
  async function submitEdit() {
    if (!form.subject.trim()) { showToast('과목명을 입력하세요.','error'); return; }
    try {
      await updatePerformance(modal.id, form);
      showToast('수정되었습니다.');
      setModal(null); loadOne(); loadAll();
    } catch(e) { showToast('수정 실패: '+e.message,'error'); }
  }
  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await deletePerformance(id); showToast('삭제되었습니다.'); loadOne(); loadAll(); }
    catch { showToast('삭제 실패','error'); }
  }

  const isEdit = modal && modal !== 'add';

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-clipboard-check"></i> 수행 관리</h2>
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', gap:8, marginBottom:20, borderBottom:'2px solid #f1f5f9', paddingBottom:0 }}>
        {[['calendar','fa-calendar-alt','달력 보기'],['list','fa-list-ul','마감 목록'],['manage','fa-cog','수행 관리']].map(([key,icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontWeight: tab===key ? 700 : 500, fontSize:14,
            color: tab===key ? '#4361ee' : '#64748b',
            borderBottom: tab===key ? '2px solid #4361ee' : '2px solid transparent',
            marginBottom:-2, transition:'all 0.15s',
          }}>
            <i className={`fas ${icon}`} style={{ marginRight:6 }}></i>{label}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        {tab==='manage' && (
          <button className="btn-primary" onClick={openAdd} style={{ marginBottom:4 }}>
            <i className="fas fa-plus"></i> 수행 추가
          </button>
        )}
      </div>

      {/* 달력 탭 */}
      {tab==='calendar' && <CalendarView performances={allPerfs} showStudentName
        onStudentClick={id=>{ setSelectedId(id); loadOne(id); setTab('manage'); }} />}

      {/* 목록 탭 */}
      {tab==='list' && <DeadlineList performances={allPerfs} showStudentName
        onStudentClick={id=>{ setSelectedId(id); loadOne(id); setTab('manage'); }} />}

      {/* 관리 탭 */}
      {tab==='manage' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
            <StudentSelect students={students} value={selectedId} onChange={id=>{setSelectedId(id);loadOne(id);}} />
          </div>
          <ManageList perfs={perfs} onEdit={openEdit} onDelete={remove} />
        </>
      )}

      {/* 모달 */}
      {modal && (
        <div onClick={()=>setModal(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:16,width:'100%',maxWidth:540,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'20px 24px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
              <h3 style={{ margin:0,fontSize:17,fontWeight:700,color:'#1e293b' }}>
                <i className={`fas ${isEdit?'fa-edit':'fa-clipboard-check'}`} style={{ marginRight:8,color:'#4361ee' }}></i>
                {isEdit?'수행 수정':'수행 추가'}
              </h3>
              <button onClick={()=>setModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:18 }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ overflowY:'auto',padding:'20px 24px',flex:1 }}>
              <PerformanceForm form={form} setForm={setForm} />
            </div>
            <div style={{ padding:'14px 24px',borderTop:'1px solid #f1f5f9',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0 }}>
              <button onClick={()=>setModal(null)} style={btnCancel}>취소</button>
              <button onClick={isEdit?submitEdit:submit} style={btnSave}>
                <i className="fas fa-save"></i> {isEdit?'수정 저장':'저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   달력 뷰 (안 1 + 안 4)
════════════════════════════════════════════════ */
function CalendarView({ performances, showStudentName, onStudentClick }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel, setSel]     = useState(today.toISOString().slice(0,10));

  const dateMap = useMemo(() => {
    const map = {};
    performances.forEach(p => {
      (p.performance_sessions??[]).forEach(s => {
        if (!s.eval_date) return;
        (map[s.eval_date] = map[s.eval_date]||[]).push({ perf:p, session:s });
      });
    });
    return map;
  }, [performances]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const todayStr   = today.toISOString().slice(0,10);
  const selItems   = dateMap[sel] ?? [];
  const pad = n => String(n).padStart(2,'0');
  const cellDate = d => `${year}-${pad(month+1)}-${pad(d)}`;

  function prev() { month===0 ? (setMonth(11),setYear(y=>y-1)) : setMonth(m=>m-1); }
  function next() { month===11 ? (setMonth(0),setYear(y=>y+1)) : setMonth(m=>m+1); }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16, alignItems:'start' }}>
      {/* 달력 */}
      <div className="card" style={{ padding:16 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
          <button onClick={prev} style={navBtn}>‹</button>
          <span style={{ fontWeight:700,fontSize:14,color:'#1e293b' }}>{year}년 {MONTHS[month]}</span>
          <button onClick={next} style={navBtn}>›</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4 }}>
          {DAYS.map((d,i)=>(
            <div key={d} style={{ textAlign:'center',fontSize:11,fontWeight:600,padding:'3px 0',
              color:i===0?'#ef4444':i===6?'#3b82f6':'#94a3b8' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
          {cells.map((d,i)=>{
            if (!d) return <div key={i}/>;
            const ds = cellDate(d);
            const items = dateMap[ds]??[];
            const isT = ds===todayStr, isS = ds===sel;
            const dow = i%7;
            return (
              <div key={i} onClick={()=>setSel(ds)} style={{
                textAlign:'center',padding:'5px 2px',borderRadius:8,cursor:'pointer',
                background:isS?'#4361ee':isT?'#eef2ff':'transparent',
                color:isS?'#fff':dow===0?'#ef4444':dow===6?'#3b82f6':'#1e293b',
                fontWeight:isT||isS?700:400, fontSize:12, transition:'all 0.1s',
              }}>
                {d}
                {items.length>0&&(
                  <div style={{ display:'flex',justifyContent:'center',gap:2,marginTop:2 }}>
                    {items.slice(0,3).map((_,idx)=>(
                      <div key={idx} style={{ width:5,height:5,borderRadius:'50%',background:isS?'rgba(255,255,255,0.8)':'#4361ee' }}/>
                    ))}
                    {items.length>3&&<span style={{ fontSize:8,color:isS?'#fff':'#4361ee',lineHeight:'5px' }}>+</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:10,paddingTop:8,borderTop:'1px solid #f1f5f9',display:'flex',gap:12 }}>
          <span style={{ fontSize:10,color:'#94a3b8',display:'flex',alignItems:'center',gap:4 }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#4361ee' }}/> 마감있는 날
          </span>
          <span style={{ fontSize:10,color:'#94a3b8',display:'flex',alignItems:'center',gap:4 }}>
            <div style={{ width:14,height:14,borderRadius:4,background:'#eef2ff',border:'1px solid #c7d2fe' }}/> 오늘
          </span>
        </div>
      </div>

      {/* 상세 패널 */}
      <div className="card" style={{ minHeight:320 }}>
        <div style={{ fontWeight:700,fontSize:14,color:'#1e293b',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8 }}>
          <i className="fas fa-calendar-day" style={{ color:'#4361ee' }}></i>
          {sel}
          <span style={{ fontSize:12,color:'#94a3b8',fontWeight:400 }}>
            {selItems.length>0?`마감 ${selItems.length}건`:'마감 없음'}
          </span>
        </div>
        {selItems.length===0
          ? <div style={{ textAlign:'center',padding:'48px 0',color:'#94a3b8' }}>
              <i className="fas fa-calendar-check" style={{ fontSize:28,marginBottom:10,display:'block' }}></i>
              이 날 마감인 수행평가가 없습니다.
            </div>
          : <div style={{ display:'grid',gap:10 }}>
              {selItems.map(({perf,session},idx)=>{
                const dd = getDday(session.eval_date);
                return (
                  <div key={idx}
                    onClick={() => onStudentClick?.(perf.student_id)}
                    style={{
                      display:'flex',alignItems:'center',gap:12,padding:'10px 14px',
                      borderRadius:10,background:session.is_done?'#f0fdf4':'#f8fafc',
                      border:'1.5px solid '+(session.is_done?'#86efac':'#e2e8f0'),
                      cursor: onStudentClick ? 'pointer' : 'default',
                      transition:'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { if(onStudentClick) e.currentTarget.style.boxShadow='0 2px 12px rgba(67,97,238,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; }}
                  >
                    <div style={{
                      padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700,flexShrink:0,
                      minWidth:52,textAlign:'center',
                      background:session.is_done?'#dcfce7':(dd?.bg??'#f1f5f9'),
                      color:session.is_done?'#16a34a':(dd?.color??'#64748b'),
                    }}>
                      {session.is_done?'완료':(dd?.label??'-')}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:13,color:'#1e293b',display:'flex',alignItems:'center',gap:6 }}>
                        {perf.subject}
                        <span style={{ fontSize:11,color:'#94a3b8',fontWeight:400 }}>{session.session_no}차시</span>
                      </div>
                      {showStudentName&&<div style={{ fontSize:12,color:'#64748b',marginTop:2 }}>{perf.student_name}</div>}
                      {session.eval_types?.length>0&&(
                        <div style={{ fontSize:11,color:'#7209b7',marginTop:2 }}>{session.eval_types.join(' · ')}</div>
                      )}
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                      {session.is_done&&<i className="fas fa-check-circle" style={{ color:'#16a34a',fontSize:16 }}></i>}
                      {onStudentClick&&<i className="fas fa-chevron-right" style={{ color:'#c7d2fe',fontSize:11 }}></i>}
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   마감 목록 뷰 (D-day 정렬)
════════════════════════════════════════════════ */
function DeadlineList({ performances, showStudentName, onStudentClick }) {
  const [statusFilter, setStatusFilter] = useState('전체');
  const [subjectFilter, setSubjectFilter] = useState('전체');

  const subjects = useMemo(() => ['전체',...new Set(performances.map(p=>p.subject))], [performances]);

  const items = useMemo(() => {
    const list = [];
    performances.forEach(p => {
      (p.performance_sessions??[]).forEach(s => {
        list.push({ perf:p, session:s });
      });
    });
    // sort by eval_date ascending (null last)
    return list.sort((a,b)=>{
      if (!a.session.eval_date) return 1;
      if (!b.session.eval_date) return -1;
      return a.session.eval_date.localeCompare(b.session.eval_date);
    });
  }, [performances]);

  const filtered = items.filter(({perf,session})=>{
    if (statusFilter==='진행중' && session.is_done) return false;
    if (statusFilter==='완료' && !session.is_done) return false;
    if (subjectFilter!=='전체' && perf.subject!==subjectFilter) return false;
    return true;
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const urgent  = filtered.filter(({session})=>{ const dd=getDday(session.eval_date); return !session.is_done&&dd&&dd.color==='#ef4444'; }).length;
  const doneCount = items.filter(({session})=>session.is_done).length;

  return (
    <div>
      {/* 요약 뱃지 */}
      <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
        {[
          { label:`전체 ${items.length}건`, color:'#4361ee', bg:'#eef2ff' },
          { label:`임박 ${urgent}건`, color:'#ef4444', bg:'#fee2e2' },
          { label:`완료 ${doneCount}건`, color:'#16a34a', bg:'#dcfce7' },
        ].map(({label,color,bg})=>(
          <span key={label} style={{ padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:700,background:bg,color }}>{label}</span>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ display:'flex',gap:6 }}>
          {['전체','진행중','완료'].map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)} style={{
              padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
              border:'1.5px solid '+(statusFilter===f?'#4361ee':'#e2e8f0'),
              background:statusFilter===f?'#4361ee':'#fff',
              color:statusFilter===f?'#fff':'#475569',
            }}>{f}</button>
          ))}
        </div>
        <select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}
          style={{ padding:'6px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,cursor:'pointer',background:'#fff' }}>
          {subjects.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {/* 목록 */}
      {filtered.length===0
        ? <div className="card" style={{ textAlign:'center',padding:48,color:'#94a3b8' }}>
            <i className="fas fa-check-circle" style={{ fontSize:28,marginBottom:10,display:'block',color:'#86efac' }}></i>
            해당하는 수행평가가 없습니다.
          </div>
        : <div style={{ display:'grid',gap:10 }}>
            {filtered.map(({perf,session},idx)=>{
              const dd = getDday(session.eval_date);
              return (
                <div key={idx}
                  onClick={() => onStudentClick?.(perf.student_id)}
                  style={{
                    display:'flex',alignItems:'center',gap:14,padding:'12px 16px',
                    borderRadius:12,background:session.is_done?'#f0fdf4':'#fff',
                    border:'1.5px solid '+(session.is_done?'#86efac':'#e2e8f0'),
                    boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                    cursor: onStudentClick ? 'pointer' : 'default',
                    transition:'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { if(onStudentClick) e.currentTarget.style.boxShadow='0 2px 12px rgba(67,97,238,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; }}
                >
                  {/* D-day */}
                  <div style={{
                    padding:'5px 12px',borderRadius:10,fontSize:12,fontWeight:700,
                    flexShrink:0,minWidth:60,textAlign:'center',
                    background:session.is_done?'#dcfce7':(dd?.bg??'#f1f5f9'),
                    color:session.is_done?'#16a34a':(dd?.color??'#64748b'),
                  }}>
                    {session.is_done?'완료':(dd?.label??'날짜없음')}
                  </div>
                  {/* 내용 */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700,fontSize:14,color:'#1e293b' }}>{perf.subject}</span>
                      <span style={{ fontSize:12,color:'#94a3b8' }}>{session.session_no}차시</span>
                      {session.eval_types?.slice(0,2).map(t=>(
                        <span key={t} style={{ fontSize:10,padding:'1px 7px',borderRadius:8,background:'#eef2ff',color:'#4361ee',fontWeight:600 }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display:'flex',gap:10,marginTop:3,flexWrap:'wrap' }}>
                      {showStudentName&&<span style={{ fontSize:12,color:'#64748b' }}>{perf.student_name}</span>}
                      {session.eval_date&&<span style={{ fontSize:12,color:'#94a3b8' }}>{session.eval_date}</span>}
                      {perf.final_done&&<span style={{ fontSize:11,color:'#16a34a',fontWeight:600 }}><i className="fas fa-flag-checkered" style={{ marginRight:3 }}></i>최종완료</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                    {session.is_done&&<i className="fas fa-check-circle" style={{ color:'#16a34a',fontSize:18 }}></i>}
                    {onStudentClick&&<i className="fas fa-chevron-right" style={{ color:'#c7d2fe',fontSize:11 }}></i>}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════
   수행 관리 탭 (기존 CRUD 목록)
════════════════════════════════════════════════ */
function ManageList({ perfs, onEdit, onDelete }) {
  if (perfs.length===0) return (
    <div className="card" style={{ textAlign:'center',padding:48,color:'#94a3b8' }}>
      <i className="fas fa-clipboard" style={{ fontSize:32,marginBottom:12,display:'block' }}></i>
      수행 기록이 없습니다. 수행 추가 버튼을 눌러 등록하세요.
    </div>
  );
  return (
    <div style={{ display:'grid',gap:14 }}>
      {perfs.map(p=>{
        const sessions=(p.performance_sessions??[]).sort((a,b)=>a.session_no-b.session_no);
        const allTypes=[...new Set(sessions.flatMap(s=>s.eval_types??[]))];
        const doneCount=sessions.filter(s=>s.is_done).length;
        return (
          <div key={p.id} className="card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12 }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700,fontSize:15,color:'#1e293b' }}>{p.subject}</span>
                  {allTypes.map(t=><span key={t} style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:'#eef2ff',color:'#4361ee',fontWeight:600 }}>{t}</span>)}
                  {p.final_done
                    ?<span style={{ fontSize:11,padding:'2px 10px',borderRadius:10,background:'#dcfce7',color:'#16a34a',fontWeight:700 }}><i className="fas fa-flag-checkered" style={{ marginRight:4 }}></i>최종완료</span>
                    :sessions.length>0&&<span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:'#f8fafc',color:'#64748b' }}>{doneCount}/{sessions.length}차시 완료</span>
                  }
                </div>
                {p.description&&<p style={{ fontSize:13,color:'#64748b',margin:'0 0 10px',lineHeight:1.5 }}>{p.description}</p>}
                {sessions.length>0&&(
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    {sessions.map(s=>(
                      <div key={s.session_no} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:s.is_done?'#f0fdf4':'#f8fafc',borderRadius:8,border:'1px solid '+(s.is_done?'#86efac':'#e2e8f0') }}>
                        <div style={{ width:20,height:20,borderRadius:'50%',background:s.is_done?'#16a34a':'#4361ee',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0 }}>
                          {s.is_done?<i className="fas fa-check"></i>:s.session_no}
                        </div>
                        <div>
                          <div style={{ fontSize:11,fontWeight:700,color:s.is_done?'#16a34a':'#1e293b' }}>{s.session_no}차시</div>
                          {s.eval_date&&<div style={{ fontSize:10,color:'#94a3b8' }}>{s.eval_date}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                <button onClick={()=>onEdit(p)} style={btnEdit}><i className="fas fa-edit"></i></button>
                <button onClick={()=>onDelete(p.id)} style={btnDel}><i className="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════
   수행 입력 폼
════════════════════════════════════════════════ */
function PerformanceForm({ form, setForm }) {
  function updateSession(no,key,val) {
    setForm(f=>({...f,sessions:f.sessions.map(s=>s.session_no===no?{...s,[key]:val}:s)}));
  }
  function toggleType(no,type) {
    setForm(f=>({...f,sessions:f.sessions.map(s=>{
      if(s.session_no!==no)return s;
      const t=s.eval_types??[];
      return {...s,eval_types:t.includes(type)?t.filter(x=>x!==type):[...t,type]};
    })}));
  }
  return (
    <div style={{ display:'grid',gap:16 }}>
      <div>
        <label style={lbl}>과목명 <span style={{ color:'#ef4444' }}>*</span></label>
        <input type="text" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}
          placeholder="국어, 수학, 창체, 학교행사, 특강 등" style={inp}/>
      </div>
      <div>
        <label style={lbl}>내용 / 메모</label>
        <textarea value={form.description??''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
          rows={2} style={{...inp,resize:'vertical',minHeight:60}}/>
      </div>
      <div>
        <label style={lbl}>차시별 일정 및 평가</label>
        <div style={{ display:'grid',gap:10 }}>
          {form.sessions.map(s=>(
            <div key={s.session_no} style={{ border:'1.5px solid '+(s.is_done?'#86efac':'#e2e8f0'),borderRadius:12,padding:14,background:s.is_done?'#f0fdf4':'#fafafa',transition:'all 0.15s' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:24,height:24,borderRadius:'50%',background:s.is_done?'#16a34a':'#4361ee',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700 }}>
                    {s.is_done?<i className="fas fa-check"></i>:s.session_no}
                  </div>
                  <span style={{ fontWeight:700,fontSize:13 }}>{s.session_no}차시</span>
                </div>
                <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,fontWeight:600,color:s.is_done?'#16a34a':'#64748b' }}>
                  <input type="checkbox" checked={s.is_done??false} onChange={e=>updateSession(s.session_no,'is_done',e.target.checked)} style={{ width:15,height:15 }}/>완료
                </label>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={sublbl}>날짜</label>
                <input type="date" value={s.eval_date??''} onChange={e=>updateSession(s.session_no,'eval_date',e.target.value)} style={{...inp,padding:'8px 12px'}}/>
              </div>
              <div>
                <label style={sublbl}>평가 형태 (복수 선택)</label>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                  {EVAL_TYPES.map(type=>{
                    const checked=(s.eval_types??[]).includes(type);
                    return (
                      <label key={type} style={{ display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:12,padding:'7px 10px',borderRadius:8,background:checked?'#eef2ff':'#fff',border:'1.5px solid '+(checked?'#4361ee':'#e2e8f0'),color:checked?'#4361ee':'#475569',fontWeight:checked?600:400,transition:'all 0.12s' }}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleType(s.session_no,type)} style={{ display:'none' }}/>
                        <i className={`fa${checked?'s':'r'} fa-${checked?'check-':''}square`} style={{ fontSize:11 }}></i>
                        {type}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'12px 16px',borderRadius:10,background:form.final_done?'#f0fdf4':'#f8fafc',border:'1.5px solid '+(form.final_done?'#86efac':'#e2e8f0'),transition:'all 0.15s' }}>
        <input type="checkbox" checked={form.final_done??false} onChange={e=>setForm(f=>({...f,final_done:e.target.checked}))} style={{ width:16,height:16 }}/>
        <span style={{ fontWeight:700,fontSize:14,color:form.final_done?'#16a34a':'#475569' }}>
          <i className="fas fa-flag-checkered" style={{ marginRight:6 }}></i>최종 완료
        </span>
      </label>
      <div>
        <label style={lbl}>첨부 파일</label>
        <AttachmentInput value={form.attachment_url??''} onChange={url=>setForm(f=>({...f,attachment_url:url}))} />
      </div>
    </div>
  );
}

const lbl={fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4};
const sublbl={fontSize:11,color:'#94a3b8',fontWeight:600,display:'block',marginBottom:5};
const inp={width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,boxSizing:'border-box',fontFamily:'inherit'};
const btnCancel={padding:'10px 20px',border:'1.5px solid #e2e8f0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:14};
const btnSave={padding:'10px 20px',background:'#4361ee',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600};
const btnEdit={padding:'5px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,background:'#fff',color:'#475569',cursor:'pointer',fontSize:13};
const btnDel={padding:'5px 10px',border:'1.5px solid #fca5a5',borderRadius:7,background:'#fff',color:'#dc2626',cursor:'pointer',fontSize:13};
const navBtn={background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#64748b',padding:'2px 8px',borderRadius:6,lineHeight:1};

import { useEffect, useState } from 'react';
import { getDailyRecords, createDailyRecord, updateDailyRecord, deleteDailyRecord } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';

const SUBJECTS = ['국어','수학','영어','과학','사회','한국사'];
const COLORS = ['blue','green','orange','purple','red'];
const colorMap = { blue:'#4361ee', green:'#2dc653', orange:'#f4a261', purple:'#7209b7', red:'#e63946' };

export default function DailyRecordPage() {
  const { students } = useStudentList();
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate]           = useState(new Date().toISOString().slice(0,10));
  const [records, setRecords]     = useState([]);
  const [drafts, setDrafts]       = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData]   = useState({});
  const showToast = useToast();

  useEffect(() => {
    if (students.length && selectedId === null) setSelectedId(students[0].id);
  }, [students]);

  useEffect(() => { if (selectedId) load(); }, [selectedId, date]);

  async function load() {
    try { setRecords(await getDailyRecords(selectedId, date)); setDrafts([]); setEditingId(null); }
    catch { showToast('기록 로드 실패', 'error'); }
  }

  function addDraft() {
    setDrafts(prev => [...prev, { subject:'국어', material:'', study_range:'', study_minutes:'' }]);
  }

  function updateDraft(idx, key, val) {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d));
  }

  async function save() {
    if (!drafts.length) { showToast('저장할 기록이 없습니다.', 'error'); return; }
    if (!selectedId) { showToast('학생을 선택하세요.', 'error'); return; }
    const payloads = drafts.filter(d => d.subject).map(d => ({
      student_id: selectedId, record_date: date,
      subject: d.subject, material: d.material, study_range: d.study_range,
      study_minutes: parseInt(d.study_minutes) || 0, notes: '',
    }));
    try {
      await Promise.all(payloads.map(p => createDailyRecord(p)));
      showToast('학습 기록이 저장되었습니다.');
      load();
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
  }

  function startEdit(record) {
    setEditingId(record.id);
    setEditData({ subject: record.subject, material: record.material ?? '', study_range: record.study_range ?? '', study_minutes: record.study_minutes ?? 0 });
  }

  async function saveEdit(id) {
    try {
      await updateDailyRecord(id, { ...editData, study_minutes: parseInt(editData.study_minutes) || 0 });
      showToast('수정되었습니다.');
      load();
    } catch (e) { showToast('수정 실패: ' + e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await deleteDailyRecord(id); showToast('삭제되었습니다.'); load(); }
    catch { showToast('삭제 실패', 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-book-open"></i> 일일 학습 기록</h2>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
        <StudentSelect students={students} value={selectedId} onChange={setSelectedId} />
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>날짜</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 }} />
      </div>

      {/* 기존 기록 */}
      {records.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:'#64748b', marginBottom:12 }}>저장된 기록</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {records.map((r, i) => (
              <div key={r.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ background: colorMap[COLORS[i%COLORS.length]], padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  {editingId === r.id ? (
                    <select value={editData.subject} onChange={e => setEditData(p => ({ ...p, subject: e.target.value }))}
                      style={{ background:'transparent', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      {SUBJECTS.map(s => <option key={s} style={{ color:'#1e293b' }}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ color:'#fff', fontWeight:700 }}>{r.subject}</span>
                  )}
                  <div style={{ display:'flex', gap:6 }}>
                    {editingId === r.id ? (
                      <>
                        <button onClick={() => saveEdit(r.id)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', cursor:'pointer', borderRadius:4, padding:'2px 8px', fontSize:12 }}>저장</button>
                        <button onClick={() => setEditingId(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:12 }}>취소</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(r)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer' }} title="수정">
                          <i className="fas fa-pen"></i>
                        </button>
                        <button onClick={() => remove(r.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer' }} title="삭제">
                          <i className="fas fa-trash"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ padding:14, display:'grid', gap:6, fontSize:13 }}>
                  {editingId === r.id ? (
                    <>
                      {[{ label:'교재', key:'material', ph:'교재명' }, { label:'범위', key:'study_range', ph:'페이지/단원' }].map(({ label, key, ph }) => (
                        <div key={key}>
                          <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>{label}</label>
                          <input type="text" value={editData[key]} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={ph} style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>순공시간 (분)</label>
                        <input type="number" value={editData.study_minutes} onChange={e => setEditData(p => ({ ...p, study_minutes: e.target.value }))}
                          min={0} style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div><span style={{ color:'#94a3b8' }}>교재: </span>{r.material || '-'}</div>
                      <div><span style={{ color:'#94a3b8' }}>범위: </span>{r.study_range || '-'}</div>
                      <div><span style={{ color:'#94a3b8' }}>순공: </span>{r.study_minutes}분</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새 기록 입력 */}
      {drafts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:'#64748b', marginBottom:12 }}>새 기록 입력</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {drafts.map((d, idx) => (
              <div key={idx} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ background: colorMap[COLORS[(records.length+idx)%COLORS.length]], padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <select value={d.subject} onChange={e => updateDraft(idx,'subject',e.target.value)}
                    style={{ background:'transparent', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                    {SUBJECTS.map(s => <option key={s} style={{ color:'#1e293b' }}>{s}</option>)}
                  </select>
                  <button onClick={() => setDrafts(prev => prev.filter((_,i) => i !== idx))} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div style={{ padding:14, display:'grid', gap:8 }}>
                  {[{ label:'교재', key:'material', ph:'교재명' }, { label:'범위', key:'study_range', ph:'페이지/단원' }].map(({ label, key, ph }) => (
                    <div key={key}>
                      <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>{label}</label>
                      <input type="text" value={d[key]} onChange={e => updateDraft(idx,key,e.target.value)}
                        placeholder={ph} style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>순공시간 (분)</label>
                    <input type="number" value={d.study_minutes} onChange={e => updateDraft(idx,'study_minutes',e.target.value)}
                      placeholder="90" min={0} style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={addDraft} style={{ padding:'10px 20px', border:'1.5px solid #4361ee', borderRadius:8, background:'#fff', color:'#4361ee', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          <i className="fas fa-plus"></i> 과목 추가
        </button>
        {drafts.length > 0 && (
          <button onClick={save} className="btn-primary">
            <i className="fas fa-save"></i> 저장
          </button>
        )}
      </div>
    </div>
  );
}

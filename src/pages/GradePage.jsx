import { useEffect, useRef, useState } from 'react';
import { getGrades, upsertGrade, deleteGrade } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';

const EXAM_TABS = [
  { id:'mid1',  label:'1학기 중간' },
  { id:'fin1',  label:'1학기 기말' },
  { id:'mid2',  label:'2학기 중간' },
  { id:'fin2',  label:'2학기 기말' },
  { id:'mock',  label:'모의고사' },
];
const SUBJECTS  = ['국어','수학','영어','한국사','과학','사회'];
const RANKS     = ['1등급','2등급','3등급','4등급','5등급','6등급','7등급','8등급','9등급'];

export default function GradePage() {
  const { students } = useStudentList();
  const [selectedId, setSelectedId] = useState(null);
  const [examType, setExamType]   = useState('mid1');
  const [rows, setRows]           = useState([]);
  const [saving, setSaving]       = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (students.length && selectedId === null) setSelectedId(students[0].id); // eslint-disable-line react-hooks/set-state-in-effect
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  // 학생/시험 탭을 빠르게 전환할 때 늦게 온 이전 응답이 최신 탭을 덮어쓰지 않도록 가드
  const loadReqRef = useRef(0);
  async function loadGrades() {
    const reqId = ++loadReqRef.current;
    try {
      const data = await getGrades(selectedId, examType);
      if (reqId !== loadReqRef.current) return;
      setRows(data.map(g => ({ ...g })));
    } catch { if (reqId === loadReqRef.current) showToast('성적 로드 실패', 'error'); }
  }

  useEffect(() => {
    if (selectedId) loadGrades(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedId, examType]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateRow(idx, key, val) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { _cid: Date.now() + Math.random(), student_id: selectedId, exam_type: examType, subject:'국어', raw_score:'', grade_rank:'1등급', memo:'' }]);
  }

  async function save() {
    if (saving) return;
    const payloads = rows.filter(r => r.subject).map(r => ({
      ...r, raw_score: r.raw_score !== '' ? parseInt(r.raw_score) : null,
    }));
    setSaving(true);
    try {
      await Promise.all(payloads.map(p => upsertGrade(p)));
      showToast('성적이 저장되었습니다.');
      loadGrades();
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function remove(id, idx) {
    if (!id) { setRows(prev => prev.filter((_, i) => i !== idx)); return; }
    if (!confirm('삭제하시겠습니까?')) return;
    try { await deleteGrade(id); showToast('삭제되었습니다.'); loadGrades(); }
    catch { showToast('삭제 실패', 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-chart-bar"></i> 성적 관리</h2>
      </div>

      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
          <StudentSelect students={students} value={selectedId} onChange={setSelectedId} />
        </div>

        {/* 시험 탭 */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {EXAM_TABS.map(t => (
            <button key={t.id} onClick={() => setExamType(t.id)}
              style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'1.5px solid ' + (examType===t.id ? '#4361ee' : '#e2e8f0'), background: examType===t.id ? '#4361ee' : '#fff', color: examType===t.id ? '#fff' : '#64748b' }}>
              {t.label}
            </button>
          ))}
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['과목','원점수','등급','비고',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id ?? row._cid ?? idx} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'8px 14px' }}>
                  <select value={row.subject} onChange={e => updateRow(idx,'subject',e.target.value)}
                    style={{ padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13 }}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding:'8px 14px' }}>
                  <input type="number" value={row.raw_score ?? ''} min={0} max={100}
                    onChange={e => updateRow(idx,'raw_score',e.target.value)}
                    style={{ width:70, padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13 }} />
                </td>
                <td style={{ padding:'8px 14px' }}>
                  <select value={row.grade_rank ?? '1등급'} onChange={e => updateRow(idx,'grade_rank',e.target.value)}
                    style={{ padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13 }}>
                    {RANKS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding:'8px 14px' }}>
                  <input type="text" value={row.memo ?? ''} onChange={e => updateRow(idx,'memo',e.target.value)}
                    placeholder="메모" style={{ width:120, padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13 }} />
                </td>
                <td style={{ padding:'8px 14px' }}>
                  <button onClick={() => remove(row.id, idx)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={addRow} style={{ padding:'8px 16px', border:'1.5px solid #4361ee', borderRadius:8, background:'#fff', color:'#4361ee', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            <i className="fas fa-plus"></i> 과목 추가
          </button>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <i className="fas fa-save"></i> {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

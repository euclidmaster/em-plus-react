import { useEffect, useRef, useState } from 'react';
import { getWeeklyPlans, upsertWeeklyPlan, deleteWeeklyPlan } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import { getMonday } from '../lib/dateUtil.js';

const SUBJECTS = ['국어','수학','영어','과학','사회','한국사'];
const COLORS   = ['blue','green','orange','purple','red'];
const MAT_TYPES = ['교재','프린트','인강'];

export default function WeeklyPlanPage() {
  const { students } = useStudentList();
  const [selectedId, setSelectedId] = useState(null);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [plans, setPlans]         = useState([]);
  const [saving, setSaving]       = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (students.length && selectedId === null) setSelectedId(students[0].id);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  // 학생/주차를 빠르게 바꿀 때 늦게 온 이전 응답이 최신 화면을 덮어쓰지 않도록 가드
  const loadReqRef = useRef(0);
  async function load() {
    const reqId = ++loadReqRef.current;
    try {
      const data = await getWeeklyPlans(selectedId, weekStart);
      if (reqId === loadReqRef.current) setPlans(data);
    }
    catch { if (reqId === loadReqRef.current) showToast('플랜 로드 실패', 'error'); }
  }

  useEffect(() => {
    if (selectedId) load();
  }, [selectedId, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function addPlan() {
    setPlans(prev => [...prev, { id:null, _cid: Date.now() + Math.random(), student_id: selectedId, week_start: weekStart, subject:'국어', main_material:'', sub_material:'', study_range:'', material_types:[] }]);
  }

  function updatePlan(idx, key, val) {
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  function toggleType(idx, type) {
    setPlans(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const types = p.material_types ?? [];
      return { ...p, material_types: types.includes(type) ? types.filter(t => t !== type) : [...types, type] };
    }));
  }

  async function removePlan(idx, id) {
    if (!id) { setPlans(prev => prev.filter((_,i) => i !== idx)); return; }
    if (!confirm('플랜을 삭제하시겠습니까?')) return;
    try { await deleteWeeklyPlan(id); showToast('삭제되었습니다.'); load(); }
    catch { showToast('삭제 실패', 'error'); }
  }

  async function save() {
    if (saving) return;
    const payloads = plans.filter(p => p.subject && selectedId).map(p => ({ ...p, week_label: weekStart }));
    setSaving(true);
    try {
      await Promise.all(payloads.map(p => upsertWeeklyPlan(p)));
      showToast('주간 플랜이 저장되었습니다.');
      load();
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-calendar-week"></i> 주간 학습 플랜</h2>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
        <StudentSelect students={students} value={selectedId} onChange={setSelectedId} />
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>주차</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(getMonday(e.target.value))}
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13 }} />
      </div>

      <div className="plan-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
        {plans.map((plan, idx) => (
          <div key={plan.id ?? plan._cid ?? idx} className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ background: colorMap[COLORS[idx%COLORS.length]], padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <select value={plan.subject} onChange={e => updatePlan(idx,'subject',e.target.value)}
                style={{ background:'transparent', border:'none', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                {SUBJECTS.map(s => <option key={s} style={{ color:'#1e293b' }}>{s}</option>)}
              </select>
              <button onClick={() => removePlan(idx, plan.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding:16, display:'grid', gap:10 }}>
              {[
                { label:'교재',   key:'main_material', ph:'교재명' },
                { label:'부교재', key:'sub_material',  ph:'부교재명' },
                { label:'범위',   key:'study_range',   ph:'페이지 or 단원' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:3 }}>{label}</label>
                  <input type="text" value={plan[key] ?? ''} onChange={e => updatePlan(idx, key, e.target.value)}
                    placeholder={ph} style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:4 }}>유형</label>
                <div style={{ display:'flex', gap:8 }}>
                  {MAT_TYPES.map(type => (
                    <label key={type} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
                      <input type="checkbox" checked={(plan.material_types ?? []).includes(type)}
                        onChange={() => toggleType(idx, type)} />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 추가 카드 */}
        <div onClick={addPlan} style={{ border:'2px dashed #e2e8f0', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', minHeight:200, cursor:'pointer', color:'#94a3b8', flexDirection:'column', gap:8 }}>
          <i className="fas fa-plus" style={{ fontSize:24 }}></i>
          <span style={{ fontSize:14 }}>과목 추가</span>
        </div>
      </div>

      {plans.length > 0 && (
        <div style={{ marginTop:20 }}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <i className="fas fa-save"></i> {saving ? '저장 중...' : '전체 저장'}
          </button>
        </div>
      )}
    </div>
  );
}

const colorMap = { blue:'#4361ee', green:'#2dc653', orange:'#f4a261', purple:'#7209b7', red:'#e63946' };

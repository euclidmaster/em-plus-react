import { useState } from 'react';
import { UNIVERSITIES, SCHOOL_CURRICULUM, getMatchInfo } from '../data/subjectGuideData.js';

const SCHOOLS = [
  { value:'대평고',    label:'대평고등학교' },
  { value:'동원동우고', label:'동원동우고등학교' },
  { value:'수성고',    label:'수성고등학교' },
  { value:'수일고',    label:'수일고등학교' },
  { value:'숙지고',    label:'숙지고등학교' },
  { value:'영생고',    label:'영생고등학교' },
  { value:'영복여고',  label:'영복여자고등학교' },
  { value:'장안고',    label:'장안고등학교' },
  { value:'조원고',    label:'조원고등학교' },
  { value:'천천고',    label:'천천고등학교' },
];

const AREA_LABELS = { 수학:'📐 수학', 영어:'📖 영어', 국어:'📚 국어', 사회:'🌍 사회(탐구)', 과학:'🔬 과학(탐구)', 정보:'💻 정보', 기타:'📋 기타' };
const TYPE_LABELS = { common:'공통', elective:'일반선택', career:'진로선택', fusion:'융합선택' };

/* ── 공통 스타일 ── */
const sel = {
  padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8,
  fontSize:14, background:'#fff', color:'#1e293b', outline:'none', width:'100%',
};
const inp = { ...sel };
const btnPrimary = {
  padding:'10px 22px', background:'#4361ee', color:'#fff', border:'none',
  borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
};
const btnSecondary = {
  padding:'10px 22px', background:'#f8fafc', color:'#64748b', border:'1.5px solid #e2e8f0',
  borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
};

export default function SubjectGuidePage() {
  const [step, setStep] = useState(1);
  const [school, setSchool]   = useState('');
  const [grade, setGrade]     = useState('');
  const [name, setName]       = useState('');
  const [univ, setUniv]       = useState('');
  const [dept, setDept]       = useState('');

  function goStep2() {
    if (!school || !grade) { alert('학교와 학년을 선택해 주세요.'); return; }
    setStep(2);
  }
  function goStep3() {
    if (!univ || !dept) { alert('대학과 모집단위(학과)를 선택해 주세요.'); return; }
    setStep(3);
  }
  function reset() { setStep(1); setSchool(''); setGrade(''); setName(''); setUniv(''); setDept(''); }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-graduation-cap"></i> 2026학년도 교과선택 가이드</h2>
      </div>

      {/* 단계 표시 */}
      <StepIndicator step={step} />

      {/* STEP 1 */}
      {step === 1 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            <i className="fas fa-user-graduate" style={{ color:'#4361ee' }}></i> 학생 정보 입력
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 }}>
                <span style={{ color:'#ef4444' }}>*</span> 학교 선택
              </label>
              <select style={sel} value={school} onChange={e=>setSchool(e.target.value)}>
                <option value="">-- 학교를 선택하세요 --</option>
                {SCHOOLS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 }}>
                <span style={{ color:'#ef4444' }}>*</span> 학년
              </label>
              <select style={sel} value={grade} onChange={e=>setGrade(e.target.value)}>
                <option value="">-- 학년을 선택하세요 --</option>
                <option value="고1">고1 (2026학년도 입학 · 2022 개정)</option>
                <option value="고2">고2 (2025학년도 입학 · 2022 개정)</option>
                <option value="고3">고3 (2024학년도 입학 · 2015 개정)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 }}>이름 (선택)</label>
              <input style={inp} type="text" placeholder="이름을 입력하세요" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button style={btnPrimary} onClick={goStep2}>
              다음 단계 <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
            <i className="fas fa-university" style={{ color:'#4361ee' }}></i> 희망 대학 · 학과 선택
          </div>
          <p style={{ color:'#94a3b8', fontSize:13, marginBottom:16 }}>
            희망하는 대학을 먼저 선택한 후, 모집단위(학과)를 선택해 주세요.
          </p>

          {/* 대학 그리드 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:16 }}>
            {Object.entries(UNIVERSITIES).map(([name, data]) => (
              <div key={name}
                onClick={() => { setUniv(name); setDept(''); }}
                style={{
                  padding:'12px 8px', textAlign:'center', borderRadius:10, cursor:'pointer',
                  border: univ===name ? '2px solid #4361ee' : '1.5px solid #e2e8f0',
                  background: univ===name ? '#eef2ff' : '#f8fafc',
                  transition:'all 0.15s',
                }}>
                <div style={{ fontSize:14, fontWeight:700, color: univ===name ? '#4361ee' : data.color }}>{data.short}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{Object.keys(data.departments).length}개 모집단위</div>
              </div>
            ))}
          </div>

          {/* 모집단위 선택 */}
          {univ && (
            <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#f59e0b', marginBottom:10 }}>
                {UNIVERSITIES[univ].short} 모집단위 선택
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:6 }}>
                {Object.entries(UNIVERSITIES[univ].departments).map(([deptName, data]) => (
                  <div key={deptName}
                    onClick={() => setDept(deptName)}
                    style={{
                      padding:'8px 12px', borderRadius:7, cursor:'pointer', fontSize:13,
                      border: dept===deptName ? '1.5px solid #4361ee' : '1px solid #e2e8f0',
                      background: dept===deptName ? '#eef2ff' : '#fff',
                      color: dept===deptName ? '#4361ee' : '#374151',
                      fontWeight: dept===deptName ? 600 : 400,
                      transition:'all 0.15s',
                    }}>
                    {deptName}
                    {data.core.length>0 && <span style={{ color:'#2980B9', fontSize:11, marginLeft:4 }}>📘{data.core.length}</span>}
                    {data.recommended.length>0 && <span style={{ color:'#27AE60', fontSize:11, marginLeft:2 }}>📗{data.recommended.length}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button style={btnSecondary} onClick={() => setStep(1)}>
              <i className="fas fa-arrow-left"></i> 이전
            </button>
            <button style={btnPrimary} onClick={goStep3}>
              결과 확인 <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <ResultView
          school={school} grade={grade} name={name}
          univ={univ} dept={dept}
          onBack={() => setStep(2)}
          onReset={reset}
        />
      )}

      {/* 안내 문구 */}
      <div style={{ marginTop:16, padding:'12px 16px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>
        <i className="fas fa-exclamation-triangle" style={{ marginRight:6 }}></i>
        본 프로그램의 교과편제 정보는 참고용이며, 실제 개설 과목은 학교별로 매년 변경될 수 있습니다. 반드시 소속 학교의 교육과정 편제표 원본을 확인하세요.
        대학별 권장과목은 2026학년도 입시 기준입니다.
      </div>
    </div>
  );
}

/* ── 단계 표시기 ── */
function StepIndicator({ step }) {
  const steps = [{ label:'학생 정보' }, { label:'대학·학과 선택' }, { label:'결과 확인' }];
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, gap:0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const isDone = n < step, isActive = n === step;
        return (
          <div key={n} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:14,
                background: isDone ? '#22c55e' : isActive ? '#4361ee' : '#f1f5f9',
                color: isDone||isActive ? '#fff' : '#94a3b8',
                border: isActive ? '2px solid #4361ee' : isDone ? '2px solid #22c55e' : '2px solid #e2e8f0',
              }}>
                {isDone ? <i className="fas fa-check" style={{ fontSize:13 }}></i> : n}
              </div>
              <span style={{ fontSize:13, fontWeight: isActive ? 700 : 500, color: isActive ? '#1e293b' : '#94a3b8', whiteSpace:'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width:40, height:2, background: n < step ? '#22c55e' : '#e2e8f0', margin:'0 8px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 결과 뷰 ── */
function ResultView({ school, grade, name, univ, dept, onBack, onReset }) {
  const univData = UNIVERSITIES[univ];
  const deptData = univData.departments[dept];
  const gradeData = SCHOOL_CURRICULUM[school][grade];
  const matchInfo = getMatchInfo(gradeData, deptData.core, deptData.recommended);
  const displayName = name || '학생';

  const coreMatchNames = new Set(matchInfo.coreMatches.map(m => m.school));
  const recMatchNames  = new Set(matchInfo.recMatches.map(m => m.school));

  return (
    <div>
      {/* 결과 헤더 */}
      <div style={{ background:'linear-gradient(135deg,#3a0ca3,#4361ee)', borderRadius:12, padding:'20px 24px', marginBottom:20, color:'#fff' }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>
          📋 {displayName} 님의 교과선택 가이드
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, fontSize:13 }}>
          {[`🏫 ${school}등학교`, `📚 ${grade} (${grade==='고3'?'2015 개정':'2022 개정'})`, `🎓 ${univData.short} ${dept}`].map((t,i) => (
            <span key={i} style={{ background:'rgba(255,255,255,0.18)', borderRadius:20, padding:'4px 12px' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* 권장과목 박스 */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <i className="fas fa-bullseye" style={{ color:'#4361ee' }}></i>
          {univData.short} {dept} 전공 연계 교과이수 권장과목
        </div>
        {deptData.note && (
          <p style={{ color:'#f59e0b', fontSize:13, marginBottom:10 }}>
            <i className="fas fa-info-circle"></i> {deptData.note}
          </p>
        )}
        {deptData.core.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#2980B9', fontWeight:600, marginBottom:6 }}>📘 핵심 권장과목 (필수 이수 권장)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {deptData.core.map(s => (
                <span key={s} style={{ padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:600, background:'#e8f0fe', border:'1px solid #93c5fd', color:'#1d4ed8', display:'inline-flex', alignItems:'center', gap:4 }}>
                  <i className="fas fa-star" style={{ fontSize:11 }}></i> {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {deptData.recommended.length > 0 && (
          <div>
            <div style={{ fontSize:12, color:'#16a34a', fontWeight:600, marginBottom:6 }}>📗 권장과목 (이수 적극 권고)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {deptData.recommended.map(s => (
                <span key={s} style={{ padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:600, background:'#dcfce7', border:'1px solid #86efac', color:'#15803d', display:'inline-flex', alignItems:'center', gap:4 }}>
                  <i className="fas fa-check-circle" style={{ fontSize:11 }}></i> {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {deptData.core.length===0 && deptData.recommended.length===0 && (
          <p style={{ color:'#94a3b8', fontSize:14 }}>별도 지정된 필수/권장 과목이 없습니다. 학생의 진로·적성에 따른 적극적인 선택과목 이수를 권장합니다.</p>
        )}
      </div>

      {/* 편제표 매칭 */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          <i className="fas fa-school" style={{ color:'#4361ee' }}></i>
          {school}등학교 {grade} 교과 편제표 (매칭 결과)
        </div>
        {/* 범례 */}
        <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { dot:{ background:'#e8f0fe', border:'1px solid #93c5fd' }, label:'📘 핵심 권장과목' },
            { dot:{ background:'#dcfce7', border:'1px solid #86efac' }, label:'📗 권장과목' },
            { dot:{ background:'#f1f5f9', border:'1px solid #e2e8f0' }, label:'일반 과목' },
          ].map((l,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b' }}>
              <div style={{ width:14, height:14, borderRadius:3, ...l.dot }}></div>
              {l.label}
            </div>
          ))}
        </div>

        {Object.entries(gradeData).map(([area, subjects]) => (
          <div key={area} style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#64748b', borderBottom:'1px solid #f1f5f9', paddingBottom:4, marginBottom:8 }}>
              {AREA_LABELS[area] || area}
            </div>
            {Object.entries(subjects).map(([type, list]) => {
              if (!Array.isArray(list) || list.length === 0) return null;
              return (
                <div key={type} style={{ marginBottom:6 }}>
                  <span style={{ fontSize:11, color:'#94a3b8', marginBottom:4, display:'inline-block' }}>[{TYPE_LABELS[type]||type}]</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {list.map(s => {
                      const isCore = coreMatchNames.has(s);
                      const isRec  = recMatchNames.has(s);
                      return (
                        <span key={s} style={{
                          padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight: isCore||isRec ? 700 : 400,
                          background: isCore ? '#e8f0fe' : isRec ? '#dcfce7' : '#f8fafc',
                          border: isCore ? '1px solid #93c5fd' : isRec ? '1px solid #86efac' : '1px solid #e2e8f0',
                          color: isCore ? '#1d4ed8' : isRec ? '#15803d' : '#64748b',
                        }}>
                          {isCore ? '📘 ' : isRec ? '📗 ' : ''}{s}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 핵심 요약 */}
      <div className="card" style={{ padding:20, marginBottom:16, background:'#f0f7ff', borderColor:'#bfdbfe' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
          <i className="fas fa-clipboard-check" style={{ color:'#4361ee' }}></i> 교과 선택 핵심 요약
        </div>
        <ul style={{ listStyle:'none', padding:0 }}>
          {matchInfo.coreMatches.map((m,i) => (
            <li key={i} style={{ padding:'7px 0', borderBottom:'1px solid #dbeafe', fontSize:13, display:'flex', alignItems:'flex-start', gap:8 }}>
              <i className="fas fa-star" style={{ color:'#2980B9', marginTop:2 }}></i>
              <span><strong>📘 핵심:</strong> <strong>{m.school}</strong> 반드시 선택하세요 (→ {m.university} 이수 필수)</span>
            </li>
          ))}
          {matchInfo.recMatches.map((m,i) => (
            <li key={i} style={{ padding:'7px 0', borderBottom:'1px solid #dbeafe', fontSize:13, display:'flex', alignItems:'flex-start', gap:8 }}>
              <i className="fas fa-check-circle" style={{ color:'#16a34a', marginTop:2 }}></i>
              <span><strong>📗 권장:</strong> <strong>{m.school}</strong> 선택을 적극 권고합니다 (→ {m.university})</span>
            </li>
          ))}
          {matchInfo.coreNotFound.map((c,i) => (
            <li key={i} style={{ padding:'7px 0', borderBottom:'1px solid #dbeafe', fontSize:13, display:'flex', alignItems:'flex-start', gap:8 }}>
              <i className={grade==='고1' ? 'fas fa-calendar-check' : 'fas fa-exclamation-triangle'} style={{ color: grade==='고1' ? '#4361ee' : '#f59e0b', marginTop:2 }}></i>
              {grade==='고1'
                ? <span><strong>📘 핵심:</strong> <strong>{c}</strong>은(는) 고2·고3 때 반드시 선택하세요. (대학 이수 필수)</span>
                : <span><strong>⚠️ 주의:</strong> <strong>{c}</strong>은(는) {school}등학교 편제표에서 확인되지 않습니다. 공동교육과정 등 대안을 찾아보세요.</span>
              }
            </li>
          ))}
          {matchInfo.recNotFound.map((r,i) => (
            <li key={i} style={{ padding:'7px 0', borderBottom:'1px solid #dbeafe', fontSize:13, display:'flex', alignItems:'flex-start', gap:8, color:'#94a3b8' }}>
              <i className="fas fa-info-circle" style={{ marginTop:2 }}></i>
              {grade==='고1'
                ? <span><strong>{r}</strong>은(는) 고2·고3 때 선택을 적극 권고합니다.</span>
                : <span><strong>{r}</strong>은(는) 편제표에서 확인되지 않습니다. (권장사항)</span>
              }
            </li>
          ))}
          {deptData.core.length===0 && deptData.recommended.length===0 && (
            <li style={{ padding:'7px 0', fontSize:13, display:'flex', alignItems:'flex-start', gap:8 }}>
              <i className="fas fa-info-circle" style={{ color:'#4361ee', marginTop:2 }}></i>
              <span>별도 지정 권장과목 없음 — 진로·적성에 맞는 과목을 자유롭게 선택하세요.</span>
            </li>
          )}
        </ul>
      </div>

      {/* 학교 홈페이지 링크 */}
      <div className="card" style={{ padding:'14px 20px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, borderColor:'#fde68a', background:'#fffbeb' }}>
        <span style={{ fontSize:13, color:'#92400e' }}>
          <i className="fas fa-link" style={{ color:'#f59e0b', marginRight:6 }}></i>
          <strong>{school}등학교</strong> 교육과정 편제표 원본을 직접 확인하세요.
        </span>
        <a href={SCHOOL_CURRICULUM[school].link} target="_blank" rel="noopener noreferrer"
          style={{ color:'#d97706', textDecoration:'none', fontWeight:600, fontSize:13 }}>
          학교 홈페이지 바로가기 <i className="fas fa-external-link-alt"></i>
        </a>
      </div>

      {/* 버튼 */}
      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <button style={btnSecondary} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> 다시 선택
        </button>
        <div style={{ display:'flex', gap:10 }}>
          <button style={{ ...btnSecondary, background:'#1e293b', color:'#fff', borderColor:'#1e293b' }} onClick={() => window.print()}>
            <i className="fas fa-print"></i> 인쇄
          </button>
          <button style={btnPrimary} onClick={onReset}>
            <i className="fas fa-redo"></i> 처음부터
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import {
  getHomeworks, getDailyRecords,
  getWeeklyPlans, getPerformances, getGradeStats, getStudentTeachers,
} from '../../lib/api.js';

const colorMap = { blue:'#4361ee', green:'#2dc653', orange:'#f4a261', purple:'#7209b7', red:'#e63946' };
const COLORS   = ['blue','green','orange','purple','red'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

export default function StudentHomePage() {
  const { student, loading } = useStudentSelf();
  const [homeworks,        setHomeworks]        = useState([]);
  const [recentRecords,    setRecentRecords]    = useState([]);
  const [weeklyPlans,      setWeeklyPlans]      = useState([]);
  const [performances,     setPerformances]     = useState([]);
  const [gradeData,        setGradeData]        = useState([]);
  const [myTeachers,       setMyTeachers]       = useState([]);

  useEffect(() => {
    if (!student) return;
    const weekStart = getMonday(new Date());
    Promise.all([
      getHomeworks(student.id),
      getDailyRecords(student.id, null),
      getWeeklyPlans(student.id, weekStart),
      getPerformances(student.id),
      getGradeStats(student.id),
      getStudentTeachers(student.id),
    ]).then(([hws, records, plans, perfs, grades, tchers]) => {
      setHomeworks(hws);
      setRecentRecords(records.slice(0, 5));
      setWeeklyPlans(plans);
      setPerformances(perfs.slice(0, 3));
      setGradeData(grades);
      setMyTeachers(tchers);
    }).catch(console.error);
  }, [student]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize:32, color:'#f59e0b', marginBottom:12, display:'block' }}></i>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );

  const today    = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  const todayStr = new Date().toISOString().slice(0, 10);

  const pendingHw = homeworks.filter(h => !h.is_done);
  const hwDone    = homeworks.filter(h => h.is_done).length;
  const hwTotal   = homeworks.length;
  const hwRate    = hwTotal ? Math.round(hwDone / hwTotal * 100) : 0;

  const weekStart = getMonday(new Date());
  const weekEnd   = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart} ~ ${weekEnd.toISOString().slice(0, 10)}`;

  const subjects  = [...new Set(gradeData.map(g => g.subject))];

  return (
    <div style={{ display:'grid', gap:24 }}>

      {/* ── 환영 배너 ── */}
      <div style={{ background:'linear-gradient(135deg, #4361ee, #7209b7)', borderRadius:16, padding:'28px 32px', color:'#fff' }}>
        <div style={{ fontSize:13, opacity:0.8, marginBottom:8 }}>{today}</div>
        <h3 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>
          안녕하세요, <span style={{ color:'#a5b4fc' }}>{student.name}</span> 학생! 👋
        </h3>
        <p style={{ fontSize:14, opacity:0.85 }}>
          {student.grade} · {student.class_name ?? '반 미배정'} ·{' '}
          {myTeachers.length > 0
            ? myTeachers.map(t => t.teachers?.name).filter(Boolean).join(', ') + ' 선생님 담당'
            : '담당 선생님 미배정'}
        </p>
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          <Badge icon="fa-tasks"           label={`미완료 숙제 ${pendingHw.length}개`}   color={pendingHw.length > 0 ? '#fca5a5' : '#86efac'} />
          <Badge icon="fa-calendar-week"   label={`이번 주 플랜 ${weeklyPlans.length}과목`} color="#93c5fd" />
          <Badge icon="fa-clipboard-check" label={`수행 기록 ${performances.length}건`}  color="#c4b5fd" />
        </div>
      </div>

      {/* ── 행 1: 주간학습플랜 + 숙제관리 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>

        {/* 주간 학습 플랜 */}
        <Section title="주간 학습 플랜" icon="fa-calendar-week" linkTo="/my/weekly-plan" color="#4361ee" subtitle={weekLabel}>
          {weeklyPlans.length === 0
            ? <Empty text="이번 주 플랜이 없습니다." />
            : <div style={{ display:'grid', gap:6 }}>
                {weeklyPlans.map((p, i) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:colorMap[COLORS[i % COLORS.length]], flexShrink:0 }} />
                    <span style={{ fontWeight:700, color:'#1e293b', fontSize:13, minWidth:40 }}>{p.subject}</span>
                    <span style={{ fontSize:12, color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.main_material || '-'}{p.study_range ? ` · ${p.study_range}` : ''}
                    </span>
                  </div>
                ))}
              </div>
          }
        </Section>

        {/* 숙제 관리 */}
        <Section title="숙제 관리" icon="fa-tasks" linkTo="/my/homework" color="#ef4444"
          subtitle={`완료율 ${hwRate}% · 미완료 ${pendingHw.length}개`}>
          <div style={{ height:6, borderRadius:3, background:'#f1f5f9', overflow:'hidden', marginBottom:14 }}>
            <div style={{ height:'100%', width:`${hwRate}%`, background:hwRate===100?'#22c55e':'#4361ee', borderRadius:3, transition:'width 0.4s' }} />
          </div>
          {pendingHw.length === 0
            ? <div style={{ textAlign:'center', padding:'12px 0', color:'#22c55e', fontWeight:600, fontSize:14 }}>
                <i className="fas fa-check-circle" style={{ marginRight:6 }}></i>모든 숙제 완료!
              </div>
            : <div style={{ display:'grid', gap:4 }}>
                {pendingHw.slice(0, 5).map(hw => {
                  const overdue = hw.due_date < todayStr;
                  return (
                    <div key={hw.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                      <i className="fas fa-circle" style={{ fontSize:5, color:overdue?'#ef4444':'#cbd5e1' }}></i>
                      <span style={{ fontWeight:700, fontSize:13, color:'#1e293b', minWidth:36 }}>{hw.subject}</span>
                      <span style={{ fontSize:12, color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {hw.material || '-'}
                      </span>
                      <span style={{ fontSize:11, color:overdue?'#ef4444':'#94a3b8', whiteSpace:'nowrap', fontWeight:overdue?700:400 }}>
                        {overdue ? '기한초과' : hw.due_date}
                      </span>
                    </div>
                  );
                })}
                {pendingHw.length > 5 && (
                  <div style={{ fontSize:12, color:'#94a3b8', textAlign:'center', paddingTop:6 }}>
                    + {pendingHw.length - 5}개 더
                  </div>
                )}
              </div>
          }
        </Section>
      </div>

      {/* ── 행 2: 일일 학습 기록 ── */}
      <Section title="일일 학습 기록" icon="fa-book-open" linkTo="/my/daily-record" color="#7209b7">
        {recentRecords.length === 0
          ? <Empty text="학습 기록이 없습니다." />
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                    {['날짜','과목','교재','범위','학습(분)'].map(h => (
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:12, color:'#64748b', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map(r => (
                    <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'9px 14px', fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{r.record_date}</td>
                      <td style={{ padding:'9px 14px', fontWeight:700, color:'#4361ee', fontSize:13 }}>{r.subject}</td>
                      <td style={{ padding:'9px 14px', fontSize:13, color:'#475569' }}>{r.material || '-'}</td>
                      <td style={{ padding:'9px 14px', fontSize:13, color:'#475569' }}>{r.study_range || '-'}</td>
                      <td style={{ padding:'9px 14px', fontSize:13, color:'#1e293b', fontWeight:600 }}>{r.study_minutes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Section>

      {/* ── 행 3: 수행관리 + 학습리포트 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>

        {/* 수행 관리 */}
        <Section title="수행 관리" icon="fa-clipboard-check" linkTo="/my/performance" color="#f59e0b">
          {performances.length === 0
            ? <Empty text="수행 기록이 없습니다." />
            : <div style={{ display:'grid', gap:8 }}>
                {performances.map(p => (
                  <div key={p.id} style={{ padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:p.content ? 4 : 0 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontWeight:700, color:'#4361ee', fontSize:13 }}>{p.subject}</span>
                        {p.eval_format && <span style={{ fontSize:12, color:'#64748b' }}>{p.eval_format}</span>}
                        {p.session_no  && <span style={{ fontSize:11, color:'#94a3b8' }}>#{p.session_no}회차</span>}
                      </div>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{p.eval_date}</span>
                    </div>
                    {p.content && <p style={{ fontSize:12, color:'#475569', lineHeight:1.5, margin:0 }}>{p.content}</p>}
                  </div>
                ))}
              </div>
          }
        </Section>

        {/* 학습 리포트 */}
        <Section title="학습 리포트" icon="fa-chart-line" linkTo="/my/report" color="#2dc653">
          <div style={{ display:'grid', gap:14 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:44, fontWeight:800, color:'#4361ee', lineHeight:1 }}>{hwRate}%</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>전체 숙제 완료율</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { label:'전체', value:hwTotal,          color:'#1e293b' },
                { label:'완료', value:hwDone,            color:'#22c55e' },
                { label:'미완료', value:hwTotal - hwDone, color:'#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign:'center', padding:'8px 4px', background:'#f8fafc', borderRadius:8, border:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:20, fontWeight:800, color }}>{value}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            {gradeData.length > 0 && (
              <div style={{ padding:'12px 14px', background:'#f8fafc', borderRadius:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#64748b', marginBottom:8 }}>최근 성적</div>
                <div style={{ display:'grid', gap:5 }}>
                  {subjects.slice(0, 4).map(sub => {
                    const latest = gradeData.filter(g => g.subject === sub).at(-1);
                    return latest ? (
                      <div key={sub} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={{ color:'#475569' }}>{sub}</span>
                        <span style={{ fontWeight:700, color:'#4361ee' }}>{latest.raw_score ?? '-'}점</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ── 공통 컴포넌트 ── */

function Section({ title, icon, linkTo, color, subtitle, children }) {
  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:color + '1a', color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
            <i className={`fas ${icon}`}></i>
          </div>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#1e293b', lineHeight:1.2 }}>{title}</h3>
            {subtitle && <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{subtitle}</div>}
          </div>
        </div>
        <Link to={linkTo} style={{ fontSize:12, color, textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
          더 보기 <i className="fas fa-arrow-right" style={{ fontSize:10 }}></i>
        </Link>
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:13 }}>{text}</div>;
}

function Badge({ icon, label, color }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'5px 12px', display:'flex', alignItems:'center', gap:6, fontSize:12, color }}>
      <i className={`fas ${icon}`}></i> {label}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStudentSelf } from '../../hooks/useStudentSelf.js';
import { getGradeStats, getHomeworks } from '../../lib/api.js';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  LineElement, PointElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

const CHART_COLORS = ['#4361ee','#2dc653','#f4a261','#7209b7','#e63946','#4cc9f0'];
const examTypes    = ['mid1','fin1','mid2','fin2','mock'];
const examLabels   = { mid1:'중간1', fin1:'기말1', mid2:'중간2', fin2:'기말2', mock:'모의' };

export default function StudentReportPage() {
  const { student, loading } = useStudentSelf();
  const [gradeData, setGradeData] = useState([]);
  const [hwData,    setHwData]    = useState([]);

  useEffect(() => {
    if (!student) return;
    Promise.all([getGradeStats(student.id), getHomeworks(student.id)])
      .then(([g, h]) => { setGradeData(g); setHwData(h); })
      .catch(console.error);
  }, [student]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>로딩 중...</div>;
  if (!student) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ color:'#64748b' }}>연결된 학생 계정이 없습니다. 원장 선생님께 문의하세요.</p>
    </div>
  );

  const subjects = [...new Set(gradeData.map(g => g.subject))];

  const gradeChartData = {
    labels: examTypes.map(e => examLabels[e]),
    datasets: subjects.map((sub, i) => ({
      label: sub,
      data: examTypes.map(et => {
        const g = gradeData.find(d => d.subject === sub && d.exam_type === et);
        return g?.raw_score ?? null;
      }),
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '33',
      tension: 0.3,
      spanGaps: true,
    })),
  };

  const done   = hwData.filter(h => h.is_done).length;
  const total  = hwData.length;
  const hwRate = total ? Math.round(done / total * 100) : 0;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-chart-line"></i> 학습 리포트</h2>
      </div>

      {/* 상단 요약 카드 2열 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20, marginBottom:20 }}>

        {/* 숙제 완료율 */}
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-tasks"></i> 숙제 현황</h4>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:52, fontWeight:800, color:'#4361ee', lineHeight:1 }}>{hwRate}%</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:6 }}>전체 완료율</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
            {[
              { label:'전체',   value:total,       color:'#1e293b' },
              { label:'완료',   value:done,         color:'#22c55e' },
              { label:'미완료', value:total - done, color:'#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign:'center', padding:10, background:'#f8fafc', borderRadius:8 }}>
                <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div style={{ height:10, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${hwRate}%`, background:hwRate===100?'#22c55e':'#4361ee', borderRadius:5, transition:'width 0.4s' }} />
            </div>
          )}
        </div>

        {/* 최근 성적 요약 */}
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-chart-bar"></i> 최근 성적 요약</h4>
          {gradeData.length === 0
            ? <p style={{ textAlign:'center', color:'#94a3b8', padding:'20px 0' }}>성적 데이터가 없습니다.</p>
            : <div style={{ display:'grid', gap:8 }}>
                {subjects.map(sub => {
                  const latest = gradeData.filter(g => g.subject === sub).at(-1);
                  return latest ? (
                    <div key={sub} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #f1f5f9' }}>
                      <span style={{ fontSize:14, color:'#475569', fontWeight:600 }}>{sub}</span>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        {latest.grade_rank && (
                          <span style={{ fontSize:12, color:'#94a3b8', background:'#f1f5f9', padding:'2px 8px', borderRadius:10 }}>
                            {latest.grade_rank}등급
                          </span>
                        )}
                        <span style={{ fontWeight:700, color:'#4361ee', fontSize:16 }}>
                          {latest.raw_score ?? '-'}점
                        </span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
          }
        </div>
      </div>

      {/* 성적 추이 차트 */}
      {gradeData.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-chart-line"></i> 성적 추이 (원점수)</h4>
          <Line
            data={gradeChartData}
            options={{
              responsive: true,
              plugins: { legend: { position:'bottom' } },
              scales: { y: { min:0, max:100 } },
            }}
          />
        </div>
      )}

      {/* 성적 상세표 */}
      {gradeData.length > 0 && (
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-table"></i> 성적 상세</h4>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  {['과목','시험 유형','원점수','등급','비고'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeData.map(g => (
                  <tr key={g.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontSize:14, fontWeight:600 }}>{g.subject}</td>
                    <td style={{ padding:'10px 14px', fontSize:14 }}>{examLabels[g.exam_type] ?? g.exam_type}</td>
                    <td style={{ padding:'10px 14px', fontSize:14, fontWeight:700, color:'#4361ee' }}>{g.raw_score ?? '-'}</td>
                    <td style={{ padding:'10px 14px', fontSize:14 }}>{g.grade_rank ?? '-'}</td>
                    <td style={{ padding:'10px 14px', fontSize:14, color:'#64748b' }}>{g.memo ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

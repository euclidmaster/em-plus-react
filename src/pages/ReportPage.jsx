import { useEffect, useState } from 'react';
import { getGradeStats, getHomeworks } from '../lib/api.js';
import StudentSelect from '../components/common/StudentSelect.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function ReportPage() {
  const { students } = useStudentList();
  const [selectedId, setSelectedId] = useState(null);
  const [gradeData, setGradeData]   = useState([]);
  const [hwData, setHwData]         = useState([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (students.length && selectedId === null) setSelectedId(students[0].id);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([getGradeStats(selectedId), getHomeworks(selectedId)])
      .then(([g, h]) => { setGradeData(g); setHwData(h); })
      .catch(console.error);
  }, [selectedId]);

  // 과목별 최근 성적
  const subjects = [...new Set(gradeData.map(g => g.subject))];
  const examTypes = ['mid1','fin1','mid2','fin2','mock'];
  const examLabels = { mid1:'중간1', fin1:'기말1', mid2:'중간2', fin2:'기말2', mock:'모의' };

  const gradeChartData = {
    labels: examTypes.map(e => examLabels[e]),
    datasets: subjects.map((sub, i) => ({
      label: sub,
      data: examTypes.map(et => {
        const g = gradeData.find(d => d.subject === sub && d.exam_type === et);
        return g?.raw_score ?? null;
      }),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '33',
      tension: 0.3,
    })),
  };

  // 숙제 완료율
  const done    = hwData.filter(h => h.is_done).length;
  const total   = hwData.length;
  const hwRate  = total ? Math.round(done / total * 100) : 0;

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-chart-line"></i> 학습 리포트</h2>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#64748b' }}>학생</label>
        <StudentSelect students={students} value={selectedId} onChange={setSelectedId} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-chart-bar"></i> 성적 추이 (원점수)</h4>
          {gradeData.length > 0
            ? <Line data={gradeChartData} options={{ responsive:true, plugins:{ legend:{ position:'bottom' } }, scales:{ y:{ min:0, max:100 } } }} />
            : <p style={{ textAlign:'center', color:'#94a3b8', padding:30 }}>성적 데이터가 없습니다.</p>
          }
        </div>
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-tasks"></i> 숙제 현황</h4>
          <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center', padding:20 }}>
            <div style={{ fontSize:48, fontWeight:800, color:'#4361ee' }}>{hwRate}%</div>
            <div style={{ fontSize:14, color:'#64748b' }}>전체 완료율</div>
            <div style={{ display:'flex', gap:20, marginTop:8, fontSize:14 }}>
              <span><strong style={{ color:'#2dc653' }}>{done}</strong> 완료</span>
              <span><strong style={{ color:'#e63946' }}>{total - done}</strong> 미완료</span>
              <span><strong>{total}</strong> 전체</span>
            </div>
            {total > 0 && (
              <div style={{ width:'100%', height:12, background:'#f1f5f9', borderRadius:6, overflow:'hidden', marginTop:8 }}>
                <div style={{ width:`${hwRate}%`, height:'100%', background:'#4361ee', borderRadius:6, transition:'width 0.3s' }}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 과목별 성적표 */}
      {gradeData.length > 0 && (
        <div className="card">
          <h4 style={{ marginBottom:16, fontWeight:700 }}><i className="fas fa-table"></i> 성적 상세</h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                <th style={th}>과목</th>
                <th style={th}>시험 유형</th>
                <th style={th}>원점수</th>
                <th style={th}>등급</th>
                <th style={th}>비고</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.map(g => (
                <tr key={g.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={td}>{g.subject}</td>
                  <td style={td}>{examLabels[g.exam_type] ?? g.exam_type}</td>
                  <td style={td}>{g.raw_score ?? '-'}</td>
                  <td style={td}>{g.grade_rank ?? '-'}</td>
                  <td style={td}>{g.memo ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const COLORS = ['#4361ee','#2dc653','#f4a261','#7209b7','#e63946','#4cc9f0'];
const th = { padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 };
const td = { padding:'10px 14px', fontSize:14 };

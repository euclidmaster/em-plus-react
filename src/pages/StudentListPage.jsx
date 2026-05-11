import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStudent, getTeachers, addStudentTeacher } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import { useDebounce } from '../hooks/useDebounce.js';

const GRADE_OPTIONS = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const GRADE_FILTERS = ['전체', ...GRADE_OPTIONS];
const STATUS_FILTERS = ['전체', '재원중', '휴원', '퇴원'];

function normalizeGrade(grade) {
  if (!grade) return '기타';
  const g = grade.replace(/\s/g, '');
  if ((g.includes('초') || g.includes('초등')) && g.includes('5')) return '초5';
  if ((g.includes('초') || g.includes('초등')) && g.includes('6')) return '초6';
  if (g.includes('중') && g.includes('1')) return '중1';
  if (g.includes('중') && g.includes('2')) return '중2';
  if (g.includes('중') && g.includes('3')) return '중3';
  if ((g.includes('고') || g.includes('고등')) && g.includes('1')) return '고1';
  if ((g.includes('고') || g.includes('고등')) && g.includes('2')) return '고2';
  if ((g.includes('고') || g.includes('고등')) && g.includes('3')) return '고3';
  if (GRADE_OPTIONS.includes(grade)) return grade;
  return '기타';
}

const STATUS_STYLE = {
  '재원중': { background: '#dcfce7', color: '#16a34a' },
  '휴원':   { background: '#fef9c3', color: '#92400e' },
  '퇴원':   { background: '#fee2e2', color: '#dc2626' },
};

export default function StudentListPage() {
  const navigate = useNavigate();
  const { students, refresh } = useStudentList();
  const [teachers, setTeachers]       = useState([]);
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [classFilter, setClassFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [searchQ, setSearchQ]         = useState('');
  const debouncedQ = useDebounce(searchQ);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm] = useState({ name:'', grade:'', class_name:'', school_name:'', phone:'', teacher_id:'', status:'재원중' });
  const showToast = useToast();

  useEffect(() => {
    getTeachers().then(setTeachers).catch(console.error);
  }, []);

  // 재원상태 필터를 먼저 적용한 베이스
  const statusBase = statusFilter === '전체'
    ? students
    : students.filter(s => s.status === statusFilter);

  // 학년별 카운트 (상태 필터 적용 후)
  const gradeCounts = GRADE_FILTERS.reduce((acc, g) => {
    acc[g] = g === '전체'
      ? statusBase.length
      : statusBase.filter(s => normalizeGrade(s.grade) === g).length;
    return acc;
  }, {});

  // 선택된 학년 기준으로 반 목록 추출
  const availableClasses = (() => {
    const base = gradeFilter === '전체' ? statusBase : statusBase.filter(s => normalizeGrade(s.grade) === gradeFilter);
    const classes = [...new Set(base.map(s => s.class_name).filter(Boolean))].sort();
    return ['전체', ...classes];
  })();

  // 최종 필터링
  const filtered = statusBase.filter(s => {
    if (gradeFilter !== '전체' && normalizeGrade(s.grade) !== gradeFilter) return false;
    if (classFilter !== '전체' && s.class_name !== classFilter) return false;
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.school_name ?? '').toLowerCase().includes(q) ||
        (s.class_name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  function handleGradeFilter(g) {
    setGradeFilter(g);
    setClassFilter('전체');
  }

  function handleStatusFilter(s) {
    setStatusFilter(s);
    setGradeFilter('전체');
    setClassFilter('전체');
  }

  async function submit() {
    if (!form.name.trim()) { showToast('이름을 입력하세요.', 'error'); return; }
    try {
      const student = await createStudent({ ...form, teacher_id: form.teacher_id || null });
      // 담당강사 선택 시 student_teachers 다대다 테이블에도 삽입 (선생님 학생 필터링 대응)
      if (form.teacher_id && student?.id) {
        await addStudentTeacher(student.id, form.teacher_id).catch(() => {});
      }
      showToast(`${form.name} 학생이 등록되었습니다.`);
      setShowModal(false);
      setForm({ name:'', grade:'', class_name:'', school_name:'', phone:'', teacher_id:'', status:'재원중' });
      refresh();
    } catch (e) { showToast('등록 실패: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-users"></i> 학생 명단</h2>
      </div>

      {/* 재원상태 필터 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>재원 상태</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => {
            const active = statusFilter === s;
            const count = s === '전체' ? students.length : students.filter(st => st.status === s).length;
            const style = STATUS_STYLE[s] ?? { background: '#f1f5f9', color: '#64748b' };
            return (
              <button key={s} onClick={() => handleStatusFilter(s)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid ' + (active ? style.color : '#e2e8f0'),
                background: active ? style.color : '#fff',
                color: active ? '#fff' : '#475569',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {s}
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9,
                  background: active ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                  color: active ? '#fff' : '#64748b',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 학년 필터 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>학년</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GRADE_FILTERS.map(g => {
            const active = gradeFilter === g;
            const count = gradeCounts[g] ?? 0;
            return (
              <button key={g} onClick={() => handleGradeFilter(g)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid ' + (active ? '#4361ee' : '#e2e8f0'),
                background: active ? '#4361ee' : '#fff',
                color: active ? '#fff' : '#475569',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {g}
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9,
                  background: active ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                  color: active ? '#fff' : '#64748b',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 반 필터 */}
      {availableClasses.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>반</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availableClasses.map(c => {
              const active = classFilter === c;
              const base = gradeFilter === '전체' ? statusBase : statusBase.filter(s => normalizeGrade(s.grade) === gradeFilter);
              const count = c === '전체' ? base.length : base.filter(s => s.class_name === c).length;
              return (
                <button key={c} onClick={() => setClassFilter(c)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid ' + (active ? '#7209b7' : '#e2e8f0'),
                  background: active ? '#7209b7' : '#fff',
                  color: active ? '#fff' : '#475569',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {c}
                  <span style={{
                    fontSize: 11, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8,
                    background: active ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                    color: active ? '#fff' : '#64748b',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              placeholder="이름 / 학교 / 반 검색..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{ padding:'8px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, width:240 }}
            />
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {filtered.length}명
            </span>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-user-plus"></i> 학생 등록
          </button>
        </div>

        <table className="student-list-table" style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['#','이름','학년','반','학교','담당강사','등록일','상태','계정'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:'#64748b', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>해당하는 학생이 없습니다.</td></tr>
              : filtered.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/student-info?id=${s.id}`)}
                  style={{ borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding:'10px 14px', fontSize:13, color:'#94a3b8' }}>{i+1}</td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', background:'#e8ecff', color:'#4361ee',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0,
                      }}>{s.name[0]}</div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>
                    {s.grade ? (
                      <span style={{
                        padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:700,
                        background: s.grade.includes('고') ? '#fef9c3' : '#dbeafe',
                        color: s.grade.includes('고') ? '#92400e' : '#1d4ed8',
                      }}>{normalizeGrade(s.grade)}</span>
                    ) : '-'}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>
                    {s.class_name ? (
                      <span style={{
                        padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600,
                        background:'#f3e8ff', color:'#7209b7',
                      }}>{s.class_name}</span>
                    ) : '-'}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.school_name ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.teachers?.name ?? '-'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{s.enrolled_at?.slice(0,7).replace('-','.') ?? '-'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{
                      padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                      ...(STATUS_STYLE[s.status] ?? { background:'#f1f5f9', color:'#64748b' }),
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    {s.profile_id
                      ? <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#dcfce7', color:'#16a34a' }}>연결됨</span>
                      : <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#f1f5f9', color:'#94a3b8' }}>미연결</span>
                    }
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={<><i className="fas fa-user-plus"></i> 학생 등록</>} onClose={() => setShowModal(false)}>
          <div style={{ display:'grid', gap:12 }}>
            <div>
              <label style={lbl}>이름 *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="학생 이름" style={inp} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>학년</label>
                <select value={form.grade} onChange={e => setForm(f => ({...f, grade: e.target.value}))} style={inp}>
                  <option value="">선택</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>반</label>
                <input type="text" value={form.class_name} onChange={e => setForm(f => ({...f, class_name: e.target.value}))}
                  placeholder="예: 수학 심화반" style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>학교명</label>
              <input type="text" value={form.school_name} onChange={e => setForm(f => ({...f, school_name: e.target.value}))}
                placeholder="학교명" style={inp} />
            </div>
            <div>
              <label style={lbl}>연락처</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="010-0000-0000" style={inp} />
            </div>
            <div>
              <label style={lbl}>담당강사</label>
              <select value={form.teacher_id} onChange={e => setForm(f => ({...f, teacher_id: e.target.value}))} style={inp}>
                <option value="">미배정</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>상태</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={inp}>
                <option value="재원중">재원중</option>
                <option value="휴원">휴원</option>
                <option value="퇴원">퇴원</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={{ padding:'10px 20px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14 }}>취소</button>
            <button onClick={submit} style={{ padding:'10px 20px', background:'#4361ee', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
              <i className="fas fa-save"></i> 저장
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 };
const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' };

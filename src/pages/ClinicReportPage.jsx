import { useState, useEffect } from 'react';
import { useStudentList } from '../hooks/useStudentList.js';
import { getClinicReportData } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';

const SUBJECT_COLORS = {
  '영어': '#4361ee', '수학': '#22c55e', '과학': '#f59e0b',
  '국어': '#ef4444', '사회': '#8b5cf6', '기타': '#64748b',
};

function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] ?? '#64748b';
}

/* ─────────────────────────────────────────────
   메인 페이지
───────────────────────────────────────────── */
export default function ClinicReportPage() {
  const { students } = useStudentList();
  const showToast = useToast();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [studentId,   setStudentId]   = useState('');
  const [yearMonth,   setYearMonth]   = useState(defaultMonth);
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(false);

  const student = students.find(s => s.id === studentId);

  useEffect(() => {
    if (students.length && !studentId) setStudentId(students[0].id);
  }, [students]);

  useEffect(() => {
    if (studentId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, yearMonth]);

  async function loadData() {
    setLoading(true);
    try {
      setItems(await getClinicReportData(studentId, yearMonth));
    } catch (e) {
      showToast('데이터 로드 실패: ' + e.message, 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  /* 과목별 그룹 */
  const grouped = items.reduce((acc, item) => {
    const key = item.subject || '기타';
    (acc[key] = acc[key] ?? []).push(item);
    return acc;
  }, {});

  const [year, month] = yearMonth.split('-');
  const monthLabel  = `${year}년 ${parseInt(month)}월`;
  const totalCount  = items.length;
  const hasData     = !loading && studentId && totalCount > 0;

  return (
    <div>
      {/* ── 컨트롤 바 (인쇄 시 숨김) ── */}
      <div className="no-print" style={{ padding: '24px 24px 0', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>클리닉 월간 리포트</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' }}
            >
              <option value="">학생 선택</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="month"
              value={yearMonth}
              onChange={e => setYearMonth(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' }}
            />
            <button
              onClick={() => window.print()}
              disabled={!hasData}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 20px',
                background: hasData ? '#4361ee' : '#e2e8f0',
                color: hasData ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: hasData ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              <i className="fas fa-file-pdf" /> PDF 저장
            </button>
          </div>
        </div>

        {/* 통계 요약 카드 (인쇄 전 미리보기) */}
        {hasData && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="총 클리닉 횟수" value={`${totalCount}회`} color="#4361ee" />
            <StatCard label="참여 과목 수" value={`${Object.keys(grouped).length}개`} color="#22c55e" />
            {Object.entries(grouped).map(([subj, arr]) => (
              <StatCard key={subj} label={subj} value={`${arr.length}회`} color={getSubjectColor(subj)} />
            ))}
          </div>
        )}
      </div>

      {/* ── 인쇄 영역 ── */}
      <div className="clinic-report-print-area" style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
        {loading ? (
          <div className="no-print" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
            로딩 중...
          </div>
        ) : !studentId ? (
          <div className="no-print" style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <i className="fas fa-user-graduate" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
            학생을 선택하세요.
          </div>
        ) : totalCount === 0 ? (
          <div className="no-print" style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <i className="fas fa-folder-open" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
            {monthLabel}에 클리닉 기록이 없습니다.
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* 리포트 헤더 */}
            <div style={{
              background: 'linear-gradient(135deg, #4361ee 0%, #7209b7 100%)',
              color: '#fff', padding: '28px 32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, letterSpacing: 2 }}>EM+ 학원</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: 0.5 }}>
                클리닉 활동 리포트
              </h2>
              <div style={{ fontSize: 16, opacity: 0.9 }}>
                <strong style={{ fontSize: 18 }}>{student?.name ?? ''}</strong>
                &ensp;|&ensp;{monthLabel}
                &ensp;|&ensp;총 <strong>{totalCount}회</strong> 참여
              </div>
            </div>

            {/* 과목별 섹션 */}
            <div style={{ padding: '28px 32px' }}>
              {Object.entries(grouped).map(([subject, subItems], idx) => (
                <SubjectSection
                  key={subject}
                  subject={subject}
                  items={subItems}
                  isLast={idx === Object.keys(grouped).length - 1}
                />
              ))}

              {/* 리포트 푸터 */}
              <div style={{
                marginTop: 32, paddingTop: 16,
                borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, color: '#94a3b8',
              }}>
                <span>출력일: {new Date().toLocaleDateString('ko-KR')}</span>
                <span>EM+ 학습관리 시스템</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   과목 섹션
───────────────────────────────────────────── */
function SubjectSection({ subject, items, isLast }) {
  const color = getSubjectColor(subject);

  return (
    <div style={{ marginBottom: isLast ? 0 : 28 }}>
      {/* 섹션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, background: color, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{subject}</span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color, background: `${color}18`,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {items.length}회
        </span>
      </div>

      {/* 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ ...th, width: 80 }}>날짜</th>
            <th style={{ ...th, width: 120 }}>클리닉 유형</th>
            <th style={{ ...th, width: 200 }}>지시내용</th>
            <th style={{ ...th, textAlign: 'left' }}>결과 / 특이사항</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const raw = item.session?.session_date;
            const dateStr = raw
              ? new Date(raw + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
              : '—';
            const isEven = i % 2 === 1;
            return (
              <tr key={item.id} style={{ background: isEven ? '#f8fafc' : '#fff' }}>
                <td style={{ ...td, color: '#64748b', fontWeight: 500 }}>{dateStr}</td>
                <td style={td}>
                  <span style={{
                    background: `${color}15`, color,
                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  }}>
                    {item.clinic_type || '—'}
                  </span>
                </td>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>
                  {item.instructions || <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
                <td style={{ ...td, textAlign: 'left', color: item.result ? '#1e293b' : '#94a3b8', fontWeight: item.result ? 500 : 400 }}>
                  {item.result || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>미입력</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   통계 카드
───────────────────────────────────────────── */
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${color}30`,
      borderRadius: 10, padding: '12px 18px',
      display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100,
    }}>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   스타일 상수
───────────────────────────────────────────── */
const th = {
  padding: '9px 12px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#475569',
  borderBottom: '2px solid #e2e8f0',
  fontSize: 12,
  whiteSpace: 'nowrap',
};
const td = {
  padding: '10px 12px',
  textAlign: 'center',
  color: '#374151',
  verticalAlign: 'top',
  borderBottom: '1px solid #f1f5f9',
  lineHeight: 1.5,
};

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useStudentList } from '../hooks/useStudentList.js';
import { getClinicReportData, getRoutineMonthlyData } from '../lib/api.js';
import { useToast } from '../components/common/Toast.jsx';

const SUBJECT_COLORS = {
  '영어': '#4361ee', '수학': '#22c55e', '과학': '#f59e0b',
  '국어': '#ef4444', '사회': '#8b5cf6', '기타': '#64748b',
};
function getSubjectColor(s) { return SUBJECT_COLORS[s] ?? '#64748b'; }

/* ─────────────────────────────────────────────
   메인 페이지
───────────────────────────────────────────── */
export default function ClinicReportPage() {
  const { students } = useStudentList();
  const showToast = useToast();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [studentId,    setStudentId]    = useState('');
  const [yearMonth,    setYearMonth]    = useState(defaultMonth);
  const [items,        setItems]        = useState([]);
  const [routineData,  setRoutineData]  = useState({ templates: [], logs: [] });
  const [loading,      setLoading]      = useState(false);
  const [viewMode,     setViewMode]     = useState('report');   // 'report' | 'ai'
  const [aiSummary,    setAiSummary]    = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [capturing,    setCapturing]    = useState(false);

  const reportRef = useRef(null);

  const student = students.find(s => s.id === studentId);

  useEffect(() => {
    if (students.length && !studentId) setStudentId(students[0].id);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (studentId) { loadData(); setAiSummary(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, yearMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const [clinic, routine] = await Promise.all([
        getClinicReportData(studentId, yearMonth),
        getRoutineMonthlyData(studentId, yearMonth).catch(() => ({ templates: [], logs: [] })),
      ]);
      setItems(clinic);
      setRoutineData(routine);
    } catch (e) {
      showToast('데이터 로드 실패: ' + e.message, 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  /* 리포트 화면 전체를 이미지(PNG)로 캡처:
       1) PNG 파일 다운로드
       2) 클립보드에도 복사 → 카톡·메모 등에 바로 붙여넣기 가능
     html2canvas는 요소의 전체 높이(scrollHeight)를 렌더하므로
     스크롤로 가려진 부분까지 한 장에 모두 담긴다. */
  async function handleSaveImage() {
    const el = reportRef.current;
    if (!el) return;
    setCapturing(true);

    // 캡처 → PNG blob (한 번만 생성, 다운로드·클립보드가 공유)
    const blobPromise = (async () => {
      const canvas = await html2canvas(el, {
        scale: 2,                  // 2배 해상도 (선명하게)
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const b = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!b) throw new Error('이미지 변환 실패');
      return b;
    })();

    // 클립보드 쓰기는 클릭(사용자 제스처) 직후 동기적으로 시작해야 권한이 유지된다.
    // ClipboardItem에 blob 대신 Promise를 넘기면 캡처가 끝날 때까지 브라우저가 대기.
    let clipboardPromise = null;
    let clipboardOk = false;
    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      try {
        clipboardPromise = navigator.clipboard
          .write([new window.ClipboardItem({ 'image/png': blobPromise })])
          .then(() => { clipboardOk = true; })
          .catch(() => { clipboardOk = false; });
      } catch {
        clipboardPromise = null;
      }
    }

    try {
      const blob = await blobPromise;

      // 1) PNG 파일 다운로드
      const [y, m] = yearMonth.split('-');
      const fname = `${student?.name ?? '학생'}-${y}-${parseInt(m)}-월간 리포트.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // 2) 클립보드 복사 완료 대기
      if (clipboardPromise) await clipboardPromise;

      if (clipboardPromise && clipboardOk) {
        showToast('이미지 저장 완료 — 클립보드에도 복사됨 (바로 붙여넣기 가능)');
      } else if (clipboardPromise) {
        showToast('이미지는 저장됐지만 클립보드 복사에 실패했습니다.');
      } else {
        showToast('이미지가 저장되었습니다. (이 브라우저는 클립보드 복사 미지원)');
      }
    } catch (e) {
      // 캡처 실패 시 클립보드 promise도 정리 (unhandled rejection 방지)
      if (clipboardPromise) { try { await clipboardPromise; } catch { /* ignore */ } }
      showToast('이미지 저장 실패: ' + e.message, 'error');
    } finally {
      setCapturing(false);
    }
  }

  /* AI 요약 생성 */
  async function generateSummary() {
    setAiLoading(true);
    setAiSummary('');
    try {
      const prompt = buildPrompt(student?.name ?? '학생', monthLabel, items);
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'API_KEY_NOT_SET') {
          setAiSummary('__NO_KEY__');
        } else {
          throw new Error(data.error ?? '요약 실패');
        }
        return;
      }
      setAiSummary(data.summary);
    } catch (e) {
      showToast('AI 요약 실패: ' + e.message, 'error');
    } finally {
      setAiLoading(false);
    }
  }

  /* 과목별 그룹 */
  const grouped = items.reduce((acc, item) => {
    const key = item.subject || '기타';
    (acc[key] = acc[key] ?? []).push(item);
    return acc;
  }, {});

  const [year, month] = yearMonth.split('-');
  const monthLabel = `${year}년 ${parseInt(month)}월`;
  const totalCount = items.length;
  const hasData    = !loading && studentId && totalCount > 0;

  return (
    <div>
      {/* ── 컨트롤 바 (인쇄 시 숨김) ── */}
      <div className="no-print" style={{ padding: '24px 24px 0', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>클리닉 월간 리포트</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              style={ctrlStyle}
            >
              <option value="">학생 선택</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="month"
              value={yearMonth}
              onChange={e => setYearMonth(e.target.value)}
              style={ctrlStyle}
            />
            <button
              onClick={handleSaveImage}
              disabled={!hasData || capturing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 20px',
                background: (hasData && !capturing) ? '#16a34a' : '#e2e8f0',
                color:  (hasData && !capturing) ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: (hasData && !capturing) ? 'pointer' : 'not-allowed',
              }}
            >
              <i className={capturing ? 'fas fa-spinner fa-spin' : 'fas fa-image'} />
              {capturing ? '캡처 중...' : '이미지 저장'}
            </button>
            <button
              onClick={() => window.print()}
              disabled={!hasData}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 20px',
                background: hasData ? '#4361ee' : '#e2e8f0',
                color:  hasData ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: hasData ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="fas fa-file-pdf" /> PDF 저장
            </button>
          </div>
        </div>

        {/* 뷰 토글 */}
        {hasData && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            <ToggleBtn
              active={viewMode === 'report'}
              icon="fa-table"
              label="리포트"
              onClick={() => setViewMode('report')}
            />
            <ToggleBtn
              active={viewMode === 'ai'}
              icon="fa-wand-magic-sparkles"
              label="AI 요약"
              onClick={() => setViewMode('ai')}
            />
          </div>
        )}

        {/* 통계 요약 카드 */}
        {hasData && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="총 결과보고 횟수" value={`${totalCount}회`} color="#4361ee" />
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
          <div ref={reportRef} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* 리포트 헤더 */}
            <ReportHeader studentName={student?.name ?? ''} monthLabel={monthLabel} totalCount={totalCount} />

            <div style={{ padding: '28px 32px' }}>
              {/* ── 리포트 뷰 ── */}
              {viewMode === 'report' && (
                <>
                  {Object.entries(grouped).map(([subject, subItems], idx) => (
                    <SubjectSection
                      key={subject}
                      subject={subject}
                      items={subItems}
                      isLast={idx === Object.keys(grouped).length - 1 && routineData.templates.length === 0}
                    />
                  ))}
                  {routineData.templates.length > 0 && (
                    <RoutineReportSection
                      templates={routineData.templates}
                      logs={routineData.logs}
                      monthLabel={monthLabel}
                    />
                  )}
                </>
              )}

              {/* ── AI 요약 뷰 ── */}
              {viewMode === 'ai' && (
                <AiSummaryView
                  summary={aiSummary}
                  loading={aiLoading}
                  hasData={hasData}
                  onGenerate={generateSummary}
                />
              )}

              {/* 리포트 푸터 */}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
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
   AI 요약 뷰
───────────────────────────────────────────── */
function AiSummaryView({ summary, loading, hasData, onGenerate }) {
  function handleCopy() {
    if (!summary || summary === '__NO_KEY__') return;
    navigator.clipboard.writeText(summary).then(() => alert('복사되었습니다.'));
  }

  return (
    <div>
      {/* 생성 버튼 */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <button
          onClick={onGenerate}
          disabled={loading || !hasData}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 28px',
            background: 'linear-gradient(135deg, #4361ee, #7209b7)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(67,97,238,0.3)',
          }}
        >
          {loading
            ? <><i className="fas fa-spinner fa-spin" /> AI 요약 생성 중...</>
            : <><i className="fas fa-wand-magic-sparkles" /> AI 요약 생성</>
          }
        </button>
      </div>

      {/* 결과 영역 */}
      {!summary && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
          <i className="fas fa-robot" style={{ fontSize: 36, marginBottom: 10, display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: 13 }}>버튼을 눌러 학부모용 AI 요약문을 생성하세요.</div>
        </div>
      )}

      {summary === '__NO_KEY__' && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '16px 20px', fontSize: 13, color: '#92400e' }}>
          <strong>⚠ API 키가 설정되지 않았습니다.</strong><br />
          Vercel Dashboard → Settings → Environment Variables 에서<br />
          <code style={{ background: '#fffbeb', padding: '2px 6px', borderRadius: 4 }}>CLAUDE_API_KEY</code> 를 추가해주세요.
        </div>
      )}

      {summary && summary !== '__NO_KEY__' && (
        <div>
          {/* 요약 카드 */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #fdf4ff 100%)',
            border: '1px solid #c7d2fe',
            borderRadius: 12,
            padding: '24px 28px',
            lineHeight: 1.9,
            fontSize: 14,
            color: '#1e293b',
            whiteSpace: 'pre-wrap',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 20, opacity: 0.15 }}>
              <i className="fas fa-robot" />
            </div>
            {summary}
          </div>

          {/* 복사 버튼 */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
            >
              <i className="fas fa-copy" /> 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   리포트 헤더
───────────────────────────────────────────── */
function ReportHeader({ studentName, monthLabel, totalCount }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #4361ee 0%, #7209b7 100%)', color: '#fff', padding: '28px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, letterSpacing: 2 }}>EM+ 학원</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: 0.5 }}>클리닉 활동 리포트</h2>
      <div style={{ fontSize: 16, opacity: 0.9 }}>
        <strong style={{ fontSize: 18 }}>{studentName}</strong>
        &ensp;|&ensp;{monthLabel}
        &ensp;|&ensp;총 <strong>{totalCount}회</strong> 결과보고
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, background: color, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{subject}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}18`, padding: '3px 10px', borderRadius: 20 }}>
          {items.length}회
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ ...th, width: 80 }}>날짜</th>
            <th style={{ ...th, width: 120 }}>클리닉 유형</th>
            <th style={{ ...th, textAlign: 'left' }}>결과보고</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const raw = item.session?.session_date;
            const dateStr = raw ? new Date(raw + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '—';
            return (
              <tr key={item.id} style={{ background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                <td style={{ ...td, color: '#64748b', fontWeight: 500 }}>{dateStr}</td>
                <td style={td}>
                  <span style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {item.clinic_type || '—'}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'left', color: '#1e293b' }}>
                  {item.instructions && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                      지시: {item.instructions}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, color: item.result ? '#1e293b' : '#94a3b8' }}>
                    {item.result || <span style={{ fontStyle: 'italic', fontWeight: 400 }}>미입력</span>}
                  </div>
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
   루틴 현황 섹션 (리포트 내 삽입)
───────────────────────────────────────────── */
const ROUTINE_SUBJECT_COLORS = {
  '영어': '#4361ee', '수학': '#22c55e', '과학': '#f59e0b',
  '국어': '#ef4444', '사회': '#8b5cf6', '기타': '#64748b',
};
function rsc(s) { return ROUTINE_SUBJECT_COLORS[s] ?? '#64748b'; }

function RoutineReportSection({ templates, logs, monthLabel }) {
  const byTemplate = {};
  templates.forEach(t => { byTemplate[t.id] = { done: 0, total: 0, comments: [] }; });
  logs.forEach(l => {
    if (!byTemplate[l.template_id]) return;
    byTemplate[l.template_id].total += 1;
    if (l.is_done) byTemplate[l.template_id].done += 1;
    if (l.comment) byTemplate[l.template_id].comments.push(l.comment);
  });

  const overallDone  = Object.values(byTemplate).reduce((s, v) => s + v.done, 0);
  const overallTotal = Object.values(byTemplate).reduce((s, v) => s + v.total, 0);
  const overallPct   = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, background: '#7c3aed', borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>루틴 체크 현황</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#7c3aed18', padding: '3px 10px', borderRadius: 20 }}>
          {monthLabel} 전체 달성률 {overallPct}%
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ ...th, textAlign: 'left' }}>루틴 항목</th>
            <th style={{ ...th, width: 60 }}>과목</th>
            <th style={{ ...th, width: 80 }}>완료 / 체크</th>
            <th style={{ ...th, width: 70 }}>달성률</th>
            <th style={{ ...th, textAlign: 'left' }}>주요 코멘트</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t, i) => {
            const stat  = byTemplate[t.id] ?? { done: 0, total: 0, comments: [] };
            const pct   = stat.total ? Math.round((stat.done / stat.total) * 100) : 0;
            const color = rsc(t.subject);
            return (
              <tr key={t.id} style={{ background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                <td style={{ ...td, textAlign: 'left', fontWeight: 500, color: '#1e293b' }}>{t.title}</td>
                <td style={td}>
                  <span style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{t.subject}</span>
                </td>
                <td style={{ ...td, color: '#64748b', fontWeight: 600 }}>{stat.done} / {stat.total}</td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f87171', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f87171', minWidth: 32 }}>{pct}%</span>
                  </div>
                </td>
                <td style={{ ...td, textAlign: 'left', color: '#64748b', fontSize: 12 }}>
                  {stat.comments.length > 0
                    ? stat.comments.slice(-2).join(' / ')
                    : <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>코멘트 없음</span>}
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
   토글 버튼
───────────────────────────────────────────── */
function ToggleBtn({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 18px',
        background: active ? '#fff' : 'transparent',
        color: active ? '#4361ee' : '#64748b',
        border: 'none', borderRadius: 8,
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <i className={`fas ${icon}`} />
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────
   통계 카드
───────────────────────────────────────────── */
function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI 프롬프트 빌더
───────────────────────────────────────────── */
function buildPrompt(studentName, monthLabel, items) {
  const lines = items.map(item => {
    const raw = item.session?.session_date;
    const dateStr = raw ? new Date(raw + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '날짜미상';
    const parts = [
      dateStr,
      item.subject || '과목미상',
      item.clinic_type || '유형미상',
    ];
    if (item.instructions) parts.push(`지시: ${item.instructions}`);
    if (item.result)       parts.push(`결과: ${item.result}`);
    return parts.join(' | ');
  }).join('\n');

  return `당신은 학원 담당 선생님입니다.
아래는 ${studentName} 학생의 ${monthLabel} 클리닉 활동 기록입니다.

${lines}

위 기록을 바탕으로 학부모에게 전달할 클리닉 활동 요약문을 작성해주세요.
- 200~300자 내외
- 따뜻하고 전문적인 어조
- 잘한 점과 개선이 필요한 점을 균형 있게 언급
- 앞으로의 학습 방향 간략히 포함
- 인사말 없이 본문만 작성`;
}

/* ─────────────────────────────────────────────
   스타일 상수
───────────────────────────────────────────── */
const ctrlStyle = {
  padding: '7px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff',
};
const th = {
  padding: '9px 12px', textAlign: 'center',
  fontWeight: 600, color: '#475569',
  borderBottom: '2px solid #e2e8f0', fontSize: 12, whiteSpace: 'nowrap',
};
const td = {
  padding: '10px 12px', textAlign: 'center',
  color: '#374151', verticalAlign: 'top',
  borderBottom: '1px solid #f1f5f9', lineHeight: 1.5,
};

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useStudentList } from '../hooks/useStudentList.js';
import { useToast } from '../components/common/Toast.jsx';
import {
  getRoutineTemplates,
  createRoutineTemplate,
  updateRoutineTemplate,
  deleteRoutineTemplate,
  getRoutineLogs,
  upsertRoutineLog,
  getRoutineHistory,
} from '../lib/api.js';
import { todayLocal } from '../lib/dateUtil.js';

const SUBJECTS = ['영어', '수학', '국어', '과학', '사회', '기타'];
const SUBJECT_COLORS = {
  '영어': '#4361ee', '수학': '#22c55e', '과학': '#f59e0b',
  '국어': '#ef4444', '사회': '#8b5cf6', '기타': '#64748b',
};
function sc(s) { return SUBJECT_COLORS[s] ?? '#64748b'; }

const todayStr = todayLocal;

/* ═══════════════════════════════════════
   메인 페이지
═══════════════════════════════════════ */
export default function RoutinePage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'student';
  const canManage = role === 'admin' || role === 'teacher';

  const { students } = useStudentList();
  const showToast = useToast();

  const [studentId, setStudentId] = useState('');
  const [date, setDate]           = useState(todayStr);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs]           = useState({});   // { [templateId]: routineLog }
  const [loading, setLoading]     = useState(false);

  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState({ title: '', subject: '영어' });

  useEffect(() => {
    if (students.length && !studentId) setStudentId(students[0].id);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (studentId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, date]);

  async function load() {
    setLoading(true);
    try {
      const [tmpl, lgArr] = await Promise.all([
        getRoutineTemplates(studentId),
        getRoutineLogs(studentId, date),
      ]);
      setTemplates(tmpl);
      const map = {};
      lgArr.forEach(l => { map[l.template_id] = l; });
      setLogs(map);
    } catch (e) {
      showToast('로드 실패: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ─── 템플릿 관리 ─── */
  function openAdd() {
    setEditTarget(null);
    setForm({ title: '', subject: '영어' });
    setShowForm(true);
  }
  function openEdit(t) {
    setEditTarget(t);
    setForm({ title: t.title, subject: t.subject });
    setShowForm(true);
  }
  async function saveTemplate() {
    if (!form.title.trim()) return showToast('루틴 이름을 입력하세요.', 'error');
    try {
      if (editTarget) {
        const updated = await updateRoutineTemplate(editTarget.id, form);
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        showToast('수정되었습니다.', 'success');
      } else {
        const created = await createRoutineTemplate({
          student_id: studentId,
          title: form.title,
          subject: form.subject,
          sort_order: templates.length,
          created_by: profile?.id,
        });
        setTemplates(prev => [...prev, created]);
        showToast('루틴이 추가되었습니다.', 'success');
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'error');
    }
  }
  async function removeTemplate(id) {
    if (!confirm('이 루틴을 삭제하시겠습니까?')) return;
    try {
      await deleteRoutineTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('삭제되었습니다.', 'success');
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  /* ─── 체크 로그 ─── */
  async function toggleLog(templateId) {
    const prev = logs[templateId];
    const newDone = !(prev?.is_done ?? false);
    setLogs(lg => ({ ...lg, [templateId]: { ...(lg[templateId] ?? {}), is_done: newDone } }));
    try {
      const saved = await upsertRoutineLog({
        id: prev?.id,
        template_id: templateId,
        student_id: studentId,
        log_date: date,
        is_done: newDone,
        comment: prev?.comment ?? '',
        checked_by: profile?.id,
        checked_by_name: profile?.name ?? '',
      });
      setLogs(lg => ({ ...lg, [templateId]: saved }));
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'error');
      setLogs(lg => ({ ...lg, [templateId]: prev }));
    }
  }
  async function saveComment(templateId, comment) {
    const prev = logs[templateId];
    try {
      const saved = await upsertRoutineLog({
        id: prev?.id,
        template_id: templateId,
        student_id: studentId,
        log_date: date,
        is_done: prev?.is_done ?? false,
        comment,
        checked_by: profile?.id,
        checked_by_name: profile?.name ?? '',
      });
      setLogs(lg => ({ ...lg, [templateId]: saved }));
    } catch (e) {
      showToast('코멘트 저장 실패: ' + e.message, 'error');
    }
  }

  const doneCount = templates.filter(t => logs[t.id]?.is_done).length;
  const pct = templates.length ? Math.round((doneCount / templates.length) * 100) : 0;

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <i className="fas fa-clipboard-list" style={{ fontSize: 20, color: '#4361ee' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>루틴 체크리스트</h1>
      </div>

      {/* 컨트롤 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={studentId} onChange={e => setStudentId(e.target.value)} style={ctrl}>
          <option value="">학생 선택</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={ctrl} />
        {date !== todayStr() && (
          <button onClick={() => setDate(todayStr())} style={btnGhost}>
            <i className="fas fa-calendar-day" /> 오늘
          </button>
        )}
      </div>

      {!studentId ? (
        <Empty icon="fa-user-graduate" msg="학생을 선택하세요." />
      ) : loading ? (
        <Empty icon="fa-spinner fa-spin" msg="로딩 중..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── 섹션 1: 등록된 루틴 ── */}
          <div style={card}>
            <div style={cardHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-list" style={{ color: '#4361ee' }} />
                <span style={cardTitle}>등록된 루틴</span>
                <Chip color="#4361ee">{templates.length}개</Chip>
              </div>
              {canManage && (
                <button onClick={openAdd} style={btnPrimary}>
                  <i className="fas fa-plus" /> 루틴 추가
                </button>
              )}
            </div>

            {showForm && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="루틴 이름 (예: 영어 단어 60개 암기)"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveTemplate()}
                    style={{ ...ctrl, flex: 1, minWidth: 200 }}
                  />
                  <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} style={ctrl}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={saveTemplate} style={btnPrimary}>저장</button>
                  <button onClick={() => setShowForm(false)} style={btnGhost}>취소</button>
                </div>
              </div>
            )}

            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: 13 }}>
                {canManage
                  ? '루틴 추가 버튼으로 이 학생의 매일 루틴 항목을 등록하세요.'
                  : '등록된 루틴이 없습니다.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {templates.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12, color: '#cbd5e1', width: 20, textAlign: 'right', fontWeight: 600 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{t.title}</span>
                    <Chip color={sc(t.subject)}>{t.subject}</Chip>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(t)} style={iconBtn}><i className="fas fa-pen" /></button>
                        <button onClick={() => removeTemplate(t.id)} style={{ ...iconBtn, color: '#f87171' }}><i className="fas fa-trash" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 섹션 2: 오늘의 체크 ── */}
          {templates.length > 0 && (
            <div style={card}>
              <div style={cardHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-check-square" style={{ color: '#22c55e' }} />
                  <span style={cardTitle}>
                    {date === todayStr() ? '오늘의 체크' : `${date} 체크`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: doneCount === templates.length ? '#22c55e' : '#64748b' }}>
                    {doneCount} / {templates.length} 완료
                  </span>
                </div>
                {/* 진행률 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#22c55e' : '#64748b' }}>{pct}%</span>
                  <div style={{ width: 100, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#4361ee', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(t => (
                  <CheckRow
                    key={t.id}
                    template={t}
                    log={logs[t.id]}
                    onToggle={() => toggleLog(t.id)}
                    onComment={c => saveComment(t.id, c)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 섹션 3: 최근 14일 이력 ── */}
          {templates.length > 0 && (
            <HistorySection studentId={studentId} templates={templates} />
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   체크 행
═══════════════════════════════════════ */
function CheckRow({ template, log, onToggle, onComment }) {
  const isDone = log?.is_done ?? false;
  const color  = sc(template.subject);

  const [commentOpen, setCommentOpen] = useState(!!(log?.comment));
  const [draft, setDraft] = useState(log?.comment ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(log?.comment ?? '');
    if (log?.comment) setCommentOpen(true);
  }, [log?.comment]);

  function commit() {
    if (draft !== (log?.comment ?? '')) onComment(draft);
  }

  return (
    <div style={{
      background:   isDone ? '#f0fdf4' : '#fff',
      border:       `1.5px solid ${isDone ? '#86efac' : '#e2e8f0'}`,
      borderRadius: 10,
      padding:      '12px 14px',
      transition:   'background 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 체크박스 */}
        <button
          onClick={onToggle}
          style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            border: `2px solid ${isDone ? '#22c55e' : '#cbd5e1'}`,
            background: isDone ? '#22c55e' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isDone && <i className="fas fa-check" style={{ color: '#fff', fontSize: 11 }} />}
        </button>

        <Chip color={color}>{template.subject}</Chip>

        <span style={{
          flex: 1, fontSize: 14, fontWeight: 500,
          color: isDone ? '#16a34a' : '#1e293b',
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: '#86efac',
        }}>
          {template.title}
        </span>

        {log?.checked_by_name && (
          <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{log.checked_by_name}</span>
        )}

        <button
          onClick={() => setCommentOpen(o => !o)}
          title="코멘트"
          style={{ ...iconBtn, color: log?.comment ? '#4361ee' : '#cbd5e1' }}
        >
          <i className="fas fa-comment-alt" />
        </button>
      </div>

      {commentOpen && (
        <div style={{ marginTop: 10, paddingLeft: 36 }}>
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur(); } if (e.key === 'Escape') setCommentOpen(false); }}
            placeholder="진행 상황 코멘트 입력 후 Enter..."
            style={{ width: '100%', padding: '7px 12px', border: '1.5px solid #c7d2fe', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   최근 14일 이력 섹션
═══════════════════════════════════════ */
function HistorySection({ studentId, templates }) {
  const [open,   setOpen]   = useState(false);
  const [hist,   setHist]   = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function toggle() {
    if (!open && !loaded) {
      try {
        setHist(await getRoutineHistory(studentId));
        setLoaded(true);
      } catch { /* ignore */ }
    }
    setOpen(o => !o);
  }

  const byDate = {};
  hist.forEach(l => {
    if (!byDate[l.log_date]) byDate[l.log_date] = {};
    byDate[l.log_date][l.template_id] = l;
  });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div style={card}>
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <i className="fas fa-history" style={{ color: '#7c3aed' }} />
        <span style={cardTitle}>최근 14일 이력</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }} />
      </button>

      {open && (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          {dates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 28, color: '#94a3b8', fontSize: 13 }}>
              <i className="fas fa-calendar-times" style={{ marginRight: 6 }} />
              아직 체크 기록이 없습니다.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...hTh, textAlign: 'left', minWidth: 130 }}>루틴 항목</th>
                  {dates.map(d => {
                    const doneCount = templates.filter(t => byDate[d]?.[t.id]?.is_done).length;
                    const pct = templates.length ? Math.round((doneCount / templates.length) * 100) : 0;
                    return (
                      <th key={d} style={{ ...hTh, minWidth: 52 }}>
                        <div>{new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</div>
                        <div style={{ fontSize: 10, color: pct === 100 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>{pct}%</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...hTd, textAlign: 'left', fontWeight: 500, color: '#1e293b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Chip color={sc(t.subject)}>{t.subject}</Chip>
                      {' '}{t.title}
                    </td>
                    {dates.map(d => {
                      const l = byDate[d]?.[t.id];
                      return (
                        <td key={d} style={{ ...hTd, textAlign: 'center' }} title={l?.comment ?? ''}>
                          {l ? (
                            l.is_done
                              ? <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: 15 }} />
                              : <i className="fas fa-times-circle" style={{ color: '#f87171', fontSize: 15 }} />
                          ) : (
                            <span style={{ color: '#e2e8f0' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   유틸 컴포넌트
═══════════════════════════════════════ */
function Empty({ icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
      <i className={`fas ${icon}`} style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
      {msg}
    </div>
  );
}
function Chip({ color, children }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: `${color}18`, color, fontWeight: 600, flexShrink: 0 }}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════
   스타일 상수
═══════════════════════════════════════ */
const ctrl      = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' };
const card      = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px' };
const cardHead  = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 };
const cardTitle = { fontSize: 15, fontWeight: 700, color: '#1e293b' };
const btnPrimary = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnGhost   = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 8, fontSize: 13, cursor: 'pointer' };
const iconBtn    = { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: '4px 6px', borderRadius: 6, flexShrink: 0 };
const hTh = { padding: '8px 10px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap' };
const hTd = { padding: '8px 10px', fontSize: 12 };

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import {
  getTeachers, getStudents, getTeacherByProfileId,
  getClinicSessions, createClinicSession, updateClinicSession, deleteClinicSession,
  createClinicItem, updateClinicItem, deleteClinicItem,
} from '../lib/api.js';

const SUBJECTS    = ['영어', '수학', '과학', '국어', '사회', '기타'];
const CLINIC_TYPES = ['단어TEST', '내신대비', '문제풀이', '재시험'];

const COLOR_PALETTE = [
  { btnBg: '#fde047', btnText: '#854d0e', rowBg: '#fefce8', border: '#fde047' },
  { btnBg: '#86efac', btnText: '#14532d', rowBg: '#f0fdf4', border: '#86efac' },
  { btnBg: '#93c5fd', btnText: '#1e3a8a', rowBg: '#eff6ff', border: '#93c5fd' },
  { btnBg: '#d8b4fe', btnText: '#581c87', rowBg: '#fdf4ff', border: '#d8b4fe' },
  { btnBg: '#fdba74', btnText: '#7c2d12', rowBg: '#fff7ed', border: '#fdba74' },
];

/* ─────────────────────────────────────────────
   메인 페이지
───────────────────────────────────────────── */
export default function ClinicPage() {
  const { profile } = useAuth();
  const showToast = useToast();
  const role = profile?.role ?? 'teacher';
  const isAssistant = role === 'assistant';
  const isAdmin     = role === 'admin';

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]               = useState(today);
  // 당일이거나 원장이면 편집 가능
  const canEdit = isAdmin || date === today;
  const [sessions, setSessions]       = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [students, setStudents]       = useState([]);
  const [myRecord, setMyRecord]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [dbError, setDbError]         = useState(false);

  /* 참조 데이터 로드 */
  useEffect(() => {
    async function init() {
      try {
        const [t, s] = await Promise.all([getTeachers(), getStudents()]);
        setTeachers(t ?? []);
        setStudents((s ?? []).filter(st => st.status === '재원중'));
        if (profile?.id && (role === 'teacher' || role === 'assistant')) {
          const rec = await getTeacherByProfileId(profile.id);
          setMyRecord(rec);
        }
      } catch (e) {
        showToast('참조 데이터 로드 실패', 'error');
      }
    }
    init();
  }, [profile?.id, role]);

  /* 세션 로드: teacher/assistant는 myRecord가 확인된 후에만 조회 */
  useEffect(() => {
    const needsRecord = role === 'teacher' || role === 'assistant';
    if (needsRecord && myRecord === null) return; // myRecord 로드 대기
    loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, myRecord, role]);

  async function loadSessions() {
    setLoading(true);
    setDbError(false);
    try {
      let data = await getClinicSessions(date);
      if (role === 'teacher' && myRecord) {
        data = data.filter(s => s.teacher_id === myRecord.id);
      } else if (role === 'assistant' && myRecord) {
        data = data.filter(s => s.assistant_id === myRecord.id);
      }
      setSessions(data);
    } catch (e) {
      if (e?.message?.includes('does not exist') || e?.code === '42P01') {
        setDbError(true);
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  /* 세션 추가 */
  async function handleAddSession() {
    const teacherId = (role === 'teacher' && myRecord) ? myRecord.id : null;
    try {
      const newSession = await createClinicSession({
        teacher_id:   teacherId,
        assistant_id: null,
        session_date: date,
      });
      setSessions(prev => [...prev, newSession]);
    } catch (e) {
      showToast('세션 추가 실패: ' + e.message, 'error');
    }
  }

  /* 세션 헤더 업데이트 */
  async function handleUpdateSession(sessionId, patch) {
    try {
      const updated = await updateClinicSession(sessionId, patch);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, ...updated } : s
      ));
    } catch (e) {
      showToast('업데이트 실패', 'error');
    }
  }

  /* 세션 삭제 */
  async function handleDeleteSession(sessionId) {
    if (!confirm('이 클리닉 세션을 삭제하시겠습니까?')) return;
    try {
      await deleteClinicSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('삭제되었습니다.');
    } catch (e) {
      showToast('삭제 실패', 'error');
    }
  }

  /* 행 추가 */
  async function handleAddItem(sessionId) {
    const session  = sessions.find(s => s.id === sessionId);
    const maxOrder = session?.clinic_items?.length ?? 0;
    try {
      const item = await createClinicItem({
        session_id:   sessionId,
        student_id:   null,
        subject:      '',
        clinic_type:  '',
        instructions: '',
        result:       '',
        sort_order:   maxOrder,
      });
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, clinic_items: [...(s.clinic_items ?? []), item] }
          : s
      ));
    } catch (e) {
      showToast('행 추가 실패: ' + e.message, 'error');
    }
  }

  /* 행 업데이트 (낙관적 업데이트) */
  async function handleUpdateItem(sessionId, itemId, patch) {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, clinic_items: s.clinic_items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
        : s
    ));
    try {
      await updateClinicItem(itemId, patch);
    } catch (e) {
      showToast('저장 실패', 'error');
      loadSessions();
    }
  }

  /* 행 삭제 */
  async function handleDeleteItem(sessionId, itemId) {
    try {
      await deleteClinicItem(itemId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, clinic_items: s.clinic_items.filter(i => i.id !== itemId) }
          : s
      ));
    } catch (e) {
      showToast('삭제 실패', 'error');
    }
  }

  const teacherList   = teachers.filter(t => t.role === 'teacher' || t.role === 'admin');
  const assistantList = teachers.filter(t => t.role === 'assistant');

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>클리닉 관리</h1>
          {isAssistant && (
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>조교 페이지</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!canEdit && (
            <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fas fa-lock" /> 지난 날짜 — {isAdmin ? '' : '원장만 수정 가능'}
            </span>
          )}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' }}
          />
          {!isAssistant && canEdit && (
            <button
              onClick={handleAddSession}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-plus" /> 세션 추가
            </button>
          )}
        </div>
      </div>

      {/* DB 오류 안내 */}
      {dbError && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          <strong>⚠ 클리닉 테이블이 아직 생성되지 않았습니다.</strong><br />
          Supabase SQL 에디터에서 아래 SQL을 실행해 주세요.<br />
          <code style={{ display: 'block', marginTop: 8, background: '#fffbeb', padding: 8, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
{`create table if not exists clinic_sessions (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references teachers(id) on delete set null,
  assistant_id uuid references teachers(id) on delete set null,
  session_date date not null default current_date,
  created_at timestamptz default now()
);
create table if not exists clinic_items (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references clinic_sessions(id) on delete cascade not null,
  student_id uuid references students(id) on delete set null,
  subject text default '',
  clinic_type text default '',
  instructions text default '',
  result text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);`}
          </code>
        </div>
      )}

      {/* 세션 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
          로딩 중...
        </div>
      ) : sessions.length === 0 && !dbError ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <i className="fas fa-stethoscope" style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
          {isAssistant ? '배정된 클리닉 세션이 없습니다.' : '세션 추가 버튼을 눌러 클리닉을 시작하세요.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sessions.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              color={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
              isAssistant={isAssistant}
              canEdit={canEdit}
              teacherList={teacherList}
              assistantList={assistantList}
              students={students}
              onUpdateSession={handleUpdateSession}
              onDeleteSession={handleDeleteSession}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   세션 카드
───────────────────────────────────────────── */
function SessionCard({
  session, color, isAssistant, canEdit,
  teacherList, assistantList, students,
  onUpdateSession, onDeleteSession, onAddItem, onUpdateItem, onDeleteItem,
}) {
  /* 조교 뷰: [조교(색)] [담당강사]  /  강사 뷰: [담당강사(색)] [조교] */
  const primaryId   = isAssistant ? session.assistant_id  : session.teacher_id;
  const secondaryId = isAssistant ? session.teacher_id    : session.assistant_id;
  const primaryList   = isAssistant ? assistantList : teacherList;
  const secondaryList = isAssistant ? teacherList   : assistantList;
  const primaryLabel   = isAssistant ? '조교'    : '담당강사';
  const secondaryLabel = isAssistant ? '담당강사' : '조교선택';
  const primaryName   = isAssistant ? session.assistant?.name : session.teacher?.name;
  const secondaryName = isAssistant ? session.teacher?.name   : session.assistant?.name;

  function setPrimary(val) {
    const field = isAssistant ? 'assistant_id' : 'teacher_id';
    onUpdateSession(session.id, { [field]: val || null });
  }
  function setSecondary(val) {
    const field = isAssistant ? 'teacher_id' : 'assistant_id';
    onUpdateSession(session.id, { [field]: val || null });
  }

  return (
    <div style={{ background: color.rowBg, border: `1.5px solid ${color.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* 세션 헤더 */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* 주체 (색상 버튼) */}
        {!isAssistant && canEdit ? (
          <select
            value={primaryId ?? ''}
            onChange={e => setPrimary(e.target.value)}
            style={colorSelectStyle(color.btnBg, color.btnText)}
          >
            <option value="">-- {primaryLabel} --</option>
            {primaryList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <div style={{ background: color.btnBg, color: color.btnText, padding: '6px 14px', borderRadius: 7, fontWeight: 700, fontSize: 14 }}>
            {primaryName ?? primaryLabel}
          </div>
        )}

        {/* 보조 (흰 버튼) */}
        {!isAssistant && canEdit ? (
          <select
            value={secondaryId ?? ''}
            onChange={e => setSecondary(e.target.value)}
            style={whiteSelectStyle()}
          >
            <option value="">-- {secondaryLabel} --</option>
            {secondaryList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <div style={{ background: '#fff', color: '#1e293b', padding: '6px 14px', borderRadius: 7, fontWeight: 600, fontSize: 14, border: '1px solid #e2e8f0' }}>
            {secondaryName ?? (secondaryLabel)}
          </div>
        )}

        {!isAssistant && canEdit && (
          <button
            onClick={() => onDeleteSession(session.id)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, padding: 4 }}
            title="세션 삭제"
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* 구분선 */}
      <div style={{ height: 2, background: color.btnBg }} />

      {/* 아이템 목록 */}
      <div style={{ padding: '14px 16px' }}>
        {(session.clinic_items ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>
            아래 행추가 버튼을 눌러 학생을 배정하세요.
          </div>
        )}

        {/* 컬럼 헤더 */}
        {(session.clinic_items ?? []).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr auto', gap: 8, marginBottom: 6, padding: '0 2px' }}>
            {['학생', '과목', '클리닉', '내용', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textAlign: 'left' }}>{h}</div>
            ))}
          </div>
        )}

        {(session.clinic_items ?? []).map(item => (
          <ItemRow
            key={item.id}
            item={item}
            color={color}
            canEdit={canEdit}
            students={students}
            onUpdate={patch => onUpdateItem(session.id, item.id, patch)}
            onDelete={() => onDeleteItem(session.id, item.id)}
          />
        ))}

        {/* 행추가 버튼 — 편집 가능할 때만 */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={() => onAddItem(session.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-plus" /> 행추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   아이템 행
───────────────────────────────────────────── */
function ItemRow({ item, color, canEdit, students, onUpdate, onDelete }) {
  // 내용이 있으면 저장된 상태로 시작, 비어 있으면 편집 모드로 시작
  const hasContent = !!(item.student_id || item.subject || item.clinic_type || item.instructions || item.result);
  const [editing, setEditing] = useState(!hasContent);
  const [saving,  setSaving]  = useState(false);

  const [studentId,  setStudentId]  = useState(item.student_id ?? '');
  const [subject,    setSubject]    = useState(item.subject ?? '');
  const [clinicType, setClinicType] = useState(item.clinic_type ?? '');
  const [memo,       setMemo]       = useState(item.instructions ?? item.result ?? '');

  // 외부에서 item이 바뀔 때 로컬 상태 동기화 (편집 중이 아닐 때만)
  useEffect(() => { if (!editing) { setStudentId(item.student_id ?? ''); }  }, [item.student_id]);
  useEffect(() => { if (!editing) { setSubject(item.subject ?? ''); }        }, [item.subject]);
  useEffect(() => { if (!editing) { setClinicType(item.clinic_type ?? ''); } }, [item.clinic_type]);
  useEffect(() => { if (!editing) { setMemo(item.instructions ?? item.result ?? ''); } }, [item.instructions, item.result]);

  const studentName = students.find(s => s.id === studentId)?.name ?? item.students?.name;

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate({
        student_id:  studentId || null,
        subject:     subject,
        clinic_type: clinicType,
        instructions: memo,
        result:       memo,   // result 필드도 동기화
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const selectSuffix = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 4px center',
    backgroundSize: '14px',
    paddingRight: 22,
    cursor: 'pointer',
  };

  const editCell = {
    border: `1px solid ${color.border}`,
    borderRadius: 6,
    padding: '6px 8px',
    background: '#fff',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    color: '#1e293b',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  // 저장된 상태: 초록 테두리 + 볼드
  const savedCell = {
    border: '1.5px solid #22c55e',
    borderRadius: 6,
    padding: '6px 8px',
    background: '#f0fdf4',
    fontSize: 13,
    fontWeight: 700,
    color: '#15803d',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
  };

  // 과거 날짜 읽기 전용 (회색)
  const lockedCell = {
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 8px',
    background: '#f8fafc',
    fontSize: 13,
    color: '#94a3b8',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
  };

  /* ── 과거 날짜: 완전 읽기 전용 ── */
  if (!canEdit) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={lockedCell}>{studentName || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
        <div style={lockedCell}>{item.subject || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
        <div style={lockedCell}>{item.clinic_type || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
        <div style={lockedCell}>{item.instructions || item.result || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
        <div style={{ width: 68 }} />
      </div>
    );
  }

  /* ── 저장된 상태 (보기 모드) ── */
  if (!editing) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={savedCell}>{studentName || <span style={{ color: '#86efac' }}>—</span>}</div>
        <div style={savedCell}>{item.subject || <span style={{ color: '#86efac' }}>—</span>}</div>
        <div style={savedCell}>{item.clinic_type || <span style={{ color: '#86efac' }}>—</span>}</div>
        <div style={savedCell}>{item.instructions || item.result || <span style={{ color: '#86efac' }}>—</span>}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => setEditing(true)}
            title="수정"
            style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer' }}
          >
            <i className="fas fa-pen" style={{ fontSize:10 }} /> 수정
          </button>
          <button
            onClick={onDelete}
            title="삭제"
            style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', background:'#fff0f0', border:'1px solid #fecaca', borderRadius:6, fontSize:12, fontWeight:600, color:'#ef4444', cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background='#fff0f0'}
          >
            <i className="fas fa-trash-alt" style={{ fontSize:10 }} /> 삭제
          </button>
        </div>
      </div>
    );
  }

  /* ── 편집 모드 ── */
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <select value={studentId} onChange={e => setStudentId(e.target.value)} style={{ ...editCell, ...selectSuffix }}>
        <option value="">학생 선택</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...editCell, ...selectSuffix }}>
        <option value="">과목</option>
        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={clinicType} onChange={e => setClinicType(e.target.value)} style={{ ...editCell, ...selectSuffix }}>
        <option value="">클리닉</option>
        {CLINIC_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="text"
        value={memo}
        placeholder="지시내용 또는 결과 입력"
        onChange={e => setMemo(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        style={editCell}
      />
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          title="저장"
          style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 10px', background:'#4361ee', border:'none', borderRadius:6, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', opacity: saving ? 0.7 : 1 }}
        >
          <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-check'} style={{ fontSize:10 }} />
          {saving ? '' : ' 저장'}
        </button>
        <button
          onClick={onDelete}
          title="삭제"
          style={{ display:'flex', alignItems:'center', gap:3, padding:'4px 8px', background:'#fff0f0', border:'1px solid #fecaca', borderRadius:6, fontSize:12, fontWeight:600, color:'#ef4444', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background='#fff0f0'}
        >
          <i className="fas fa-trash-alt" style={{ fontSize:10 }} /> 삭제
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   스타일 헬퍼
───────────────────────────────────────────── */
function colorSelectStyle(bg, text) {
  return {
    background: bg,
    color: text,
    border: 'none',
    borderRadius: 7,
    padding: '6px 28px 6px 12px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23${encodeURIComponent(text.slice(1))}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    minWidth: 100,
  };
}
function whiteSelectStyle() {
  return {
    background: '#fff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    borderRadius: 7,
    padding: '6px 28px 6px 12px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    minWidth: 100,
  };
}

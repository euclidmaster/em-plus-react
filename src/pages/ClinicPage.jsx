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

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]               = useState(today);
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
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' }}
          />
          {!isAssistant && (
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
  session, color, isAssistant,
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
        {!isAssistant ? (
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
        {!isAssistant ? (
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
            {secondaryName ?? secondaryLabel}
          </div>
        )}

        {!isAssistant && (
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr 32px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
            {['학생', '과목', '클리닉', isAssistant ? '결과 입력' : '지시내용', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textAlign: i === 4 ? 'center' : 'left' }}>{h}</div>
            ))}
          </div>
        )}

        {(session.clinic_items ?? []).map(item => (
          <ItemRow
            key={item.id}
            item={item}
            color={color}
            isAssistant={isAssistant}
            students={students}
            onUpdate={patch => onUpdateItem(session.id, item.id, patch)}
            onDelete={() => onDeleteItem(session.id, item.id)}
          />
        ))}

        {/* 행추가 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={() => onAddItem(session.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="fas fa-plus" /> 행추가
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   아이템 행
───────────────────────────────────────────── */
function ItemRow({ item, color, isAssistant, students, onUpdate, onDelete }) {
  const [instructions, setInstructions] = useState(item.instructions ?? '');
  const [result,       setResult]       = useState(item.result ?? '');

  useEffect(() => { setInstructions(item.instructions ?? ''); }, [item.instructions]);
  useEffect(() => { setResult(item.result ?? ''); },            [item.result]);

  const cellStyle = {
    border: `1px solid ${color.border}`,
    borderRadius: 6,
    padding: '6px 8px',
    background: '#fff',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    color: '#1e293b',
  };
  const readonlyCellStyle = {
    ...cellStyle,
    background: '#f8fafc',
    color: '#475569',
  };
  const selectSuffix = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 4px center',
    backgroundSize: '14px',
    paddingRight: 22,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 2fr 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      {/* 학생 */}
      {isAssistant ? (
        <div style={readonlyCellStyle}>
          {item.students?.name ?? <span style={{ color: '#cbd5e1' }}>—</span>}
        </div>
      ) : (
        <select
          value={item.student_id ?? ''}
          onChange={e => onUpdate({ student_id: e.target.value || null })}
          style={{ ...cellStyle, ...selectSuffix }}
        >
          <option value="">학생 선택</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* 과목 */}
      {isAssistant ? (
        <div style={readonlyCellStyle}>{item.subject || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
      ) : (
        <select
          value={item.subject ?? ''}
          onChange={e => onUpdate({ subject: e.target.value })}
          style={{ ...cellStyle, ...selectSuffix }}
        >
          <option value="">과목</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {/* 클리닉 유형 */}
      {isAssistant ? (
        <div style={readonlyCellStyle}>{item.clinic_type || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
      ) : (
        <select
          value={item.clinic_type ?? ''}
          onChange={e => onUpdate({ clinic_type: e.target.value })}
          style={{ ...cellStyle, ...selectSuffix }}
        >
          <option value="">클리닉</option>
          {CLINIC_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {/* 지시내용 (강사) / 결과 (조교) */}
      {isAssistant ? (
        <input
          type="text"
          value={result}
          placeholder={item.instructions ? `지시: ${item.instructions}` : '결과 입력...'}
          onChange={e => setResult(e.target.value)}
          onBlur={() => onUpdate({ result })}
          style={cellStyle}
        />
      ) : (
        <input
          type="text"
          value={instructions}
          placeholder="범위 또는 지시내용 직접 입력"
          onChange={e => setInstructions(e.target.value)}
          onBlur={() => onUpdate({ instructions })}
          style={cellStyle}
        />
      )}

      {/* 삭제 버튼 */}
      {!isAssistant ? (
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, padding: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
          title="행 삭제"
        >
          <i className="fas fa-trash-alt" />
        </button>
      ) : (
        <div />
      )}
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

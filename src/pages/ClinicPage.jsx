import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';
import {
  getTeachers, getStudents, getTeacherByProfileId,
  getClinicSessions, createClinicSession, updateClinicSession, deleteClinicSession,
  createClinicItem, createClinicItems, updateClinicItem, deleteClinicItem,
  createClinicReply, updateClinicReply, deleteClinicReply,
  getClassNames, getClinicClassTemplate, saveClinicClassTemplate,
} from '../lib/api.js';
import { todayLocal } from '../lib/dateUtil.js';

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
  const navigate = useNavigate();
  const role = profile?.role ?? 'teacher';
  const isAssistant = role === 'assistant';
  const isAdmin     = role === 'admin';

  const today = todayLocal();
  const [date, setDate]               = useState(today);
  const isFuture = date > today;
  const canEdit = true;
  const [sessions, setSessions]       = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [students, setStudents]       = useState([]);
  const [classNames, setClassNames]   = useState([]);
  const [pickedClass, setPickedClass] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [myRecord, setMyRecord]       = useState(null);
  const [myRecordLoaded, setMyRecordLoaded] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [dbError, setDbError]         = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [t, s, cn] = await Promise.all([getTeachers(), getStudents(), getClassNames().catch(() => [])]);
        setTeachers(t ?? []);
        setStudents((s ?? []).filter(st => st.status === '재원중'));
        setClassNames(cn ?? []);
        if (profile?.id && (role === 'teacher' || role === 'assistant')) {
          const rec = await getTeacherByProfileId(profile.id);
          setMyRecord(rec);
        }
        setMyRecordLoaded(true);
      } catch {
        showToast('참조 데이터 로드 실패', 'error');
      }
    }
    init();
  }, [profile?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const needsRecord = role === 'teacher' || role === 'assistant';
    if (needsRecord && !myRecordLoaded) return;
    loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, myRecordLoaded, role]);

  async function loadSessions() {
    setLoading(true);
    setDbError(false);
    try {
      let data = await getClinicSessions(date);
      if (role === 'assistant' && myRecord) {
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

  async function handleAddSession(className = null) {
    const teacherId   = (role === 'teacher'   && myRecord) ? myRecord.id : null;
    const assistantId = (role === 'assistant' && myRecord) ? myRecord.id : null;
    try {
      const newSession = await createClinicSession({
        teacher_id:   teacherId,
        assistant_id: assistantId,
        session_date: date,
        class_name:   className,
      });

      // 반 지정 시 아이템 자동 생성:
      //   1순위) 저장된 템플릿이 있으면 그 명단/과목/유형/지시사항으로
      //   2순위) 템플릿 없으면 students.class_name 기반으로 해당 반 학생 전체를 빈 행으로
      let items = [];
      let source = null;       // 'template' | 'roster' | null
      let createFailed = false; // 아이템 INSERT 자체가 실패한 경우 추적
      if (className) {
        const tmpl = await getClinicClassTemplate(className).catch(() => []);
        let rows = [];
        if (tmpl.length > 0) {
          rows = tmpl.map((t, i) => ({
            session_id:   newSession.id,
            student_id:   t.student_id,
            subject:      t.subject       ?? '',
            clinic_type:  t.clinic_type   ?? '',
            instructions: t.instructions  ?? '',
            result:       '',
            sort_order:   i,
          }));
          source = 'template';
        } else {
          const roster = students.filter(s => s.class_name === className);
          if (roster.length > 0) {
            rows = roster.map((s, i) => ({
              session_id:   newSession.id,
              student_id:   s.id,
              subject:      '',
              clinic_type:  '',
              instructions: '',
              result:       '',
              sort_order:   i,
            }));
            source = 'roster';
          }
        }
        if (rows.length > 0) {
          try {
            const created = await createClinicItems(rows);
            items = (created ?? []).map(it => ({ ...it, clinic_replies: [] }));
          } catch (e) {
            createFailed = true;
            showToast(`${className} 명단 생성 실패: ${e.message}`, 'error');
          }
        }
      }

      setSessions(prev => [...prev, { ...newSession, clinic_items: items }]);
      // 실패 토스트는 위에서 이미 띄웠으니, 성공/빈 케이스에만 안내 토스트
      if (className && !createFailed) {
        if (items.length > 0 && source === 'template') {
          showToast(`${className} 반 템플릿 명단 ${items.length}건이 자동 입력되었습니다.`);
        } else if (items.length > 0 && source === 'roster') {
          showToast(`${className} 반 학생 ${items.length}명이 추가되었습니다. 상단의 "일괄 입력"으로 공통값을 한 번에 채울 수 있습니다.`);
        } else if (source === null) {
          showToast(`${className} 반 세션이 생성되었습니다. (해당 반 학생 없음)`);
        }
      }
    } catch (e) {
      showToast('세션 추가 실패: ' + e.message, 'error');
    }
  }

  async function handleSaveTemplate(session) {
    const cn = session.class_name;
    if (!cn) { showToast('반 이름이 지정되지 않은 세션입니다.', 'error'); return; }
    const items = (session.clinic_items ?? []).filter(i => i.student_id);
    if (items.length === 0) { showToast('저장할 학생이 없습니다.', 'error'); return; }
    if (!window.confirm(`현재 명단을 "${cn}" 반 템플릿으로 저장하시겠습니까?\n(기존 템플릿은 덮어쓰기됩니다)`)) return;
    try {
      await saveClinicClassTemplate(cn, items);
      showToast(`"${cn}" 반 템플릿이 저장되었습니다. (${items.length}건)`);
    } catch (e) {
      showToast('템플릿 저장 실패: ' + e.message, 'error');
    }
  }

  async function handleUpdateSession(sessionId, patch) {
    try {
      const updated = await updateClinicSession(sessionId, patch);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, ...updated } : s
      ));
    } catch {
      showToast('업데이트 실패', 'error');
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!confirm('이 클리닉 세션을 삭제하시겠습니까?')) return;
    try {
      await deleteClinicSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('삭제되었습니다.');
    } catch {
      showToast('삭제 실패', 'error');
    }
  }

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
          ? { ...s, clinic_items: [...(s.clinic_items ?? []), { ...item, clinic_replies: [] }] }
          : s
      ));
    } catch (e) {
      showToast('행 추가 실패: ' + e.message, 'error');
    }
  }

  // 세션 내 모든 아이템에 공통값 일괄 적용
  // patch: { subject?, clinic_type?, instructions? } — 빈 문자열 값은 무시
  // overwrite=false: 해당 필드가 비어있는 행에만 적용 (기본)
  // overwrite=true : 기존 값도 덮어쓰기
  async function handleBulkApply(sessionId, patch, overwrite) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const items = session.clinic_items ?? [];
    if (items.length === 0) { showToast('적용할 학생이 없습니다.', 'error'); return; }

    const meaningful = Object.fromEntries(Object.entries(patch).filter(([, v]) => v));
    if (Object.keys(meaningful).length === 0) { showToast('적용할 값이 없습니다.', 'error'); return; }

    // 각 아이템마다 실제로 변경될 필드만 추림
    const targets = items
      .map(it => {
        const fields = {};
        Object.entries(meaningful).forEach(([k, v]) => {
          const current = it[k] ?? '';
          if (overwrite || !current) fields[k] = v;
        });
        return Object.keys(fields).length > 0 ? { id: it.id, fields } : null;
      })
      .filter(Boolean);

    if (targets.length === 0) {
      showToast('모든 행이 이미 채워져 있습니다. (덮어쓰기 옵션 사용 가능)');
      return;
    }

    try {
      await Promise.all(targets.map(t => updateClinicItem(t.id, t.fields)));
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          clinic_items: s.clinic_items.map(i => {
            const t = targets.find(x => x.id === i.id);
            return t ? { ...i, ...t.fields } : i;
          }),
        };
      }));
      showToast(`${targets.length}명에게 일괄 적용되었습니다.`);
    } catch (e) {
      showToast('일괄 적용 실패: ' + e.message, 'error');
      loadSessions();
    }
  }

  async function handleUpdateItem(sessionId, itemId, patch) {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, clinic_items: s.clinic_items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
        : s
    ));
    try {
      await updateClinicItem(itemId, patch);
    } catch {
      showToast('저장 실패', 'error');
      loadSessions();
    }
  }

  async function handleDeleteItem(sessionId, itemId) {
    try {
      await deleteClinicItem(itemId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, clinic_items: s.clinic_items.filter(i => i.id !== itemId) }
          : s
      ));
    } catch {
      showToast('삭제 실패', 'error');
    }
  }

  /* ── 보고(reply) 핸들러 ── */
  async function handleAddReply(sessionId, itemId, payload) {
    try {
      const reply = await createClinicReply(payload);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              clinic_items: s.clinic_items.map(i =>
                i.id === itemId
                  ? { ...i, clinic_replies: [...(i.clinic_replies ?? []), reply] }
                  : i
              ),
            }
          : s
      ));
    } catch (e) {
      showToast('보고 추가 실패: ' + e.message, 'error');
    }
  }

  async function handleUpdateReply(sessionId, itemId, replyId, content) {
    try {
      const updated = await updateClinicReply(replyId, content);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              clinic_items: s.clinic_items.map(i =>
                i.id === itemId
                  ? { ...i, clinic_replies: i.clinic_replies.map(r => r.id === replyId ? updated : r) }
                  : i
              ),
            }
          : s
      ));
    } catch {
      showToast('수정 실패', 'error');
    }
  }

  async function handleDeleteReply(sessionId, itemId, replyId) {
    try {
      await deleteClinicReply(replyId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              clinic_items: s.clinic_items.map(i =>
                i.id === itemId
                  ? { ...i, clinic_replies: i.clinic_replies.filter(r => r.id !== replyId) }
                  : i
              ),
            }
          : s
      ));
    } catch {
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
          {isFuture && (
            <span style={{ fontSize: 12, color: '#4361ee', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fas fa-calendar-alt" /> 미리 입력 중
            </span>
          )}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', background: '#fff' }}
          />
          {canEdit && classNames.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <select
                value={pickedClass}
                onChange={e => setPickedClass(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', minWidth: 110 }}
                title="반에서 시작"
              >
                <option value="">반에서 시작...</option>
                {classNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}
              </select>
              <button
                onClick={() => { if (!pickedClass) return; handleAddSession(pickedClass); setPickedClass(''); }}
                disabled={!pickedClass}
                style={{
                  padding: '7px 14px',
                  background: pickedClass ? '#7209b7' : '#e2e8f0',
                  color: pickedClass ? '#fff' : '#94a3b8',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: pickedClass ? 'pointer' : 'default',
                }}
              >
                <i className="fas fa-users" /> 반 추가
              </button>
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => navigate('/classes')}
              style={{
                padding: '7px 12px',
                background: '#fff',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              title="반 추가·수정·삭제 (반 관리 페이지로 이동)"
            >
              <i className="fas fa-cog" /> 반 관리
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowTemplateModal(true)}
              style={{ padding: '7px 14px', background: '#fff', color: '#7209b7', border: '1.5px solid #c4b5fd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              title="반 템플릿 관리"
            >
              <i className="fas fa-cog" /> 템플릿 관리
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => handleAddSession()}
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
);
create table if not exists clinic_replies (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references clinic_items(id) on delete cascade not null,
  author_id uuid references teachers(id) on delete set null,
  author_name text default '',
  content text default '',
  created_at timestamptz default now()
);

-- 반 템플릿 (반에서 시작 기능)
alter table clinic_sessions add column if not exists class_name text;
create table if not exists clinic_class_templates (
  id uuid default gen_random_uuid() primary key,
  class_name text not null,
  student_id uuid references students(id) on delete cascade not null,
  subject text default '',
  clinic_type text default '',
  instructions text default '',
  sort_order int default 0,
  updated_at timestamptz default now()
);
create index if not exists idx_clinic_class_templates_class_name
  on clinic_class_templates (class_name);`}
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
          세션 추가 버튼을 눌러 클리닉을 시작하세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sessions.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              color={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
              isAssistant={isAssistant}
              isAdmin={isAdmin}
              canEdit={canEdit}
              teacherList={teacherList}
              assistantList={assistantList}
              students={students}
              myRecord={myRecord}
              classNames={classNames}
              onUpdateSession={handleUpdateSession}
              onDeleteSession={handleDeleteSession}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onBulkApply={(patch, overwrite) => handleBulkApply(session.id, patch, overwrite)}
              onAddReply={(itemId, payload) => handleAddReply(session.id, itemId, payload)}
              onUpdateReply={(itemId, replyId, content) => handleUpdateReply(session.id, itemId, replyId, content)}
              onDeleteReply={(itemId, replyId) => handleDeleteReply(session.id, itemId, replyId)}
              onSaveTemplate={() => handleSaveTemplate(session)}
            />
          ))}
        </div>
      )}

      {showTemplateModal && (
        <ClassTemplateModal
          classNames={classNames}
          students={students}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   세션 카드
───────────────────────────────────────────── */
function SessionCard({
  session, color, isAssistant, isAdmin, canEdit,
  teacherList, assistantList, students, myRecord, classNames,
  onUpdateSession, onDeleteSession, onAddItem, onUpdateItem, onDeleteItem,
  onAddReply, onUpdateReply, onDeleteReply, onSaveTemplate, onBulkApply,
}) {
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
        {canEdit ? (
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

        {canEdit ? (
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

        {canEdit ? (
          <select
            value={session.class_name ?? ''}
            onChange={e => onUpdateSession(session.id, { class_name: e.target.value || null })}
            style={{
              padding: '5px 10px',
              border: '1.5px solid #c4b5fd',
              borderRadius: 20,
              background: session.class_name ? '#f3e8ff' : '#fff',
              color: session.class_name ? '#7209b7' : '#94a3b8',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
            title="반 지정/변경"
          >
            <option value="">반 미지정</option>
            {classNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}
            {session.class_name && !classNames.includes(session.class_name) && (
              <option value={session.class_name}>{session.class_name}</option>
            )}
          </select>
        ) : session.class_name && (
          <span style={{
            background: '#f3e8ff', color: '#7209b7',
            padding: '4px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="fas fa-users" style={{ fontSize: 10 }} /> {session.class_name}
          </span>
        )}

        {canEdit && session.class_name && (
          <button
            onClick={onSaveTemplate}
            style={{
              marginLeft: 'auto',
              padding: '5px 12px', background: '#fff', color: '#7209b7',
              border: '1.5px solid #c4b5fd', borderRadius: 7,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
            title={`현재 명단을 "${session.class_name}" 반 템플릿으로 저장`}
          >
            <i className="fas fa-save" /> 명단 저장
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => onDeleteSession(session.id)}
            style={{ marginLeft: session.class_name ? 0 : 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, padding: 4 }}
            title="세션 삭제"
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      <div style={{ height: 2, background: color.btnBg }} />

      {/* 일괄 입력 바: 행이 2개 이상일 때만 노출 (단일 행은 굳이 일괄이 필요 없음) */}
      {canEdit && !isAssistant && (session.clinic_items ?? []).length >= 2 && (
        <BulkApplyBar onApply={onBulkApply} color={color} />
      )}

      {/* 아이템 목록 */}
      <div style={{ padding: '14px 16px' }}>
        {(session.clinic_items ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>
            아래 행추가 버튼을 눌러 학생을 배정하세요.
          </div>
        )}

        {/* 컬럼 헤더 */}
        {(session.clinic_items ?? []).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 1.4fr auto', gap: 8, marginBottom: 6, padding: '0 2px' }}>
            {['학생', '과목', '클리닉', '지시내용', '결과', ''].map((h, i) => (
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
            isAssistant={isAssistant}
            isAdmin={isAdmin}
            students={students}
            myRecord={myRecord}
            onUpdate={patch => onUpdateItem(session.id, item.id, patch)}
            onDelete={() => onDeleteItem(session.id, item.id)}
            onAddReply={payload => onAddReply(item.id, payload)}
            onUpdateReply={(replyId, content) => onUpdateReply(item.id, replyId, content)}
            onDeleteReply={replyId => onDeleteReply(item.id, replyId)}
          />
        ))}

        {/* 행추가 */}
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
function ItemRow({ item, color, canEdit, isAssistant, isAdmin, students, myRecord, onUpdate, onDelete, onAddReply, onUpdateReply, onDeleteReply }) {
  const replies = item.clinic_replies ?? [];
  const canAddReply = (isAssistant || isAdmin) && canEdit;

  const hasContent = !!(item.student_id || item.subject || item.clinic_type || item.instructions || item.result);
  const [editing, setEditing] = useState(!hasContent);
  const [saving,  setSaving]  = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const [studentId,  setStudentId]  = useState(item.student_id ?? '');
  const [subject,    setSubject]    = useState(item.subject ?? '');
  const [clinicType, setClinicType] = useState(item.clinic_type ?? '');
  const [memo,       setMemo]       = useState(item.instructions ?? '');
  const [result,     setResult]     = useState(item.result ?? '');

  useEffect(() => { if (!editing) setStudentId(item.student_id ?? '');  }, [item.student_id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setSubject(item.subject ?? '');        }, [item.subject]);    // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setClinicType(item.clinic_type ?? ''); }, [item.clinic_type]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setMemo(item.instructions ?? '');      }, [item.instructions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setResult(item.result ?? '');          }, [item.result]);       // eslint-disable-line react-hooks/exhaustive-deps

  const studentName = students.find(s => s.id === studentId)?.name ?? item.students?.name;

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate({
        student_id:   studentId || null,
        subject,
        clinic_type:  clinicType,
        instructions: memo,
        result,
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

  const replySection = (
    (replies.length > 0 || showReplyInput) && (
      <div style={{
        marginLeft: 8, marginTop: 4, marginBottom: 4,
        paddingLeft: 12, borderLeft: '3px solid #c7d2fe',
      }}>
        {replies.map(reply => (
          <ReplyRow
            key={reply.id}
            reply={reply}
            canEdit={canEdit && (isAdmin || reply.author_id === myRecord?.id)}
            onUpdate={content => onUpdateReply(reply.id, content)}
            onDelete={() => onDeleteReply(reply.id)}
          />
        ))}
        {showReplyInput && (
          <ReplyInput
            myRecord={myRecord}
            onSave={content => {
              onAddReply({
                item_id:     item.id,
                author_id:   myRecord?.id ?? null,
                author_name: myRecord?.name ?? '조교',
                content,
              });
              setShowReplyInput(false);
            }}
            onCancel={() => setShowReplyInput(false)}
          />
        )}
      </div>
    )
  );

  /* ── 과거 날짜: 읽기 전용 ── */
  if (!canEdit) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
          <div style={lockedCell}>{studentName || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
          <div style={lockedCell}>{item.subject || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
          <div style={lockedCell}>{item.clinic_type || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
          <div style={lockedCell}>{item.instructions || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
          <div style={lockedCell}>{item.result || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
          <div style={{ width: 68 }} />
        </div>
        {replies.length > 0 && (
          <div style={{ marginLeft: 8, marginTop: 4, paddingLeft: 12, borderLeft: '3px solid #c7d2fe' }}>
            {replies.map(reply => (
              <ReplyRow key={reply.id} reply={reply} canEdit={false} onUpdate={() => {}} onDelete={() => {}} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── 저장된 상태 (보기 모드) ── */
  if (!editing) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
          <div style={savedCell}>{studentName || <span style={{ color: '#86efac' }}>—</span>}</div>
          <div style={savedCell}>{item.subject || <span style={{ color: '#86efac' }}>—</span>}</div>
          <div style={savedCell}>{item.clinic_type || <span style={{ color: '#86efac' }}>—</span>}</div>
          <div style={savedCell}>{item.instructions || <span style={{ color: '#86efac' }}>—</span>}</div>
          <div style={item.result ? savedCell : { ...savedCell, color: '#cbd5e1', fontStyle: 'italic', fontWeight: 500 }}>{item.result || '결과 미입력'}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <>
              <button
                onClick={() => setEditing(true)}
                style={btnStyle('#f1f5f9', '#475569', '#e2e8f0')}
              >
                <i className="fas fa-pen" style={{ fontSize: 10 }} /> 수정
              </button>
              <button
                onClick={onDelete}
                style={btnStyle('#fff0f0', '#ef4444', '#fecaca')}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff0f0'}
              >
                <i className="fas fa-trash-alt" style={{ fontSize: 10 }} /> 삭제
              </button>
            </>
            {canAddReply && !showReplyInput && (
              <button
                onClick={() => setShowReplyInput(true)}
                style={btnStyle('#eff6ff', '#4361ee', '#bfdbfe')}
              >
                <i className="fas fa-comment-dots" style={{ fontSize: 10 }} /> 보고
              </button>
            )}
          </div>
        </div>
        {replySection}
      </div>
    );
  }

  /* ── 편집 모드 (강사/원장만 진입 가능) ── */
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
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
          placeholder="지시내용 입력"
          onChange={e => setMemo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          style={editCell}
        />
        <input
          type="text"
          value={result}
          placeholder="결과 입력 (선택)"
          onChange={e => setResult(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          style={editCell}
        />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#4361ee', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-check'} style={{ fontSize: 10 }} />
            {saving ? '' : ' 저장'}
          </button>
          <button
            onClick={onDelete}
            style={btnStyle('#fff0f0', '#ef4444', '#fecaca')}
            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff0f0'}
          >
            <i className="fas fa-trash-alt" style={{ fontSize: 10 }} /> 삭제
          </button>
        </div>
      </div>
      {replySection}
    </div>
  );
}

/* ─────────────────────────────────────────────
   보고 행 (댓글 표시)
───────────────────────────────────────────── */
function ReplyRow({ reply, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(reply.content);

  const dateStr = reply.created_at
    ? new Date(reply.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : '';

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 0' }}>
        <i className="fas fa-comment-dots" style={{ color: '#4361ee', fontSize: 12 }} />
        <input
          autoFocus
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && content.trim()) { onUpdate(content.trim()); setEditing(false); }
            if (e.key === 'Escape') { setContent(reply.content); setEditing(false); }
          }}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #4361ee', borderRadius: 6, fontSize: 13, outline: 'none' }}
        />
        <button
          onClick={() => { if (content.trim()) { onUpdate(content.trim()); setEditing(false); } }}
          style={{ padding: '3px 10px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >저장</button>
        <button
          onClick={() => { setContent(reply.content); setEditing(false); }}
          style={{ padding: '3px 8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
        >취소</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
      <i className="fas fa-comment-dots" style={{ color: '#4361ee', fontSize: 12, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, color: '#4361ee', whiteSpace: 'nowrap' }}>{reply.author_name}</span>
      <span style={{ color: '#1e293b', flex: 1 }}>{reply.content}</span>
      <span style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{dateStr}</span>
      {canEdit && (
        <>
          <button
            onClick={() => setEditing(true)}
            style={{ padding: '2px 7px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}
          >수정</button>
          <button
            onClick={onDelete}
            style={{ padding: '2px 7px', background: '#fff0f0', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}
          >삭제</button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   보고 입력창
───────────────────────────────────────────── */
function ReplyInput({ myRecord, onSave, onCancel }) {
  const [content, setContent] = useState('');

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 0' }}>
      <i className="fas fa-comment-dots" style={{ color: '#4361ee', fontSize: 12, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#4361ee', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {myRecord?.name ?? '조교'}:
      </span>
      <input
        autoFocus
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="결과보고 입력 후 Enter"
        onKeyDown={e => {
          if (e.key === 'Enter' && content.trim()) onSave(content.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{ flex: 1, padding: '4px 8px', border: '1px solid #4361ee', borderRadius: 6, fontSize: 13, outline: 'none' }}
      />
      <button
        onClick={() => { if (content.trim()) onSave(content.trim()); }}
        style={{ padding: '3px 10px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >저장</button>
      <button
        onClick={onCancel}
        style={{ padding: '3px 8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
      >취소</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   일괄 입력 바 (공통값을 세션 내 모든 행에 한 번에 적용)
───────────────────────────────────────────── */
function BulkApplyBar({ onApply, color }) {
  const [subject, setSubject]           = useState('');
  const [clinicType, setClinicType]     = useState('');
  const [instructions, setInstructions] = useState('');
  const [overwrite, setOverwrite]       = useState(false);
  const [open, setOpen]                 = useState(false);

  const hasValue = !!(subject || clinicType || instructions);

  function reset() {
    setSubject(''); setClinicType(''); setInstructions('');
  }

  async function handleApply() {
    if (!hasValue) return;
    await onApply({ subject, clinic_type: clinicType, instructions }, overwrite);
    reset();
  }

  if (!open) {
    return (
      <div style={{ padding: '8px 16px', background: '#fff', borderBottom: `1px solid ${color.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            background: '#f3e8ff', color: '#7209b7',
            border: '1px dashed #c4b5fd', borderRadius: 7,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
          title="공통값을 모든 학생에게 한 번에 적용"
        >
          <i className="fas fa-bolt" /> 일괄 입력 열기
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          반 전체에 같은 과목/클리닉/지시내용을 한 번에 입력
        </span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px 16px', background: '#faf5ff',
      borderBottom: `1px solid ${color.border}`,
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#7209b7', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="fas fa-bolt" /> 일괄 입력
      </span>
      <select value={subject} onChange={e => setSubject(e.target.value)} style={bulkInputStyle}>
        <option value="">과목</option>
        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={clinicType} onChange={e => setClinicType(e.target.value)} style={bulkInputStyle}>
        <option value="">클리닉</option>
        {CLINIC_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="text"
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
        placeholder="지시내용 (선택)"
        style={{ ...bulkInputStyle, flex: '1 1 200px', minWidth: 160 }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
        기존값 덮어쓰기
      </label>
      <button
        onClick={handleApply}
        disabled={!hasValue}
        style={{
          padding: '6px 14px',
          background: hasValue ? '#7209b7' : '#e2e8f0',
          color: hasValue ? '#fff' : '#94a3b8',
          border: 'none', borderRadius: 7,
          fontSize: 12, fontWeight: 700,
          cursor: hasValue ? 'pointer' : 'default',
          whiteSpace: 'nowrap',
        }}
      >
        전체 적용
      </button>
      <button
        onClick={() => { reset(); setOpen(false); }}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 }}
        title="닫기"
      >
        <i className="fas fa-times" />
      </button>
    </div>
  );
}

const bulkInputStyle = {
  padding: '5px 8px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  background: '#fff',
  color: '#1e293b',
  outline: 'none',
  fontFamily: 'inherit',
  minWidth: 80,
};

/* ─────────────────────────────────────────────
   스타일 헬퍼
───────────────────────────────────────────── */
function btnStyle(bg, color, borderColor) {
  return {
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '4px 8px',
    background: bg, border: `1px solid ${borderColor}`,
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    color, cursor: 'pointer',
  };
}
function colorSelectStyle(bg, text) {
  return {
    background: bg, color: text,
    border: 'none', borderRadius: 7,
    padding: '6px 28px 6px 12px',
    fontWeight: 700, fontSize: 14,
    cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23${encodeURIComponent(text.slice(1))}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    backgroundSize: '16px', minWidth: 100,
  };
}
function whiteSelectStyle() {
  return {
    background: '#fff', color: '#1e293b',
    border: '1px solid #e2e8f0', borderRadius: 7,
    padding: '6px 28px 6px 12px',
    fontWeight: 600, fontSize: 14,
    cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    backgroundSize: '16px', minWidth: 100,
  };
}

/* ─────────────────────────────────────────────
   반 템플릿 관리 모달
───────────────────────────────────────────── */
function ClassTemplateModal({ classNames, students, onClose }) {
  const showToast = useToast();
  const [selectedClass, setSelectedClass] = useState(classNames[0] ?? '');
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    if (!selectedClass) { setItems([]); setDirty(false); return; }
    setLoading(true);
    getClinicClassTemplate(selectedClass)
      .then(rows => setItems(rows.map((r, i) => ({
        _cid:         `loaded-${i}-${r.student_id}`,
        student_id:   r.student_id,
        subject:      r.subject       ?? '',
        clinic_type:  r.clinic_type   ?? '',
        instructions: r.instructions  ?? '',
      }))))
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setDirty(false); });
  }, [selectedClass]);

  function switchClass(cn) {
    if (cn === selectedClass) return;
    if (dirty && !window.confirm('저장하지 않은 변경사항이 있습니다.\n다른 반으로 이동하시겠습니까? (변경사항은 사라집니다)')) return;
    setSelectedClass(cn);
  }

  function handleClose() {
    if (dirty && !window.confirm('저장하지 않은 변경사항이 있습니다.\n닫으시겠습니까?')) return;
    onClose();
  }

  function addRow() {
    setItems(prev => [...prev, { _cid: `new-${Date.now()}-${Math.random()}`, student_id: '', subject: '', clinic_type: '', instructions: '' }]);
    setDirty(true);
  }
  function updateRow(idx, key, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
    setDirty(true);
  }
  function removeRow(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }
  async function save() {
    if (!selectedClass) return;
    const valid = items.filter(it => it.student_id);
    setSaving(true);
    try {
      await saveClinicClassTemplate(selectedClass, valid);
      showToast(`"${selectedClass}" 템플릿 저장 (${valid.length}건)`);
      setDirty(false);
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // 해당 반에 속한 학생만 선택지로 (없으면 전체 학생)
  const classStudents = students.filter(s => s.class_name === selectedClass);
  const studentOptions = classStudents.length > 0 ? classStudents : students;

  return (
    <Modal
      title={<><i className="fas fa-cog"></i> 반 템플릿 관리{dirty && <span style={{ marginLeft: 8, fontSize: 12, color: '#f59e0b' }}>● 변경됨</span>}</>}
      onClose={handleClose}
      width={760}
    >
      {classNames.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40, margin: 0 }}>
          반(class_name)이 지정된 학생이 없습니다.<br />학생 정보에서 반을 먼저 지정해주세요.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, minHeight: 360 }}>
          {/* 좌측: 반 목록 */}
          <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.04em' }}>반 목록</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {classNames.map(cn => (
                <button
                  key={cn}
                  onClick={() => switchClass(cn)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    background: selectedClass === cn ? '#f3e8ff' : '#fff',
                    color: selectedClass === cn ? '#7209b7' : '#475569',
                    border: '1.5px solid ' + (selectedClass === cn ? '#c4b5fd' : '#e2e8f0'),
                    borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {cn}
                </button>
              ))}
            </div>
          </div>

          {/* 우측: 항목 편집 */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {selectedClass} <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>· {items.length}건</span>
              </span>
              <button onClick={addRow} style={{ padding: '5px 12px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-plus" /> 행 추가
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>로딩 중...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                  저장된 템플릿이 없습니다. "행 추가"로 학생을 등록하세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* 컬럼 헤더 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 28px', gap: 6, fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '0 2px' }}>
                    <span>학생</span><span>과목</span><span>클리닉</span><span>지시사항</span><span/>
                  </div>
                  {items.map((it, idx) => (
                    <div key={it._cid ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1.4fr 28px', gap: 6, alignItems: 'center' }}>
                      <select value={it.student_id} onChange={e => updateRow(idx, 'student_id', e.target.value)} style={tmplCell}>
                        <option value="">학생 선택</option>
                        {studentOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.class_name && s.class_name !== selectedClass ? ` (${s.class_name})` : ''}</option>
                        ))}
                      </select>
                      <select value={it.subject} onChange={e => updateRow(idx, 'subject', e.target.value)} style={tmplCell}>
                        <option value="">-</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={it.clinic_type} onChange={e => updateRow(idx, 'clinic_type', e.target.value)} style={tmplCell}>
                        <option value="">-</option>
                        {CLINIC_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        type="text"
                        value={it.instructions}
                        onChange={e => updateRow(idx, 'instructions', e.target.value)}
                        placeholder="지시사항"
                        style={tmplCell}
                      />
                      <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
        <button onClick={handleClose} style={{ padding: '8px 18px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>닫기</button>
        {classNames.length > 0 && (
          <button
            onClick={save}
            disabled={saving || !selectedClass}
            style={{ padding: '8px 18px', background: saving ? '#cbd5e1' : '#4361ee', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <i className="fas fa-save" /> {saving ? '저장 중...' : '저장'}
          </button>
        )}
      </div>
    </Modal>
  );
}

const tmplCell = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6,
  fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit',
};

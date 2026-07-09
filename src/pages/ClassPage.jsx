import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getClasses, createClass, updateClass, deleteClass,
  getClassStudents, addStudentToClass, removeStudentFromClass,
  getTeachers, getStudents,
} from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import Modal from '../components/common/Modal.jsx';

const SUBJECTS = ['', '국어', '수학', '영어', '과학', '사회', '한국사', '기타'];
const GRADES   = ['', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const GRADE_ORDER = { '초5':1, '초6':2, '중1':3, '중2':4, '중3':5, '고1':6, '고2':7, '고3':8 };

const SORT_OPTIONS = [
  { value: 'name',     label: '이름순' },
  { value: 'grade',    label: '학년순' },
  { value: 'teacher',  label: '담당강사순' },
  { value: 'students', label: '학생수 많은순' },
  { value: 'recent',   label: '최근 생성순' },
];

const VIEW_MODES = [
  { value: 'card',   icon: 'fa-th-large', label: '카드',   title: '카드 보기 — 시각적 카드 그리드' },
  { value: 'list',   icon: 'fa-list',     label: '목록',   title: '목록 보기 — 한 줄에 모든 정보, 정렬 가능' },
  { value: 'folder', icon: 'fa-folder',   label: '폴더',   title: '폴더 보기 — 학년/강사별 그룹, 접기·펼치기' },
];
const VIEW_MODE_KEY = 'classPage:viewMode';
const FOLDER_GROUPBY_KEY = 'classPage:folderGroupBy';

const EMPTY_FORM = {
  name: '', description: '', day_of_week: '',
  start_time: '', teacher_id: '', subject: '', grade: '',
};

export default function ClassPage() {
  const { profile } = useAuth();
  const showToast = useToast();
  const role = profile?.role ?? 'teacher';
  const isAdmin = role === 'admin';

  const [classes, setClasses]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [students, setStudents]   = useState([]); // 전체 재원중 학생
  const [loading, setLoading]     = useState(true);
  const [myTeacherIds, setMyTeacherIds] = useState(new Set());

  // 모달 상태
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = 신규
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  // 학생 관리 모달
  const [studentMgrFor, setStudentMgrFor] = useState(null); // class 객체

  // 검색/정렬/필터
  const [searchQ, setSearchQ]         = useState('');
  const [sortBy,  setSortBy]          = useState('name');
  const [gradeFilter,   setGradeFilter]   = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  // 뷰 모드 (localStorage 영속화)
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_MODE_KEY) || 'card'; }
    catch { return 'card'; }
  });
  const [folderGroupBy, setFolderGroupBy] = useState(() => {
    try { return localStorage.getItem(FOLDER_GROUPBY_KEY) || 'grade'; }
    catch { return 'grade'; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ } }, [viewMode]);
  useEffect(() => { try { localStorage.setItem(FOLDER_GROUPBY_KEY, folderGroupBy); } catch { /* ignore */ } }, [folderGroupBy]);

  // 폴더 모드: 그룹별 펼침/접힘 (기본은 전부 펼침)
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  function toggleGroup(key) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const [cls, tch, stu] = await Promise.all([
        getClasses(),
        getTeachers(),
        getStudents(),
      ]);
      setClasses(cls);
      setTeachers(tch);
      setStudents(stu.filter(s => s.status === '재원중'));

      // 내가 담당한 teachers 레코드 id 집합 (teacher일 때 수정/삭제 가능 판단용)
      if (profile?.id) {
        const mine = (tch ?? []).filter(t => t.profile_id === profile.id).map(t => t.id);
        setMyTeacherIds(new Set(mine));
      }
    } catch (e) {
      showToast('반 목록 로드 실패: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function canModify(cls) {
    if (isAdmin) return true;
    return cls.teacher_id && myTeacherIds.has(cls.teacher_id);
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }
  function openEdit(cls) {
    setEditTarget(cls);
    setForm({
      name:        cls.name ?? '',
      description: cls.description ?? '',
      day_of_week: cls.day_of_week ?? '',
      start_time:  cls.start_time?.slice(0, 5) ?? '',
      teacher_id:  cls.teacher_id ?? '',
      subject:     cls.subject ?? '',
      grade:       cls.grade ?? '',
    });
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    if (saving) return;
    if (!form.name.trim()) { showToast('반 이름을 입력하세요.', 'error'); return; }
    const payload = {
      name:        form.name.trim(),
      description: form.description,
      day_of_week: form.day_of_week,
      start_time:  form.start_time || null,
      teacher_id:  form.teacher_id || null,
      subject:     form.subject,
      grade:       form.grade,
    };
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateClass(editTarget.id, payload);
        setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
        showToast('수정되었습니다.');
      } else {
        const created = await createClass({ ...payload, created_by: profile?.id ?? null });
        setClasses(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
        showToast(`"${created.name}" 반이 생성되었습니다.`);
      }
      closeForm();
    } catch (e) { showToast('저장 실패: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function remove(cls) {
    if (!window.confirm(`"${cls.name}" 반을 삭제하시겠습니까?\n반에 속한 학생 연결은 해제되지만 학생 데이터는 보존됩니다.`)) return;
    try {
      await deleteClass(cls.id);
      setClasses(prev => prev.filter(c => c.id !== cls.id));
      showToast('삭제되었습니다.');
    } catch (e) { showToast('삭제 실패: ' + e.message, 'error'); }
  }

  // 필터·검색·정렬 적용
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    let list = classes.filter(c => {
      if (gradeFilter && c.grade !== gradeFilter) return false;
      if (teacherFilter === 'null') {
        if (c.teacher_id != null) return false;
      } else if (teacherFilter && c.teacher_id !== teacherFilter) return false;
      if (q) {
        const hay = `${c.name} ${c.subject ?? ''} ${c.day_of_week ?? ''} ${c.teachers?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'grade': {
          const ga = GRADE_ORDER[a.grade] ?? 99;
          const gb = GRADE_ORDER[b.grade] ?? 99;
          if (ga !== gb) return ga - gb;
          return a.name.localeCompare(b.name, 'ko');
        }
        case 'teacher': {
          const ta = a.teachers?.name ?? '￿'; // 미배정은 마지막
          const tb = b.teachers?.name ?? '￿';
          const cmp = ta.localeCompare(tb, 'ko');
          if (cmp !== 0) return cmp;
          return a.name.localeCompare(b.name, 'ko');
        }
        case 'students': return (b.student_count ?? 0) - (a.student_count ?? 0);
        case 'recent':   return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        case 'name':
        default:         return a.name.localeCompare(b.name, 'ko');
      }
    });

    return list;
  }, [classes, searchQ, sortBy, gradeFilter, teacherFilter]);

  const gradeChoices = useMemo(() => {
    const s = new Set(classes.map(c => c.grade).filter(Boolean));
    return [...s].sort((a, b) => (GRADE_ORDER[a] ?? 99) - (GRADE_ORDER[b] ?? 99));
  }, [classes]);

  return (
    <div>
      <div className="section-title-area">
        <h2><i className="fas fa-users-rectangle"></i> 반 관리</h2>
        <p className="section-desc">학생들이 수업을 듣는 반을 생성·관리합니다. 학생은 여러 반에 동시 소속될 수 있습니다.</p>
      </div>

      {/* 검색·정렬·필터 바 */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="반 이름·과목·요일·강사 검색..."
              style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={ctrl} title="정렬">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={ctrl} title="학년 필터">
            <option value="">전체 학년</option>
            {gradeChoices.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} style={ctrl} title="담당강사 필터">
            <option value="">전체 강사</option>
            <option value="null">미배정만</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {(searchQ || gradeFilter || teacherFilter || sortBy !== 'name') && (
            <button
              onClick={() => { setSearchQ(''); setSortBy('name'); setGradeFilter(''); setTeacherFilter(''); }}
              style={{ padding: '8px 14px', background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
            >
              초기화
            </button>
          )}

          {/* 뷰 모드 토글 */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {VIEW_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setViewMode(m.value)}
                title={m.title}
                style={{
                  padding: '7px 12px',
                  background: viewMode === m.value ? '#4361ee' : '#fff',
                  color: viewMode === m.value ? '#fff' : '#64748b',
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                  borderRight: '1px solid #e2e8f0',
                }}
              >
                <i className={`fas ${m.icon}`} /> {m.label}
              </button>
            ))}
          </div>
          {viewMode === 'folder' && (
            <select
              value={folderGroupBy}
              onChange={e => setFolderGroupBy(e.target.value)}
              style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer' }}
              title="폴더 그룹 기준"
            >
              <option value="grade">학년별</option>
              <option value="teacher">강사별</option>
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          {filtered.length !== classes.length
            ? <>전체 {classes.length}개 중 <strong style={{ color: '#1e293b' }}>{filtered.length}</strong>개 표시</>
            : <>전체 <strong style={{ color: '#1e293b' }}>{classes.length}</strong>개 반</>}
        </span>
        <button onClick={openAdd} className="btn-primary">
          <i className="fas fa-plus"></i> 반 생성
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>로딩 중...</div>
      ) : classes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <i className="fas fa-users-rectangle" style={{ fontSize: 32, marginBottom: 10, display: 'block', opacity: 0.4 }} />
          등록된 반이 없습니다. "반 생성" 버튼을 눌러 시작하세요.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <i className="fas fa-filter" style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.4 }} />
          조건에 맞는 반이 없습니다.
        </div>
      ) : viewMode === 'list' ? (
        <ClassListView
          items={filtered}
          canModifyFn={canModify}
          onEdit={openEdit}
          onDelete={remove}
          onManageStudents={setStudentMgrFor}
        />
      ) : viewMode === 'folder' ? (
        <ClassFolderView
          items={filtered}
          groupBy={folderGroupBy}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          canModifyFn={canModify}
          onEdit={openEdit}
          onDelete={remove}
          onManageStudents={setStudentMgrFor}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(cls => (
            <ClassCard
              key={cls.id}
              cls={cls}
              canModify={canModify(cls)}
              onEdit={() => openEdit(cls)}
              onDelete={() => remove(cls)}
              onManageStudents={() => setStudentMgrFor(cls)}
            />
          ))}
        </div>
      )}

      {/* 반 생성/수정 모달 */}
      {showForm && (
        <Modal
          title={<><i className={`fas fa-${editTarget ? 'edit' : 'plus'}`}></i> {editTarget ? '반 수정' : '반 생성'}</>}
          onClose={closeForm}
          width={520}
        >
          <ClassForm form={form} setForm={setForm} teachers={teachers} />
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={closeForm} style={btnCancel}>취소</button>
            <button onClick={save} disabled={saving} style={{ ...btnSave, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              <i className="fas fa-save"></i> {saving ? '저장 중...' : (editTarget ? '수정' : '생성')}
            </button>
          </div>
        </Modal>
      )}

      {/* 반 학생 관리 모달 */}
      {studentMgrFor && (
        <StudentManageModal
          cls={studentMgrFor}
          allStudents={students}
          onClose={() => setStudentMgrFor(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   반 카드
───────────────────────────────────────────── */
function ClassCard({ cls, canModify, onEdit, onDelete, onManageStudents }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #eef2ff 0%, #f3e8ff 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b', flex: 1, wordBreak: 'break-word' }}>
            {cls.name}
          </h3>
          {canModify && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onEdit} title="수정"
                style={{ background: 'none', border: 'none', color: '#4361ee', cursor: 'pointer', padding: 4, fontSize: 13 }}>
                <i className="fas fa-edit"></i>
              </button>
              <button onClick={onDelete} title="삭제"
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, fontSize: 13 }}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {cls.subject && <Chip color="#4361ee">{cls.subject}</Chip>}
          {cls.grade   && <Chip color="#7209b7">{cls.grade}</Chip>}
          {cls.day_of_week && <Chip color="#16a34a"><i className="fas fa-calendar-day" style={{ fontSize: 9, marginRight: 3 }} />{cls.day_of_week}</Chip>}
          {cls.start_time && <Chip color="#f59e0b"><i className="fas fa-clock" style={{ fontSize: 9, marginRight: 3 }} />{cls.start_time.slice(0, 5)}</Chip>}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            <i className="fas fa-chalkboard-teacher" style={{ marginRight: 4 }} />
            담당: {cls.teachers?.name ?? '미배정'}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: cls.student_count > 0 ? '#4361ee' : '#94a3b8',
            background: cls.student_count > 0 ? '#eef2ff' : '#f1f5f9',
            padding: '2px 8px', borderRadius: 20, flexShrink: 0,
          }}>
            <i className="fas fa-user-graduate" style={{ marginRight: 3, fontSize: 9 }} />
            {cls.student_count ?? 0}명
          </span>
        </div>
        {cls.description && (
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 12px', lineHeight: 1.5 }}>
            {cls.description}
          </p>
        )}
        <button
          onClick={onManageStudents}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#f1f5f9',
            color: '#475569',
            border: '1.5px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <i className="fas fa-users" /> 학생 관리
        </button>
      </div>
    </div>
  );
}

function Chip({ color, children }) {
  return (
    <span style={{
      padding: '3px 9px',
      background: color + '18',
      color,
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
    }}>{children}</span>
  );
}

/* ─────────────────────────────────────────────
   반 생성/수정 폼
───────────────────────────────────────────── */
function ClassForm({ form, setForm, teachers }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label style={lbl}>반 이름 *</label>
        <input type="text" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="예: 고1-김선생, 고1 (선생님은 나중에 지정 가능)"
          style={inp} autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>학년 (대상)</label>
          <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} style={inp}>
            {GRADES.map(g => <option key={g} value={g}>{g || '— 선택 —'}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>과목</label>
          <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={inp}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s || '— 선택 —'}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>요일</label>
          <input type="text" value={form.day_of_week}
            onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
            placeholder="예: 화목, 월수금" style={inp} />
        </div>
        <div>
          <label style={lbl}>시작 시간</label>
          <input type="time" value={form.start_time}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
            style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>담당 강사</label>
        <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))} style={inp}>
          <option value="">— 미배정 —</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.title ? ` (${t.title})` : ''}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>설명</label>
        <textarea value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="반 설명 (선택)" rows={2}
          style={{ ...inp, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   반 학생 관리 모달
───────────────────────────────────────────── */
function StudentManageModal({ cls, allStudents, onClose }) {
  const showToast = useToast();
  const [members, setMembers] = useState([]); // student_classes 행들
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [memberSort, setMemberSort] = useState('name'); // name | grade | recent

  useEffect(() => {
    getClassStudents(cls.id)
      .then(setMembers)
      .catch(e => showToast('학생 로드 실패: ' + e.message, 'error'))
      .finally(() => setLoading(false));
  }, [cls.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberStudentIds = useMemo(
    () => new Set(members.map(m => m.student_id)),
    [members]
  );

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      switch (memberSort) {
        case 'grade': {
          const ga = GRADE_ORDER[a.students?.grade] ?? 99;
          const gb = GRADE_ORDER[b.students?.grade] ?? 99;
          if (ga !== gb) return ga - gb;
          return (a.students?.name ?? '').localeCompare(b.students?.name ?? '', 'ko');
        }
        case 'recent': return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        case 'name':
        default: return (a.students?.name ?? '').localeCompare(b.students?.name ?? '', 'ko');
      }
    });
  }, [members, memberSort]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStudents
      .filter(s => !memberStudentIds.has(s.id))
      .filter(s => !q
        || s.name.toLowerCase().includes(q)
        || (s.class_name ?? '').toLowerCase().includes(q)
        || (s.grade ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        // 학년순 → 이름순 (검색 결과를 일관되게)
        const ga = GRADE_ORDER[a.grade] ?? 99;
        const gb = GRADE_ORDER[b.grade] ?? 99;
        if (ga !== gb) return ga - gb;
        return a.name.localeCompare(b.name, 'ko');
      })
      .slice(0, 60);
  }, [allStudents, memberStudentIds, query]);

  const addingRef = useRef(new Set()); // 추가 진행 중인 student_id — 연타로 인한 중복 삽입 방지
  async function handleAdd(student) {
    if (memberStudentIds.has(student.id) || addingRef.current.has(student.id)) return;
    addingRef.current.add(student.id);
    try {
      const row = await addStudentToClass(student.id, cls.id);
      // member 목록에는 students join이 없는 형태로 들어와서 보강
      setMembers(prev => [...prev, {
        id: row.id,
        student_id: student.id,
        students: { id: student.id, name: student.name, grade: student.grade, class_name: student.class_name, status: student.status, phone: student.phone },
      }]);
    } catch (e) { showToast('추가 실패: ' + e.message, 'error'); }
    finally { addingRef.current.delete(student.id); }
  }
  async function handleRemove(linkId) {
    try {
      await removeStudentFromClass(linkId);
      setMembers(prev => prev.filter(m => m.id !== linkId));
    } catch (e) { showToast('제거 실패: ' + e.message, 'error'); }
  }

  return (
    <Modal
      title={<><i className="fas fa-users"></i> {cls.name} 학생 관리</>}
      onClose={onClose}
      width={720}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 360 }}>
        {/* 좌측: 현재 멤버 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7209b7', letterSpacing: '0.04em' }}>
              현재 소속 학생 ({members.length}명)
            </span>
            {members.length > 1 && (
              <select
                value={memberSort}
                onChange={e => setMemberSort(e.target.value)}
                style={{ padding: '3px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', color: '#64748b' }}
                title="정렬"
              >
                <option value="name">이름순</option>
                <option value="grade">학년순</option>
                <option value="recent">최근 추가순</option>
              </select>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360, border: '1px solid #f1f5f9', borderRadius: 8, padding: 6 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>로딩 중...</div>
            ) : sortedMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>아직 학생이 없습니다.</div>
            ) : (
              sortedMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {m.students?.name ?? '?'}
                  </span>
                  {m.students?.grade && (
                    <span style={{ fontSize: 11, color: '#7209b7', background: '#f3e8ff', padding: '1px 6px', borderRadius: 10 }}>
                      {m.students.grade}
                    </span>
                  )}
                  <button onClick={() => handleRemove(m.id)} title="제거"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 학생 추가 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4361ee', marginBottom: 8, letterSpacing: '0.04em' }}>
            학생 추가
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름·학년·기존 반 검색..."
            style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, border: '1px solid #f1f5f9', borderRadius: 8, padding: 6 }}>
            {candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>
                {query ? '검색 결과가 없습니다.' : '추가 가능한 학생이 없습니다.'}
              </div>
            ) : (
              candidates.map(s => (
                <div key={s.id}
                  onClick={() => handleAdd(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fas fa-plus" style={{ color: '#4361ee', fontSize: 11 }}></i>
                  <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{s.name}</span>
                  {s.grade && <span style={{ fontSize: 11, color: '#64748b' }}>{s.grade}</span>}
                  {s.class_name && <span style={{ fontSize: 11, color: '#94a3b8' }}>· {s.class_name}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
        <button onClick={onClose} style={btnCancel}>닫기</button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   목록(테이블) 뷰
───────────────────────────────────────────── */
function ClassListView({ items, canModifyFn, onEdit, onDelete, onManageStudents }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
              <th style={thStyle}>반 이름</th>
              <th style={thStyle}>학년</th>
              <th style={thStyle}>과목</th>
              <th style={thStyle}>담당 강사</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>학생수</th>
              <th style={thStyle}>요일</th>
              <th style={thStyle}>시작</th>
              <th style={thStyle}>설명</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map(cls => {
              const can = canModifyFn(cls);
              return (
                <tr key={cls.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>{cls.name}</td>
                  <td style={tdStyle}>
                    {cls.grade && <span style={chipStyle('#7209b7')}>{cls.grade}</span>}
                  </td>
                  <td style={tdStyle}>
                    {cls.subject && <span style={chipStyle('#4361ee')}>{cls.subject}</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: cls.teachers?.name ? '#1e293b' : '#94a3b8' }}>
                      {cls.teachers?.name ?? '미배정'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: cls.student_count > 0 ? '#4361ee' : '#94a3b8',
                      background: cls.student_count > 0 ? '#eef2ff' : '#f1f5f9',
                      padding: '2px 10px', borderRadius: 20,
                    }}>{cls.student_count ?? 0}명</span>
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{cls.day_of_week || '—'}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>
                    {cls.start_time ? cls.start_time.slice(0, 5) : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cls.description || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button onClick={() => onManageStudents(cls)} style={listBtn('#eef2ff', '#4361ee')} title="학생 관리">
                      <i className="fas fa-users" />
                    </button>
                    {can && (
                      <>
                        <button onClick={() => onEdit(cls)} style={listBtn('#f1f5f9', '#475569')} title="수정">
                          <i className="fas fa-edit" />
                        </button>
                        <button onClick={() => onDelete(cls)} style={listBtn('#fef2f2', '#ef4444')} title="삭제">
                          <i className="fas fa-trash" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };
function chipStyle(color) {
  return { padding: '2px 8px', background: color + '18', color, borderRadius: 12, fontSize: 11, fontWeight: 700 };
}
function listBtn(bg, color) {
  return {
    background: bg, color, border: 'none', padding: '6px 9px',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, marginLeft: 4,
  };
}

/* ─────────────────────────────────────────────
   폴더 뷰 (학년별 / 강사별 그룹 + 접기·펼치기)
───────────────────────────────────────────── */
function ClassFolderView({ items, groupBy, collapsedGroups, onToggleGroup, canModifyFn, onEdit, onDelete, onManageStudents }) {
  // 그룹핑
  const groups = (() => {
    const map = new Map();
    items.forEach(cls => {
      const key = groupBy === 'teacher'
        ? (cls.teachers?.name ?? '__unassigned__')
        : (cls.grade || '__nograde__');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(cls);
    });
    return map;
  })();

  // 정렬: 학년은 GRADE_ORDER, 강사는 가나다순. 미배정·미지정은 마지막.
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === '__unassigned__' || a === '__nograde__') return 1;
    if (b === '__unassigned__' || b === '__nograde__') return -1;
    if (groupBy === 'grade') {
      return (GRADE_ORDER[a] ?? 99) - (GRADE_ORDER[b] ?? 99);
    }
    return a.localeCompare(b, 'ko');
  });

  function labelFor(key) {
    if (key === '__unassigned__') return '담당 미배정';
    if (key === '__nograde__')    return '학년 미지정';
    return key;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sortedKeys.map(key => {
        const classes = groups.get(key);
        const collapsed = collapsedGroups.has(key);
        const totalStudents = classes.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
        const isUnassigned = key === '__unassigned__' || key === '__nograde__';

        return (
          <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => onToggleGroup(key)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: isUnassigned ? '#f8fafc' : 'linear-gradient(135deg, #eef2ff 0%, #f3e8ff 100%)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left',
              }}
            >
              <i className={`fas ${collapsed ? 'fa-folder' : 'fa-folder-open'}`} style={{ color: isUnassigned ? '#94a3b8' : '#7209b7', fontSize: 16 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: isUnassigned ? '#64748b' : '#1e293b' }}>
                {labelFor(key)}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', background: '#fff', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                반 {classes.length}개
              </span>
              <span style={{ fontSize: 11, color: '#4361ee', background: '#eef2ff', padding: '2px 10px', borderRadius: 12, fontWeight: 700 }}>
                학생 {totalStudents}명
              </span>
              <i className={`fas fa-chevron-${collapsed ? 'right' : 'down'}`} style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }} />
            </button>

            {!collapsed && (
              <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {classes.map(cls => {
                  const can = canModifyFn(cls);
                  return (
                    <div key={cls.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr auto auto auto 1fr auto',
                      gap: 10, alignItems: 'center',
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid #f1f5f9',
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{cls.name}</span>
                      {cls.subject ? <span style={chipStyle('#4361ee')}>{cls.subject}</span> : <span />}
                      {cls.grade ? <span style={chipStyle('#7209b7')}>{cls.grade}</span> : <span />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: cls.student_count > 0 ? '#4361ee' : '#94a3b8' }}>
                        <i className="fas fa-user-graduate" style={{ marginRight: 3, fontSize: 10 }} />
                        {cls.student_count ?? 0}명
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {[cls.day_of_week, cls.start_time?.slice(0, 5)].filter(Boolean).join(' · ') || '—'}
                      </span>
                      <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => onManageStudents(cls)} style={listBtn('#eef2ff', '#4361ee')} title="학생 관리">
                          <i className="fas fa-users" />
                        </button>
                        {can && (
                          <>
                            <button onClick={() => onEdit(cls)} style={listBtn('#f1f5f9', '#475569')} title="수정">
                              <i className="fas fa-edit" />
                            </button>
                            <button onClick={() => onDelete(cls)} style={listBtn('#fef2f2', '#ef4444')} title="삭제">
                              <i className="fas fa-trash" />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 };
const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const ctrl = { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', minWidth: 130 };
const btnCancel = { padding: '9px 18px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 };
const btnSave   = { padding: '9px 18px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };

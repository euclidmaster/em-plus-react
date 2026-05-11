import { useState, useRef, useEffect } from 'react';

const GRADE_TABS = ['전체', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

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
  if (GRADE_TABS.includes(grade)) return grade;
  return '기타';
}

export default function StudentSelect({ students = [], value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [gradeTab, setGradeTab]   = useState('전체');
  const [classFilter, setClassFilter] = useState('전체');
  const containerRef              = useRef(null);
  const inputRef                  = useRef(null);

  const selected = students.find(s => String(s.id) === String(value));

  // 학년 탭에 따른 반 목록
  const availableClasses = (() => {
    const base = gradeTab === '전체' ? students : students.filter(s => normalizeGrade(s.grade) === gradeTab);
    const classes = [...new Set(base.map(s => s.class_name).filter(Boolean))].sort();
    return classes;
  })();

  // 최종 필터링
  const filtered = students.filter(s => {
    if (gradeTab !== '전체' && normalizeGrade(s.grade) !== gradeTab) return false;
    if (classFilter !== '전체' && s.class_name !== classFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.grade ?? '').toLowerCase().includes(q) ||
        (s.class_name ?? '').toLowerCase().includes(q) ||
        (s.school_name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(student) {
    onChange(String(student.id));
    setOpen(false);
    setQuery('');
  }

  function handleGradeTab(g) {
    setGradeTab(g);
    setClassFilter('전체');
  }

  const gradeColor = (g) => {
    if (['초5','초6'].includes(g)) return { bg: '#dcfce7', color: '#166534', active: '#16a34a' };
    if (['중1','중2','중3'].includes(g)) return { bg: '#dbeafe', color: '#1d4ed8', active: '#1d4ed8' };
    if (['고1','고2','고3'].includes(g)) return { bg: '#fef9c3', color: '#92400e', active: '#d97706' };
    return { bg: '#f1f5f9', color: '#475569', active: '#4361ee' };
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 220 }}>
      {/* 선택 버튼 */}
      <button
        type="button"
        onClick={open ? () => { setOpen(false); setQuery(''); } : handleOpen}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1.5px solid ' + (open ? '#4361ee' : '#e2e8f0'),
          borderRadius: 8,
          background: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          color: selected ? '#1e293b' : '#94a3b8',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(67,97,238,0.12)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-user" style={{ color: '#4361ee', fontSize: 12 }}></i>
          {selected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong>{selected.name}</strong>
              {selected.grade && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: selected.grade.includes('고') ? '#fef9c3' : '#dbeafe',
                  color: selected.grade.includes('고') ? '#92400e' : '#1d4ed8',
                }}>{normalizeGrade(selected.grade)}</span>
              )}
              {selected.class_name && (
                <span style={{ fontSize: 11, color: '#7209b7', fontWeight: 600 }}>{selected.class_name}</span>
              )}
            </span>
          ) : '학생을 선택하세요'}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#94a3b8' }}></i>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 9999,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden',
          width: 320,
        }}>
          {/* 검색창 */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="이름, 반, 학교 검색..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* 학년 탭 */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {GRADE_TABS.map(g => {
              const active = gradeTab === g;
              const c = gradeColor(g);
              const count = g === '전체' ? students.length : students.filter(s => normalizeGrade(s.grade) === g).length;
              if (g !== '전체' && count === 0) return null;
              return (
                <button key={g} type="button" onClick={() => handleGradeTab(g)} style={{
                  padding: '3px 9px', borderRadius: 14, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: active ? (g === '전체' ? '#4361ee' : c.active) : (g === '전체' ? '#f1f5f9' : c.bg),
                  color: active ? '#fff' : (g === '전체' ? '#475569' : c.color),
                  transition: 'all 0.1s',
                }}>
                  {g} <span style={{ fontWeight: 400, fontSize: 11 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* 반 필터 */}
          {availableClasses.length > 0 && (
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setClassFilter('전체')} style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: '1px solid ' + (classFilter === '전체' ? '#7209b7' : '#e2e8f0'),
                background: classFilter === '전체' ? '#7209b7' : '#fff',
                color: classFilter === '전체' ? '#fff' : '#64748b',
              }}>전체</button>
              {availableClasses.map(c => {
                const active = classFilter === c;
                const base = gradeTab === '전체' ? students : students.filter(s => normalizeGrade(s.grade) === gradeTab);
                const count = base.filter(s => s.class_name === c).length;
                return (
                  <button key={c} type="button" onClick={() => setClassFilter(c)} style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + (active ? '#7209b7' : '#e2e8f0'),
                    background: active ? '#7209b7' : '#fff',
                    color: active ? '#fff' : '#64748b',
                  }}>{c} <span style={{ fontWeight: 400 }}>{count}</span></button>
                );
              })}
            </div>
          )}

          {/* 학생 목록 */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                <i className="fas fa-search" style={{ marginRight: 6 }}></i>
                검색 결과가 없습니다.
              </div>
            ) : (
              filtered.map(s => {
                const isSelected = String(s.id) === String(value);
                const ng = normalizeGrade(s.grade);
                const isHigh = ['고1','고2','고3'].includes(ng);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      border: 'none',
                      background: isSelected ? '#f0f4ff' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: isSelected ? '#4361ee' : '#e8ecff',
                        color: isSelected ? '#fff' : '#4361ee',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {s.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {s.grade && (
                            <span style={{
                              padding: '1px 5px', borderRadius: 8, fontWeight: 700,
                              background: isHigh ? '#fef9c3' : '#dbeafe',
                              color: isHigh ? '#92400e' : '#1d4ed8',
                            }}>{ng}</span>
                          )}
                          {s.class_name && <span style={{ color: '#7209b7', fontWeight: 600 }}>{s.class_name}</span>}
                          {s.school_name && <span>{s.school_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                        background: s.status === '재원중' ? '#dcfce7' : '#fee2e2',
                        color: s.status === '재원중' ? '#16a34a' : '#dc2626',
                      }}>{s.status ?? '재원중'}</span>
                      {isSelected && <i className="fas fa-check" style={{ color: '#4361ee', fontSize: 11 }}></i>}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 하단 카운트 */}
          <div style={{ padding: '7px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {gradeTab !== '전체' && <span style={{ color: '#4361ee', fontWeight: 600 }}>{gradeTab} · </span>}
              {classFilter !== '전체' && <span style={{ color: '#7209b7', fontWeight: 600 }}>{classFilter} · </span>}
              {filtered.length}명 표시
            </span>
            <span>전체 {students.length}명</span>
          </div>
        </div>
      )}
    </div>
  );
}

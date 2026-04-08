import { useState, useRef, useEffect } from 'react';

export default function StudentSelect({ students = [], value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const containerRef        = useRef(null);
  const inputRef            = useRef(null);

  const selected = students.find(s => String(s.id) === String(value));

  const filtered = students.filter(s => {
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.grade ?? '').toLowerCase().includes(q) ||
      (s.school_name ?? '').toLowerCase().includes(q)
    );
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

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 200 }}>
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
          {selected
            ? <span><strong>{selected.name}</strong>{selected.grade ? <span style={{ marginLeft: 6, fontSize: 12, color: '#64748b' }}>{selected.grade}</span> : null}</span>
            : '학생을 선택하세요'}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#94a3b8' }}></i>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          minWidth: 240,
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
                placeholder="이름, 학년, 학교 검색..."
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

          {/* 학생 목록 */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                검색 결과가 없습니다.
              </div>
            ) : (
              filtered.map(s => {
                const isSelected = String(s.id) === String(value);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {[s.grade, s.school_name].filter(Boolean).join(' · ') || '정보 없음'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                        background: s.status === '재원중' ? '#dcfce7' : '#fee2e2',
                        color: s.status === '재원중' ? '#16a34a' : '#dc2626',
                      }}>
                        {s.status ?? '재원중'}
                      </span>
                      {isSelected && <i className="fas fa-check" style={{ color: '#4361ee', fontSize: 11 }}></i>}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 하단 카운트 */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
            {filtered.length}명 / 전체 {students.length}명
          </div>
        </div>
      )}
    </div>
  );
}

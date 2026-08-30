import { useState, useMemo } from 'react';
import Modal from './Modal.jsx';

const GRADE_ORDER = ['초등', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '기타'];

// 반 이름에서 선생님 라벨 추출: "학년-과목-선생님(요일)" → "선생님"
function teacherOf(label) {
  const noPar = (label || '').replace(/\(.*?\)/g, '').trim();
  const parts = noPar.split('-');
  return parts.length >= 3 ? parts[parts.length - 1].trim() : '';
}

// 반 이름/학년값을 학년 그룹으로 분류
function gradeBucket(grade) {
  const g = (grade || '').replace(/\s/g, '');
  if (!g) return '기타';
  if (g.includes('초등') && !/\d/.test(g)) return '초등';
  if (g.includes('초') && g.includes('5')) return '초5';
  if (g.includes('초') && g.includes('6')) return '초6';
  if (g.includes('중') && g.includes('1')) return '중1';
  if (g.includes('중') && g.includes('2')) return '중2';
  if (g.includes('중') && g.includes('3')) return '중3';
  if (g.includes('고') && g.includes('1')) return '고1';
  if (g.includes('고') && g.includes('2')) return '고2';
  if (g.includes('고') && g.includes('3')) return '고3';
  if (GRADE_ORDER.includes(g)) return g;
  return '기타';
}

/**
 * items: [{ key, label, grade }]
 * onPick(key): key로 선택 (allowAll이면 '전체' 선택 시 null 전달)
 */
export default function ClassPickerModal({ items, currentKey = null, onPick, onClose, title = '반 선택', allowAll = false, allLabel = '전체 보기', zIndex = 1000 }) {
  const [q, setQ] = useState('');
  const [teacherFilter, setTeacherFilter] = useState(null);

  const teacherList = useMemo(() => {
    const set = new Set();
    items.forEach(it => { const t = teacherOf(it.label); if (t) set.add(t); });
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [items]);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    let filtered = items;
    if (query) filtered = filtered.filter(it => it.label.toLowerCase().includes(query));
    if (teacherFilter) filtered = filtered.filter(it => teacherOf(it.label) === teacherFilter);
    const m = {};
    filtered.forEach(it => { const b = gradeBucket(it.grade); (m[b] ??= []).push(it); });
    return GRADE_ORDER.filter(g => m[g]).map(g => [g, m[g].sort((a, b) => a.label.localeCompare(b.label, 'ko'))]);
  }, [items, q, teacherFilter]);

  const totalShown = groups.reduce((n, [, l]) => n + l.length, 0);

  return (
    <Modal title={title} onClose={onClose} width={560} zIndex={zIndex}>
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="반 이름 검색..."
          style={{ width: '100%', padding: '10px 14px 10px 34px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {teacherList.length > 1 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
          <button onClick={() => setTeacherFilter(null)} style={teacherChip(teacherFilter == null)}>
            <i className="fas fa-user-friends" style={{ fontSize: 10, marginRight: 4 }} />전체 선생님
          </button>
          {teacherList.map(t => (
            <button key={t} onClick={() => setTeacherFilter(teacherFilter === t ? null : t)} style={teacherChip(teacherFilter === t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxHeight: '48vh', overflowY: 'auto', marginTop: 10 }}>
        {allowAll && !q.trim() && (
          <button onClick={() => onPick(null)} style={pickBtn(currentKey == null)}>
            <i className="fas fa-list" style={{ marginRight: 6, fontSize: 11 }} />{allLabel}
          </button>
        )}

        {totalShown === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13 }}>검색 결과가 없습니다.</div>
        ) : (
          groups.map(([g, list]) => (
            <div key={g} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#94a3b8', margin: '4px 0 7px' }}>
                {g} <span style={{ color: '#cbd5e1' }}>· {list.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {list.map(it => (
                  <button key={it.key} onClick={() => onPick(it.key)} style={pickBtn(it.key === currentKey)}>
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

function teacherChip(active) {
  return {
    padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1.5px solid ' + (active ? '#4361ee' : '#e2e8f0'),
    background: active ? '#4361ee' : '#f8fafc',
    color: active ? '#fff' : '#64748b',
  };
}

function pickBtn(active) {
  return {
    padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: '1.5px solid ' + (active ? '#7209b7' : '#e2e8f0'),
    background: active ? '#7209b7' : '#fff',
    color: active ? '#fff' : '#475569',
    marginBottom: 6,
  };
}

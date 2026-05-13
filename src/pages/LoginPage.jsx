import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { getClassNames } from '../lib/api.js';

export default function LoginPage() {
  const [mode, setMode]   = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('student');
  // 학생 추가 정보
  const [grade, setGrade]           = useState('');
  const [className, setClassName]   = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phone, setPhone]           = useState('');
  const [subjects, setSubjects]     = useState([]);
  const [branch, setBranch]         = useState('');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [customClassMode, setCustomClassMode] = useState(false);

  const { signIn } = useAuth();
  const navigate   = useNavigate();

  // 회원가입 + 학생 역할일 때 학원 반 목록 페치 (실패 시 직접 입력 모드)
  useEffect(() => {
    if (mode !== 'signup' || role !== 'student') return;
    getClassNames()
      .then(opts => setClassOptions(opts ?? []))
      .catch(() => setClassOptions([]));
  }, [mode, role]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!email || !pw) { setError('이메일과 비밀번호를 입력하세요.'); return; }
    setLoading(true);
    try {
      await signIn(email, pw);
      navigate('/');
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name || !email || !pw) { setError('모든 항목을 입력하세요.'); return; }
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (!branch) { setError('수업 지점을 선택하세요.'); return; }
    if (role === 'student' && subjects.length === 0) { setError('수강 과목을 최소 1개 선택하세요.'); return; }
    setLoading(true);
    try {
      const studentInfo = role === 'student'
        ? { grade, class_name: className, school_name: schoolName, phone, subjects, branch }
        : { branch };
      const { data, error: err } = await supabase.auth.signUp({
        email, password: pw,
        options: { data: { name, role, studentInfo } }
      });
      if (err) throw err;

      if (data.session) {
        navigate('/');
      } else {
        setSuccess('가입 완료! 이메일 인증 후 로그인하세요.');
        setMode('login');
        setName(''); setEmail(''); setPw(''); setRole('student');
        setGrade(''); setClassName(''); setSchoolName(''); setPhone(''); setSubjects([]); setBranch('');
        setCustomClassMode(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      fontFamily:"'Noto Sans KR', sans-serif",
      background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'#fff', borderRadius:20, padding:'48px 40px',
        width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)'
      }}>
        {/* 로고 */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <img
            src="/logo.png"
            alt="EM플러스학원"
            style={{ width:180, height:180, objectFit:'contain', display:'block', margin:'0 auto' }}
          />
          <p style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>학습관리 시스템</p>
        </div>

        {/* 탭 */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{
                flex:1, padding:10, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit',
                background: mode===m ? '#667eea' : '#fff',
                border: mode===m ? '1.5px solid #667eea' : '1.5px solid #e2e8f0',
                color: mode===m ? '#fff' : '#64748b',
              }}>
              {m==='login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 로그인 폼 */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display:'grid', gap:18 }}>
            <Field label="이메일" icon="fa-envelope">
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="이메일 입력" style={inputStyle} />
            </Field>
            <Field label="비밀번호" icon="fa-lock">
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
                placeholder="비밀번호 입력" style={inputStyle} />
            </Field>
            {error   && <ErrorMsg   msg={error} />}
            {success && <SuccessMsg msg={success} />}
            <button type="submit" disabled={loading} style={btnStyle}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'}`}></i>{' '}
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} style={{ display:'grid', gap:18 }}>
            <Field label="이름" icon="fa-user">
              <input type="text" value={name} onChange={e=>setName(e.target.value)}
                placeholder="이름 입력" style={inputStyle} />
            </Field>
            <Field label="이메일" icon="fa-envelope">
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="이메일 입력" style={inputStyle} />
            </Field>
            <Field label="비밀번호" icon="fa-lock">
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
                placeholder="비밀번호 (6자 이상)" style={inputStyle} />
            </Field>

            {/* 역할 선택 — 원장 제외 */}
            <Field label="역할" icon="fa-id-badge">
              <select value={role} onChange={e=>setRole(e.target.value)} style={inputStyle}>
                <option value="student">학생</option>
                <option value="teacher">강사</option>
                <option value="assistant">조교</option>
              </select>
            </Field>

            {/* 지점 선택 — 모든 역할 공통 */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight:6 }}></i>수업 지점 <span style={{ color:'#ef4444' }}>*</span>
              </label>
              <div style={{ display:'flex', gap:8 }}>
                {['스카이뷰점','정자점'].map(b => {
                  const selected = branch === b;
                  return (
                    <button key={b} type="button" onClick={() => setBranch(b)} style={{
                      flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
                      fontSize:13, fontWeight:600, fontFamily:'inherit',
                      border: selected ? '1.5px solid #667eea' : '1.5px solid #e2e8f0',
                      background: selected ? '#667eea' : '#f8fafc',
                      color: selected ? '#fff' : '#64748b',
                      transition:'all .15s',
                    }}>
                      {selected && <i className="fas fa-check" style={{ marginRight:5, fontSize:11 }}></i>}
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 학생일 때만: 학생 정보 직접 입력 */}
            {role === 'student' && (
              <>
                <Field label="학년" icon="fa-graduation-cap">
                  <select value={grade} onChange={e=>setGrade(e.target.value)} style={inputStyle}>
                    <option value="">선택 (선택사항)</option>
                    {['초5','초6','중1','중2','중3','고1','고2','고3'].map(g=>(
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="반" icon="fa-chalkboard">
                  {classOptions.length > 0 && !customClassMode ? (
                    <select
                      value={className}
                      onChange={e => {
                        if (e.target.value === '__OTHER__') { setCustomClassMode(true); }
                        else setClassName(e.target.value);
                      }}
                      style={inputStyle}
                    >
                      <option value="">선택 안 함 (선택사항)</option>
                      {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      {/* 직접 입력 후 목록 모드로 돌아온 경우: 사용자 입력값 보존 */}
                      {className && !classOptions.includes(className) && (
                        <option value={className}>{className} (직접 입력)</option>
                      )}
                      <option value="__OTHER__">목록에 없음 (직접 입력)</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={className}
                        onChange={e => setClassName(e.target.value)}
                        placeholder="예: 수학심화반 (선택사항)"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {classOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomClassMode(false)}
                          style={{ padding: '0 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          title="목록에서 선택"
                        >
                          목록
                        </button>
                      )}
                    </div>
                  )}
                </Field>
                <Field label="학교" icon="fa-school">
                  <input type="text" value={schoolName} onChange={e=>setSchoolName(e.target.value)}
                    placeholder="학교명 (선택사항)" style={inputStyle} />
                </Field>
                <Field label="연락처" icon="fa-phone">
                  <input type="text" value={phone} onChange={e=>setPhone(e.target.value)}
                    placeholder="연락처 (선택사항)" style={inputStyle} />
                </Field>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }}>
                    <i className="fas fa-book" style={{ marginRight:6 }}></i>수강 과목 <span style={{ color:'#ef4444' }}>*</span>
                    <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>(중복 선택 가능)</span>
                  </label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {['국어','영어','수학','과학','기타'].map(s => {
                      const checked = subjects.includes(s);
                      return (
                        <label key={s} style={{
                          display:'flex', alignItems:'center', gap:6,
                          padding:'8px 14px', borderRadius:20, cursor:'pointer',
                          fontSize:13, fontWeight:600, userSelect:'none',
                          border: checked ? '1.5px solid #667eea' : '1.5px solid #e2e8f0',
                          background: checked ? '#eef2ff' : '#f8fafc',
                          color: checked ? '#667eea' : '#64748b',
                          transition:'all .15s',
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSubjects(prev =>
                              checked ? prev.filter(x => x !== s) : [...prev, s]
                            )}
                            style={{ display:'none' }}
                          />
                          {checked && <i className="fas fa-check" style={{ fontSize:11 }}></i>}
                          {s}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {error   && <ErrorMsg   msg={error} />}
            {success && <SuccessMsg msg={success} />}
            <button type="submit" disabled={loading} style={btnStyle}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i>{' '}
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>
        <i className={`fas ${icon}`} style={{ marginRight:6 }}></i>{label}
      </label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }) {
  return <div style={{ background:'#fee2e2', color:'#dc2626', padding:'10px 14px', borderRadius:8, fontSize:13 }}>{msg}</div>;
}
function SuccessMsg({ msg }) {
  return <div style={{ background:'#dcfce7', color:'#16a34a', padding:'10px 14px', borderRadius:8, fontSize:13 }}>{msg}</div>;
}

const inputStyle = {
  width:'100%', padding:'12px 16px', border:'1.5px solid #e2e8f0', borderRadius:10,
  fontSize:14, fontFamily:"'Noto Sans KR', sans-serif", color:'#1e293b', outline:'none',
  boxSizing:'border-box',
};
const btnStyle = {
  width:'100%', padding:14, background:'linear-gradient(135deg,#667eea,#764ba2)',
  color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:600,
  fontFamily:"'Noto Sans KR', sans-serif", cursor:'pointer',
};

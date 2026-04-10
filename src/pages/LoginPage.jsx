import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function LoginPage() {
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [name, setName]       = useState('');
  const [role, setRole]       = useState('student');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate   = useNavigate();

  // 회원가입 모드 + 학생 역할일 때 학생 목록 로드
  useEffect(() => {
    if (mode === 'signup' && role === 'student') {
      supabase.from('students').select('id, name, grade, class_name').eq('status', '재원중').order('name')
        .then(({ data }) => {
          setStudents(data ?? []);
          setStudentId('');
        })
        .catch(console.error);
    } else {
      setStudents([]);
      setStudentId('');
    }
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
    if (role === 'student' && !studentId) { setError('본인의 학생 정보를 선택하세요.'); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password: pw,
        options: { data: { name, role, studentId: role === 'student' ? studentId : null } }
      });
      if (err) throw err;

      // 이메일 인증 OFF인 경우 → 세션이 바로 생성됨 → 자동 이동
      if (data.session) {
        navigate('/');
      } else {
        // 이메일 인증 ON인 경우 → 인증 메일 안내
        setSuccess('가입 완료! 이메일 인증 후 로그인하세요.');
        setMode('login');
        setName(''); setEmail(''); setPw(''); setRole('student'); setStudentId('');
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
          <div style={{
            width:60, height:60, background:'linear-gradient(135deg,#667eea,#764ba2)',
            borderRadius:16, display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:26, color:'#fff', marginBottom:12
          }}>
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b' }}>
            EM<span style={{ color:'#667eea' }}>+</span>학원
          </h1>
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

            {/* 학생일 때만: 본인 학생 선택 */}
            {role === 'student' && (
              <Field label="나의 학생 정보 선택" icon="fa-user-graduate">
                <select value={studentId} onChange={e=>setStudentId(e.target.value)} style={inputStyle}>
                  <option value="">-- 선택하세요 --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.grade ? ` (${s.grade}${s.class_name ? ' · ' + s.class_name : ''})` : ''}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>
                    등록된 재원생이 없습니다. 원장 선생님께 학생 등록을 요청하세요.
                  </p>
                )}
              </Field>
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

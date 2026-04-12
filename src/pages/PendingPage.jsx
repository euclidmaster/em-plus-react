import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function PendingPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel = { student:'학생', teacher:'강사', assistant:'조교' }[profile?.role] ?? profile?.role;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div style={{
      fontFamily:"'Noto Sans KR', sans-serif",
      background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        background:'#fff', borderRadius:20, padding:'48px 40px',
        width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
        textAlign:'center',
      }}>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background:'linear-gradient(135deg,#f59e0b,#d97706)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          fontSize:30, color:'#fff', marginBottom:20,
        }}>
          <i className="fas fa-clock"></i>
        </div>

        <h2 style={{ fontSize:20, fontWeight:700, color:'#1e293b', marginBottom:8 }}>
          승인 대기 중
        </h2>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, marginBottom:24 }}>
          <strong style={{ color:'#1e293b' }}>{profile?.name}</strong>님 ({roleLabel}) 가입이 완료되었습니다.<br/>
          원장 선생님의 승인 후 이용 가능합니다.
        </p>

        <div style={{
          background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:10,
          padding:'14px 16px', marginBottom:28, textAlign:'left',
        }}>
          <div style={{ fontSize:13, color:'#92400e', fontWeight:600, marginBottom:6 }}>
            <i className="fas fa-info-circle" style={{ marginRight:6 }}></i>승인 절차 안내
          </div>
          <ul style={{ fontSize:12, color:'#78350f', margin:0, paddingLeft:18, lineHeight:1.9 }}>
            <li>원장 선생님께 가입 사실을 알려주세요.</li>
            <li>승인 완료 후 다시 로그인하면 이용 가능합니다.</li>
          </ul>
        </div>

        <button onClick={handleSignOut} style={{
          width:'100%', padding:13,
          background:'linear-gradient(135deg,#667eea,#764ba2)',
          color:'#fff', border:'none', borderRadius:10,
          fontSize:14, fontWeight:600, cursor:'pointer',
          fontFamily:"'Noto Sans KR', sans-serif",
        }}>
          <i className="fas fa-sign-out-alt" style={{ marginRight:6 }}></i>로그아웃
        </button>
      </div>
    </div>
  );
}

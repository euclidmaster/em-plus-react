import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0f4ff' }}>
        <div style={{ textAlign:'center' }}>
          <i className="fas fa-graduation-cap" style={{ fontSize:40, color:'#4361ee', marginBottom:12, display:'block' }}></i>
          <p style={{ color:'#64748b' }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

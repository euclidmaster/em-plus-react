export default function Modal({ title, onClose, children, width = 480, zIndex = 1000 }) {
  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex, display:'flex', alignItems:'center', justifyContent:'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:16, padding:32, width, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <h3 style={{ marginBottom:20, fontSize:17, fontWeight:700, color:'#1e293b' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

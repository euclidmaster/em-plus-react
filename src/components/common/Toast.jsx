import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:'12px 20px',
            borderRadius:10,
            background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: t.type === 'error' ? '#dc2626' : '#16a34a',
            boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
            fontSize:14,
            fontWeight:500,
            animation:'slideIn 0.2s ease',
          }}>
            <i className={`fas ${t.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight:8 }}></i>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

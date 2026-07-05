import React, { useState } from 'react';

import { useAppContext } from '../context/AppContext';

const Login: React.FC = () => {
  const { login } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    const errMsg = login(username.trim(), password);
    if (errMsg) {
      setError(errMsg);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh', position: 'relative' }}>
      {/* Background Flag (f1.jpg) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(/f1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08, zIndex: 0 }}></div>
      
      {/* Background Eagle (f.jpg) centered so only the eagle shows */}
      <div style={{ position: 'absolute', top: '10%', left: 0, right: 0, bottom: '10%', backgroundImage: 'url(/f.jpg)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.15, zIndex: 0, mixBlendMode: 'screen' }}></div>

      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%', textAlign: 'center', zIndex: 1, position: 'relative' }}>
        <div style={{ marginBottom: '2rem' }}>
          <img src="/f.jpg" alt="Syrian Eagle" style={{ height: '90px', width: 'auto', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.4))', borderRadius: '50%', objectFit: 'cover', aspectRatio: '1/1' }} />
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>نظام الشراكة المالية</h1>
          <p style={{ color: 'var(--text-secondary)' }}>الرجاء إدخال بيانات الدخول</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(206, 17, 38, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(206, 17, 38, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="اسم المستخدم" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              className="input-field" 
              placeholder="كلمة المرور" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '0.5rem' }}
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

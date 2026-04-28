import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

interface Props {
  onLogin: (token: string) => void;
  token: string | null;
  onLogout: () => void;
  onAddPlayer: (username: string) => void;
}

declare global {
  interface Window {
    google?: any;
    handleGoogleCallback?: (response: any) => void;
  }
}

export const AdminPanel: React.FC<Props> = ({ onLogin, token, onLogout, onAddPlayer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<{ name: string; picture: string; email: string } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Fetch auth config to see if Google login is enabled
  useEffect(() => {
    fetch(`${API_BASE}/auth/config`)
      .then(r => r.json())
      .then(data => {
        setGoogleClientId(data.googleClientId || null);
        setGoogleLoading(false);
      })
      .catch(() => setGoogleLoading(false));
  }, []);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      setError('');
      const resp = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await resp.json();
      if (data.token) {
        onLogin(data.token);
        setGoogleUser(data.user || null);
        setError('');
      } else {
        setError(data.error || 'Google login failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [onLogin]);

  // Load Google Identity Services SDK and render button
  useEffect(() => {
    if (!googleClientId || token) return;

    window.handleGoogleCallback = handleGoogleResponse;

    const existingScript = document.getElementById('google-gsi-script');
    
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          googleBtnRef.current,
          { 
            theme: 'filled_black',
            size: 'large', 
            width: 268,
            text: 'signin_with',
            shape: 'pill'
          }
        );
      }
    };

    if (existingScript) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
  }, [googleClientId, token, handleGoogleResponse]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await resp.json();
      if (data.token) {
        onLogin(data.token);
        setError('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim()) {
      onAddPlayer(newPlayer.trim());
      setNewPlayer('');
    }
  };

  const handleLogout = () => {
    setGoogleUser(null);
    onLogout();
  };

  if (!token) {
    return (
      <div className="glass" style={{ padding: '1.2rem', width: '300px' }}>
        <h3 style={{ marginBottom: '12px' }}>⚔️ Admin Login</h3>
        
        {/* Google Sign-In button */}
        {!googleLoading && googleClientId && (
          <div style={{ marginBottom: '16px' }}>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }}></div>
          </div>
        )}

        {/* Divider if Google is enabled */}
        {!googleLoading && googleClientId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0', opacity: 0.5 }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)' }} />
          </div>
        )}

        {/* Traditional login form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>}
          <button type="submit">Log In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass" style={{ padding: '1rem', width: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {googleUser?.picture && (
            <img 
              src={googleUser.picture} 
              alt="" 
              style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,50,50,0.6)' }} 
            />
          )}
          <h3>{googleUser?.name || 'Admin Panel'}</h3>
        </div>
        <button onClick={handleLogout} className="ghost">Logout</button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h4>Add Player</h4>
        <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '8px' }}>
          <input placeholder="Minecraft Username" value={newPlayer} onChange={e => setNewPlayer(e.target.value)} style={{ flex: 1 }} />
          <button type="submit">Add</button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface Props {
  onLogin: (token: string) => void;
  token: string | null;
  onLogout: () => void;
  onAddPlayer: (username: string) => void;
}

export const AdminPanel: React.FC<Props> = ({ onLogin, token, onLogout, onAddPlayer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('http://localhost:3001/api/login', {
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

  if (!token) {
    return (
      <div className="glass" style={{ padding: '1rem', width: '300px' }}>
        <h3>Admin Login</h3>
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
        <h3>Admin Panel</h3>
        <button onClick={onLogout} className="ghost">Logout</button>
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

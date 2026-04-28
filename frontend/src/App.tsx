import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { GameMode, RankedPlayer, Tier } from './types';
import { LeaderboardRow } from './LeaderboardRow';
import * as Icons from 'lucide-react';
import './App.css';

// In production the backend serves the frontend, so API is same-origin
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function App() {
  const [gamemodes, setGamemodes] = useState<GameMode[]>([]);
  const [gamemodesMap, setGamemodesMap] = useState<Record<number, GameMode>>({});
  const [activeTab, setActiveTab] = useState<number | 'overall'>('overall');
  
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rankings, setRankings] = useState<RankedPlayer[]>([]);
  
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken') || null);
  const [editingPlayer, setEditingPlayer] = useState<RankedPlayer | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<RankedPlayer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Login state for dropdown simulation
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [newPlayerName, setNewPlayerName] = useState('');

  // Google Sign-In state
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<{ name: string; picture: string; email: string } | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const getPointsForTier = (tierName: string) => {
    const map: any = {
      'HT1': 60, 'LT1': 45,
      'HT2': 30, 'LT2': 20,
      'HT3': 10, 'LT3': 6,
      'HT4': 4,  'LT4': 3,
      'HT5': 2,  'LT5': 1
    };
    return map[tierName] !== undefined ? map[tierName] : null;
  };

  useEffect(() => {
    fetchGamemodes();
  }, []);

  useEffect(() => {
    fetchBoard(activeTab);
  }, [activeTab]);

  const fetchGamemodes = async () => {
    try {
      const res = await fetch(`${API_BASE}/gamemodes`);
      const data = await res.json();
      setGamemodes(data);
      
      const gMap: any = {};
      data.forEach((gm: any) => gMap[gm.id] = gm);
      setGamemodesMap(gMap);
    } catch (err) { console.error(err); }
  };

  const fetchBoard = async (tab: number | 'overall') => {
    try {
      if (tab === 'overall') {
        const res = await fetch(`${API_BASE}/board/overall`);
        const data = await res.json();
        setRankings(data);
        setTiers([]); // Tiers not managed in overall board directly
      } else {
        const res = await fetch(`${API_BASE}/gamemodes/${tab}/board`);
        const data = await res.json();
        setTiers(data.tiers || []);
        
        // Map pseudo badges for gamemode view so LeaderboardRow can render
        const formattedRankings = (data.rankings || []).map((r: any) => {
           const tierObj = data.tiers.find((t: any) => t.id === r.tier_id);
            return {
             ...r,
             badges: tierObj ? [{ icon: gamemodesMap[tab as number]?.icon, tierName: tierObj.name, color: tierObj.color, retired: r.retired === 1 }] : []
           };
        });
        setRankings(formattedRankings);
      }
    } catch (err) { console.error(err); }
  };

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
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setShowLogin(false);
      } else {
        alert(data.error);
      }
    } catch (err) { console.error(err); }
  };

  // Google Sign-In callback
  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      const resp = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await resp.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setGoogleUser(data.user || null);
        setShowLogin(false);
      } else {
        alert(data.error || 'Google login failed');
      }
    } catch (err) { console.error(err); }
  }, []);

  // Fetch Google Client ID from backend
  useEffect(() => {
    fetch(`${API_BASE}/auth/config`)
      .then(r => r.json())
      .then(data => setGoogleClientId(data.googleClientId || null))
      .catch(() => {});
  }, []);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!googleClientId || token) return;
    const initGoogle = () => {
      if ((window as any).google?.accounts?.id && googleBtnRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        (window as any).google.accounts.id.renderButton(
          googleBtnRef.current,
          { theme: 'filled_black', size: 'large', width: 248, text: 'signin_with', shape: 'pill' }
        );
      }
    };
    const existing = document.getElementById('google-gsi-script');
    if (existing) { initGoogle(); return; }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
  }, [googleClientId, token, showLogin, handleGoogleResponse]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    try {
      await fetch(`${API_BASE}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newPlayerName.trim() })
      });
      setNewPlayerName('');
      fetchBoard(activeTab);
    } catch (err) { console.error(err); }
  };

  const handleDeleteByName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const nameToFind = newPlayerName.trim().toLowerCase();
    const player = rankings.find(p => p.username.toLowerCase() === nameToFind);
    if (!player) {
      alert("Player not found in the list.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${player.username}?`)) return;
    try {
      await fetch(`${API_BASE}/players/${player.player_id || player.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNewPlayerName('');
      fetchBoard(activeTab);
    } catch (err) { console.error(err); }
  };

  const handleDeleteById = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this player?`)) return;
    try {
      await fetch(`${API_BASE}/players/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setEditingPlayer(null);
      fetchBoard(activeTab);
    } catch (err) { console.error(err); }
  };

  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !token) return;
    
    try {
      await fetch(`${API_BASE}/rankings/${editingPlayer.player_id || editingPlayer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gamemode_id: activeTab === 'overall' ? undefined : activeTab,
          points: editingPlayer.points,
          tier_id: editingPlayer.tier_id,
          title: editingPlayer.top_title,
          region: editingPlayer.region,
          retired: editingPlayer.retired
        })
      });
      setEditingPlayer(null);
      fetchBoard(activeTab);
    } catch (err) { console.error(err); }
  };

  const handlePlayerClick = (player: RankedPlayer) => {
    if (token) {
      setEditingPlayer(player);
    } else {
      setViewingPlayer(player);
    }
  };

  const filteredRankings = rankings.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const GAMEMODE_ICON_PATH: Record<string, string> = {
    'LTMs': '/icons/ltms.png',
    'Vanilla': '/icons/vanilla.png',
    'UHC': '/icons/uhc.png',
    'Pot': '/icons/pot.png',
    'NethOP': '/icons/nethop.png',
    'SMP': '/icons/smp.png',
    'Sword': '/icons/sword.png',
    'Axe': '/icons/axe.png',
    'Mace': '/icons/mace.png',
  };

  // Map DB icon names to PNG paths for tier badges
  const ICON_NAME_TO_PATH: Record<string, string> = {
    'Swords': '/icons/ltms.png',
    'Gem': '/icons/vanilla.png',
    'Heart': '/icons/uhc.png',
    'FlaskConical': '/icons/pot.png',
    'Orbit': '/icons/nethop.png',
    'Globe': '/icons/smp.png',
    'Sword': '/icons/sword.png',
    'Axe': '/icons/axe.png',
    'Hammer': '/icons/mace.png',
  };

  const getGamemodeIcon = (name: string) => (
    <img src={GAMEMODE_ICON_PATH[name] || '/icons/ltms.png'} alt={name} style={{width: '24px', height: '24px', objectFit: 'contain'}} />
  );

  const getTitleStyle = (title: string) => {
    switch(title) {
      case 'Combat Grandmaster': return { color: '#fbbf24', bg: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))' };
      case 'Combat Master': return { color: '#facc15', bg: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(250,204,21,0.05))' };
      case 'Combat Ace': return { color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))' };
      case 'Combat Specialist': return { color: '#d946ef', bg: 'linear-gradient(135deg, rgba(217,70,239,0.15), rgba(217,70,239,0.05))' };
      case 'Combat Cadet': return { color: '#60a5fa', bg: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))' };
      case 'Combat Novice': return { color: '#93c5fd', bg: 'linear-gradient(135deg, rgba(147,197,253,0.15), rgba(147,197,253,0.05))' };
      default: return { color: '#94a3b8', bg: 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.03))' };
    }
  };

  const getRegionFull = (region: string) => {
    switch (region) {
      case 'NA': return 'North America';
      case 'EU': return 'Europe';
      case 'AS': return 'Asia';
      case 'SA': return 'South America';
      case 'OC': return 'Oceania';
      default: return region || 'Unknown';
    }
  };

  // Find the rank of the viewing player
  const getPlayerRank = (player: RankedPlayer) => {
    const idx = rankings.findIndex(p => (p.player_id || p.id) === (player.player_id || player.id));
    return idx >= 0 ? idx + 1 : null;
  };

  const getRankBgForStats = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, #fbbf24 0%, #b8860b 100%)';
    if (rank === 2) return 'linear-gradient(135deg, #cbd5e1 0%, #8a9bb5 100%)';
    if (rank === 3) return 'linear-gradient(135deg, #cd7f32 0%, #8B5E3C 100%)';
    return 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))';
  };

  return (
    <div>
      {/* Navbar */}
      <div style={{ padding: '0 2rem', background: 'var(--bg-navbar)' }}>
        <header className="navbar">
          <div className="logo">
            <span style={{color: '#ef4444'}}>MC</span>TIERS
          </div>

          <div className="nav-links">
             <div className="nav-link"><Icons.Home size={16}/> Home</div>
             <div className="nav-link" style={{color: 'var(--text-primary)'}}><Icons.Trophy size={16}/> Rankings</div>
             <div className="nav-link"><Icons.MessageSquare size={16}/> Discords</div>
             <div className="nav-link"><Icons.FileCode size={16}/> API Docs</div>
             
             {!token ? (
                <div style={{position: 'relative'}}>
                  <div className="nav-link" onClick={() => setShowLogin(!showLogin)}><Icons.Lock size={16}/> Admin</div>
                  {showLogin && (
                    <div className="glass-modal" style={{position:'absolute', top: '100%', right:0, left:'auto', bottom:'auto', background:'var(--bg-panel)', padding:'1rem', borderRadius:'12px', zIndex:100, border:'1px solid var(--border-light)', minWidth:'280px'}}>
                       {/* Google Sign-In button */}
                       {googleClientId && (
                         <>
                           <div ref={googleBtnRef} style={{display:'flex', justifyContent:'center', marginBottom:'12px'}}></div>
                           <div style={{display:'flex', alignItems:'center', gap:'8px', margin:'8px 0', opacity:0.5}}>
                             <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.3)'}} />
                             <span style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px'}}>or</span>
                             <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.3)'}} />
                           </div>
                         </>
                       )}
                       <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
                          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
                          <button type="submit" style={{background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', padding:'6px', borderRadius:'6px', fontWeight:'bold'}}>Log In</button>
                       </form>
                    </div>
                  )}
                </div>
             ) : (
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {googleUser?.picture && <img src={googleUser.picture} alt="" style={{width:24, height:24, borderRadius:'50%', border:'2px solid rgba(255,50,50,0.6)'}} />}
                  <div className="nav-link" onClick={handleLogout}><Icons.Unlock size={16}/> Logout</div>
                </div>
             )}
          </div>

          <div className="search-box">
             <Icons.Search size={16} color="var(--text-secondary)" />
             <input placeholder="Search player..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
          </div>
        </header>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Pills / Tabs */}
        <div className="tabs-container">
          <button 
            className={`tab-pill ${activeTab === 'overall' ? 'active' : ''}`}
            onClick={() => setActiveTab('overall')}
          >
            <span className="tab-icon"><img src="/icons/overall.png" alt="Overall" style={{width: '24px', height: '24px'}} /></span>
            Overall
          </button>
          
          {gamemodes.map(gm => (
            <button 
              key={gm.id}
              className={`tab-pill ${activeTab === gm.id ? 'active' : ''}`}
              onClick={() => setActiveTab(gm.id)}
            >
              <span className="tab-icon">{getGamemodeIcon(gm.name)}</span>
              {gm.name}
            </button>
          ))}
        </div>

        {/* Manage Player (Admin Only) */}
        {token && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
             <div style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {newPlayerName ? (
                   <img src={`https://minotar.net/armor/body/${newPlayerName}/48.png`} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                ) : (
                   <Icons.User size={24} color="var(--text-secondary)" />
                )}
             </div>
             <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <input placeholder="Type Minecraft Username..." value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)} style={{ width: '250px' }} />
                <button onClick={handleAddPlayer} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 12px rgba(239,68,68,0.3)' }}>Add Player</button>
                <button onClick={handleDeleteByName} style={{ background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Delete Player</button>
             </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="leaderboard-container">
          <div className="leaderboard-header">
            <div>PLAYER</div>
            <div></div>
            <div style={{textAlign: 'center'}}>REGION</div>
            <div>TIERS</div>
          </div>
          
          {filteredRankings.map((player, index) => (
            <LeaderboardRow 
              key={player.player_id || player.id} 
              player={player} 
              index={index}
              gamemodesMap={gamemodesMap}
              onClick={() => handlePlayerClick(player)}
            />
          ))}
          
          {filteredRankings.length === 0 && (
             <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>No players found.</div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════
          PLAYER STATS MODAL (Client/Public View) 
          ═══════════════════════════════════════════ */}
      {viewingPlayer && (() => {
        const rank = getPlayerRank(viewingPlayer);
        const titleStyle = getTitleStyle(viewingPlayer.top_title || 'Rookie');
        const regionFull = getRegionFull(viewingPlayer.region || 'NA');
        
        return (
          <div className="glass-modal" onClick={() => setViewingPlayer(null)}>
            <div className="stats-modal" onClick={e => e.stopPropagation()}>
              
              {/* Close button */}
              <button className="stats-close-btn" onClick={() => setViewingPlayer(null)}>
                <Icons.X size={20} />
              </button>

              {/* Player 3D Bust with ring */}
              <div className="stats-avatar-container">
                <div className="stats-avatar-ring">
                  <div className="stats-avatar-inner">
                    <img 
                      src={`https://visage.surgeplay.com/bust/300/${viewingPlayer.username}`} 
                      alt={viewingPlayer.username} 
                      className="stats-avatar-img"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        // Fallback chain: Visage → Starlight → mc-heads
                        if (img.src.includes('visage.surgeplay.com')) {
                          img.src = `https://starlightskins.lunareclipse.studio/render/mojavatar/${viewingPlayer.username}/bust`;
                        } else if (img.src.includes('starlightskins')) {
                          img.src = `https://mc-heads.net/body/${viewingPlayer.username}/120`;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Username */}
              <div className="stats-username" style={{ color: titleStyle.color }}>
                {viewingPlayer.username}
              </div>

              {/* Title Badge */}
              <div className="stats-title-badge" style={{ background: titleStyle.bg, borderColor: `${titleStyle.color}33` }}>
                <Icons.Crown size={14} color={titleStyle.color} />
                <span style={{ color: titleStyle.color }}>{viewingPlayer.top_title || 'Combat Rookie'}</span>
              </div>

              {/* Region */}
              <div className="stats-region">{regionFull}</div>

              {/* NameMC Link */}
              <a 
                href={`https://namemc.com/profile/${viewingPlayer.username}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="stats-namemc-btn"
              >
                <span style={{fontWeight: 800, fontSize: '0.75rem', background: '#000', padding: '2px 5px', borderRadius: '3px', marginRight: '6px'}}>n</span>
                NameMC
                <Icons.ExternalLink size={12} />
              </a>

              {/* Divider */}
              <div className="stats-divider" />

              {/* Position Section */}
              <div className="stats-section-label">POSITION</div>
              <div className="stats-position-row">
                <div className="stats-rank-badge" style={{ background: rank && rank <= 3 ? getRankBgForStats(rank) : 'rgba(220,38,38,0.1)' }}>
                  <span className="stats-rank-number">{rank || '?'}.</span>
                </div>
                <div className="stats-position-info">
                  <img src="/icons/overall.png" alt="" style={{width: '18px', height: '18px'}} />
                  <span style={{fontWeight: 800, textTransform: 'uppercase'}}>
                    {activeTab === 'overall' ? 'Overall' : gamemodes.find(g => g.id === activeTab)?.name || 'Overall'}
                  </span>
                  <span style={{color: 'var(--text-secondary)'}}>({viewingPlayer.points || 0} points)</span>
                </div>
              </div>

              {/* Tiers Section */}
              {viewingPlayer.badges && viewingPlayer.badges.length > 0 && (
                <>
                  <div className="stats-divider" />
                  <div className="stats-section-label">TIERS</div>
                  <div className="stats-tiers-grid">
                    {viewingPlayer.badges.filter(b => b.tierName).map((b, i) => (
                      <div key={i} className={`stats-tier-item ${b.retired ? '' : 'active'}`}>
                        <img 
                          src={ICON_NAME_TO_PATH[b.icon] || '/icons/ltms.png'} 
                          alt="" 
                          style={{width: '28px', height: '28px', objectFit: 'contain', borderRadius: '50%', background: '#000'}} 
                        />
                        <span className="stats-tier-label" style={{ color: b.color || '#fff' }}>{b.tierName}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>
        );
      })()}

      {/* Edit Modal (Admin) */}
      {editingPlayer && (
        <div className="glass-modal" onClick={() => setEditingPlayer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop:0}}>Edit {editingPlayer.username}</h2>
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
               {activeTab === 'overall' ? "You are modifying global stats (Region, Title). Switch to a specific Game Mode tab to assign Points and Tiers." : `Modifying stats for ${gamemodes.find(g => g.id === activeTab)?.name}`}
            </p>
            
            <form onSubmit={handleSaveStats} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{display:'flex', gap:'8px'}}>
                 <div style={{flex:1}}>
                    <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-secondary)'}}>Title Badge</label>
                    <input value={editingPlayer.top_title || ''} onChange={e => setEditingPlayer({...editingPlayer, top_title: e.target.value})} style={{width:'100%'}}/>
                 </div>
                 <div style={{width: '80px'}}>
                    <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-secondary)'}}>Region</label>
                    <input value={editingPlayer.region || ''} onChange={e => setEditingPlayer({...editingPlayer, region: e.target.value})} style={{width:'100%'}}/>
                 </div>
              </div>

              {activeTab !== 'overall' && (
                <>
                  <div style={{display:'flex', gap:'8px'}}>
                     <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-secondary)'}}>Assign Points</label>
                        <input type="number" value={editingPlayer.points || 0} onChange={e => setEditingPlayer({...editingPlayer, points: parseInt(e.target.value, 10)})} style={{width:'100%'}}/>
                     </div>
                     <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-secondary)'}}>Assign Tag</label>
                        <select 
                           value={editingPlayer.tier_id || ''} 
                           onChange={e => {
                             const val = e.target.value ? parseInt(e.target.value, 10) : null;
                             let newPts = editingPlayer.points;
                             if (val) {
                               const tierObj = tiers.find(t => t.id === val);
                               if (tierObj) {
                                 const autoPts = getPointsForTier(tierObj.name);
                                 if (autoPts !== null) newPts = autoPts;
                               }
                             }
                             setEditingPlayer({...editingPlayer, tier_id: val, points: newPts});
                           }}
                           style={{width:'100%', padding:'6px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--border-light)', color:'white', borderRadius:'6px'}}
                        >
                           <option value="">Unranked</option>
                           {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                     </div>
                  </div>

                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'4px'}}>
                     <label style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.85rem', color:'var(--text-secondary)', cursor:'pointer'}}>
                        <input type="checkbox" checked={!!editingPlayer.retired} onChange={e => setEditingPlayer({...editingPlayer, retired: e.target.checked ? 1 : 0})} style={{width:'16px', height:'16px', accentColor:'#fbbf24'}} />
                        Retired from this mode
                     </label>
                     <span style={{fontSize:'0.7rem', color:'var(--text-dim)'}}>(Active players get a gold ring on their tier badge)</span>
                  </div>
                </>
              )}

              <div style={{display:'flex', justifyContent:'space-between', marginTop:'16px'}}>
                <button type="button" onClick={() => handleDeleteById(editingPlayer.player_id || editingPlayer.id)} style={{padding: '6px 12px', background: '#dc2626', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold'}}>Delete Player</button>
                <div style={{display:'flex', gap:'8px'}}>
                  <button type="button" onClick={() => setEditingPlayer(null)} style={{padding: '6px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)'}}>Cancel</button>
                  <button type="submit" style={{padding: '6px 12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', border: 'none', boxShadow: '0 0 12px rgba(239,68,68,0.3)'}}>Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React from 'react';
import type { RankedPlayer } from './types';
import * as Icons from 'lucide-react';

interface Props {
  player: RankedPlayer;
  index: number;
  onClick: () => void;
  gamemodesMap: Record<number, any>;
}

export const LeaderboardRow: React.FC<Props> = ({ player, index, onClick, gamemodesMap }) => {
  const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
  const isTop3 = index < 3;

  const ICON_TO_PATH: Record<string, string> = {
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

  const getIconImg = (iconName: string) => (
    <img src={ICON_TO_PATH[iconName] || '/icons/ltms.png'} alt="" style={{width: '20px', height: '20px', objectFit: 'contain'}} />
  );

  const getTitleStyle = (title: string) => {
    switch(title) {
      case 'Combat Grandmaster': return { icon: Icons.Crown, color: '#fbbf24' };
      case 'Combat Master': return { icon: Icons.Star, color: '#facc15' };
      case 'Combat Ace': return { icon: Icons.ChevronsUp, color: '#ef4444' };
      case 'Combat Specialist': return { icon: Icons.ChevronUp, color: '#d946ef' };
      case 'Combat Cadet': return { icon: Icons.CircleDot, color: '#60a5fa' };
      case 'Combat Novice': return { icon: Icons.Circle, color: '#93c5fd' };
      case 'Rookie': default: return { icon: Icons.Minus, color: '#94a3b8' };
    }
  };

  const getRankBg = () => {
    if (index === 0) return 'linear-gradient(135deg, #fbbf24 0%, #b8860b 100%)';
    if (index === 1) return 'linear-gradient(135deg, #cbd5e1 0%, #8a9bb5 100%)';
    if (index === 2) return 'linear-gradient(135deg, #cd7f32 0%, #8B5E3C 100%)';
    return 'transparent';
  };

  const { icon: TitleIcon, color: titleColor } = getTitleStyle(player.top_title || 'Rookie');

  return (
    <div className="leaderboard-row" onClick={onClick}>
      {/* Rank + Avatar combined for top 3 */}
      <div className={`rank-avatar-area ${isTop3 ? 'top-rank' : ''}`} style={isTop3 ? { background: getRankBg() } : {}}>
        <div className={`rank-number ${rankClass}`}>
          {index + 1}.
        </div>
        <div className="player-avatar">
          <img 
            src={`https://visage.surgeplay.com/full/150/${player.username}`} 
            alt={player.username}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://mc-heads.net/body/${player.username}/100`;
            }}
          />
        </div>
      </div>

      {/* Player Info */}
      <div className="player-details">
        <div className="player-username">{player.username}</div>
        <div className="player-title-row">
          <TitleIcon size={14} color={titleColor} />
          <span className="player-title" style={{ color: titleColor, fontWeight: 600 }}>{player.top_title}</span>
          <span className="player-points">({player.points || 0} points)</span>
        </div>
      </div>

      {/* Region */}
      <div>
        <div className={`region-badge ${player.region === 'EU' ? 'EU' : ''}`}>
          {player.region || 'NA'}
        </div>
      </div>

      {/* Tiers / Badges */}
      <div className="tier-bubbles">
        {player.badges ? (
          player.badges.filter(b => b.tierName).map((b, i) => (
            <div key={i} className={`tier-bubble ${b.retired ? '' : 'active-badge'}`}>
              <span className="tier-bubble-icon">
                {getIconImg(b.icon)}
              </span>
              <span className="tier-bubble-text" style={{ color: b.color || '#fff' }}>{b.tierName}</span>
            </div>
          ))
        ) : (
          player.tier_id ? (
            <div className={`tier-bubble ${player.retired ? '' : 'active-badge'}`}>
              <span className="tier-bubble-icon">
                {getIconImg(gamemodesMap[player.gamemode_id!]?.icon || 'Swords')}
              </span>
              <span className="tier-bubble-text" style={{ color: '#fff' }}>
                 T-{player.tier_id}
              </span>
            </div>
          ) : (
            <span style={{color: 'var(--text-dim)', fontSize: '0.8rem'}}>-</span>
          )
        )}
      </div>
    </div>
  );
};

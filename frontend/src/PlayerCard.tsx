import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { RankedPlayer, Tier } from './types';

interface Props {
  player: RankedPlayer;
  index: number;
  tier?: Tier;
  onEditStats?: (player: RankedPlayer) => void;
  isAdmin: boolean;
}

export const PlayerCard: React.FC<Props> = ({ player, index, tier, onEditStats, isAdmin }) => {
  const [showStats, setShowStats] = useState(false);
  const isSTier = tier?.name === 'S';

  return (
    <Draggable draggableId={player.player_id?.toString() || player.id.toString()} index={index} isDragDisabled={!isAdmin}>
      {(provided, snapshot) => (
        <div
          className={`player-card ${isSTier ? 's-tier-glow' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
            zIndex: snapshot.isDragging ? 10 : 1,
          }}
          onMouseEnter={() => setShowStats(true)}
          onMouseLeave={() => setShowStats(false)}
          onClick={() => isAdmin && onEditStats && onEditStats(player)}
        >
          <div className="player-avatar">
            <img src={player.skin_url} alt={player.username} />
          </div>
          <div className="player-name">{player.username}</div>

          {showStats && !snapshot.isDragging && (
            <div className="absolute bg-[#111] p-2 rounded-lg -top-16 text-xs w-32 border border-gray-600 shadow-xl z-50 animate-fade-in text-white left-1/2 transform -translate-x-1/2 cursor-default pointer-events-none" style={{ position: 'absolute', top: '-70px', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '8px', borderRadius: '6px', width: '120px', border: '1px solid #444', zIndex: 100 }}>
              <div className="font-bold border-b border-gray-700 pb-1 mb-1">{player.username}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-gray-400">WR:</span> <span>{player.winrate ?? 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-gray-400">Ping:</span> <span>{player.ping ?? 0}ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-gray-400">Region:</span> <span>{player.region || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

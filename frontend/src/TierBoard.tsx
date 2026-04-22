import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { RankedPlayer, Tier } from './types';
import { PlayerCard } from './PlayerCard';

interface Props {
  tiers: Tier[];
  rankings: RankedPlayer[];
  unrankedPlayers: RankedPlayer[];
  onDragEnd: (result: DropResult) => void;
  onEditStats: (player: RankedPlayer) => void;
  isAdmin: boolean;
  searchFilter: string;
}

export const TierBoard: React.FC<Props> = ({ tiers, rankings, unrankedPlayers, onDragEnd, onEditStats, isAdmin, searchFilter }) => {
  const filterPlayers = (players: RankedPlayer[]) => 
    players.filter(p => p.username.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="tier-board">
        {tiers.map((tier) => {
          const playersInTier = filterPlayers(
            rankings.filter((r) => r.tier_id === tier.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          );

          return (
            <div key={tier.id} className="tier-row glass">
              <div
                className="tier-label"
                style={{ backgroundColor: tier.color, color: '#000' }}
              >
                {tier.name}
              </div>
              <Droppable droppableId={`tier-${tier.id}`} direction="horizontal" isDropDisabled={!isAdmin}>
                {(provided, snapshot) => (
                  <div
                    className="tier-content"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}
                  >
                    {playersInTier.map((player, index) => (
                      <PlayerCard
                        key={player.player_id?.toString() || player.id.toString()}
                        player={player}
                        index={index}
                        tier={tier}
                        onEditStats={onEditStats}
                        isAdmin={isAdmin}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)' }}>Unranked Pool</h3>
        <Droppable droppableId="unranked" direction="horizontal" isDropDisabled={!isAdmin}>
          {(provided, snapshot) => (
            <div
              className="unranked-pool glass"
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                backgroundColor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.05)' : 'var(--bg-card)',
              }}
            >
              {filterPlayers(unrankedPlayers).map((player, index) => (
                <PlayerCard
                  key={player.player_id?.toString() || player.id.toString()}
                  player={player}
                  index={index}
                  onEditStats={onEditStats}
                  isAdmin={isAdmin}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
};

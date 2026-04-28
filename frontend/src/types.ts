export interface Player {
  id: number;
  username: string;
  uuid: string;
  skin_url: string;
  top_title: string;
  region: string;
}

export interface PlayerStats {
  winrate: number;
  ping: number;
  notes: string;
}

export interface Badge {
  gamemode_id: number;
  icon: string;
  tierName: string;
  color: string;
  retired?: boolean;
}

export interface RankedPlayer extends Player {
  player_id?: number;
  ranking_id?: number;
  gamemode_id?: number;
  tier_id?: number | null;
  points: number;
  retired?: number;
  order_index?: number;
  winrate?: number;
  ping?: number;
  notes?: string;
  badges?: Badge[];
}

export interface Tier {
  id: number;
  gamemode_id: number;
  name: string;
  color: string;
}

export interface GameMode {
  id: number;
  name: string;
  icon: string;
}

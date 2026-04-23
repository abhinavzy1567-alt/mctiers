import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Ensure there is a connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const initDB = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database.');
    
    // Create gamemodes table
    await client.query(`CREATE TABLE IF NOT EXISTS gamemodes (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT 'Sword'
    )`);

    // Create tiers table
    await client.query(`CREATE TABLE IF NOT EXISTS tiers (
      id SERIAL PRIMARY KEY,
      gamemode_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#ffffff',
      FOREIGN KEY(gamemode_id) REFERENCES gamemodes(id) ON DELETE CASCADE,
      UNIQUE(gamemode_id, name)
    )`);

    // Create players table
    await client.query(`CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      uuid TEXT,
      skin_url TEXT,
      top_title TEXT DEFAULT 'Combat Rookie',
      region TEXT DEFAULT 'NA'
    )`);

    // Create rankings table (points driven)
    await client.query(`CREATE TABLE IF NOT EXISTS rankings (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL,
      gamemode_id INTEGER NOT NULL,
      tier_id INTEGER,
      points INTEGER DEFAULT 0,
      retired INTEGER DEFAULT 0,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY(gamemode_id) REFERENCES gamemodes(id) ON DELETE CASCADE,
      FOREIGN KEY(tier_id) REFERENCES tiers(id) ON DELETE SET NULL,
      UNIQUE(player_id, gamemode_id)
    )`);

    // Create stats table (additional info for modal)
    await client.query(`CREATE TABLE IF NOT EXISTS stats (
      player_id INTEGER PRIMARY KEY,
      winrate REAL DEFAULT 0,
      ping INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    )`);

    // Seed initial data if empty
    const res = await client.query('SELECT COUNT(*) as count FROM gamemodes');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      const gmData = [
        { name: 'LTMs', icon: 'Swords' },
        { name: 'Vanilla', icon: 'Gem' },
        { name: 'UHC', icon: 'Heart' },
        { name: 'Pot', icon: 'FlaskConical' },
        { name: 'NethOP', icon: 'Orbit' },
        { name: 'SMP', icon: 'Globe' },
        { name: 'Sword', icon: 'Sword' },
        { name: 'Axe', icon: 'Axe' },
        { name: 'Mace', icon: 'Hammer' }
      ];

      for (const gm of gmData) {
        const gmInsert = await client.query('INSERT INTO gamemodes (name, icon) VALUES ($1, $2) RETURNING id', [gm.name, gm.icon]);
        const gmId = gmInsert.rows[0].id;
        
        const tiers = [
          { name: 'HT1', color: '#ffd700' }, 
          { name: 'LT1', color: '#c0c0c0' },
          { name: 'HT2', color: '#ff8c00' },
          { name: 'LT2', color: '#a9a9a9' },
          { name: 'HT3', color: '#cd7f32' },
          { name: 'LT3', color: '#8b4513' },
          { name: 'HT4', color: '#da70d6' },
          { name: 'LT4', color: '#d8bfd8' },
          { name: 'HT5', color: '#1e90ff' },
          { name: 'LT5', color: '#87cefa' }
        ];
        
        for (const t of tiers) {
          await client.query('INSERT INTO tiers (gamemode_id, name, color) VALUES ($1, $2, $3)', [gmId, t.name, t.color]);
        }
      }
      console.log('Seeding completed.');
    }
    client.release();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

initDB();

// Helper to convert sqlite "?" parameters to postgres "$1, $2" format
const convertQuery = (query: string) => {
  let paramIndex = 1;
  let pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
  return pgQuery;
};

export const dbQuery = async (query: string, params: any[] = []): Promise<any[]> => {
  const pgQuery = convertQuery(query);
  const result = await pool.query(pgQuery, params);
  return result.rows;
};

export const dbRun = async (query: string, params: any[] = []): Promise<{ id: number, changes: number }> => {
  let pgQuery = convertQuery(query);
  
  // If it's an insert without a RETURNING clause, add it to get the inserted ID
  if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.toUpperCase().includes('RETURNING')) {
    pgQuery += ' RETURNING id';
  }

  const result = await pool.query(pgQuery, params);
  return { 
    id: result.rows[0]?.id || 0, 
    changes: result.rowCount || 0 
  };
};

import sqlite3 from 'sqlite3';
import path from 'path';

// On Render, use persistent disk at /data. Locally use the backend folder.
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/database.sqlite'
  : path.resolve(__dirname, '../database.sqlite');


export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create gamemodes table
      db.run(`CREATE TABLE IF NOT EXISTS gamemodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        icon TEXT DEFAULT 'Sword'
      )`);

      // Create tiers table
      db.run(`CREATE TABLE IF NOT EXISTS tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gamemode_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#ffffff',
        FOREIGN KEY(gamemode_id) REFERENCES gamemodes(id) ON DELETE CASCADE,
        UNIQUE(gamemode_id, name)
      )`);

      // Create players table
      db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        uuid TEXT,
        skin_url TEXT,
        top_title TEXT DEFAULT 'Combat Rookie',
        region TEXT DEFAULT 'NA'
      )`);

      // Create rankings table (points driven)
      db.run(`CREATE TABLE IF NOT EXISTS rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      db.run(`CREATE TABLE IF NOT EXISTS stats (
        player_id INTEGER PRIMARY KEY,
        winrate REAL DEFAULT 0,
        ping INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
      )`);

      // Seed initial data if empty
      db.get('SELECT COUNT(*) as count FROM gamemodes', (err, row: any) => {
        if (!err && row.count === 0) {
          console.log('Seeding initial data...');
          const stmt1 = db.prepare('INSERT INTO gamemodes (name, icon) VALUES (?, ?)');
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

          let count = 0;
          for (let i = 0; i < gmData.length; i++) {
            stmt1.run([gmData[i].name, gmData[i].icon], function (this: any) {
              const gmId = this.lastID;
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
              const stmt2 = db.prepare('INSERT INTO tiers (gamemode_id, name, color) VALUES (?, ?, ?)');
              tiers.forEach((t) => stmt2.run([gmId, t.name, t.color]));
              stmt2.finalize();
              count++;
              if (count === gmData.length) {
                console.log('Seeding completed.');
              }
            });
          }
          stmt1.finalize();
        }
      });
    });
  }
});

export const dbQuery = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbRun = (query: string, params: any[] = []): Promise<{ id: number, changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

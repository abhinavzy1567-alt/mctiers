import express from 'express';
import cors from 'cors';
import path from 'path';
import { dbQuery, dbRun } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend static files
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'fake-jwt-token' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const requireAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization === 'Bearer fake-jwt-token') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/gamemodes', async (req, res) => {
  try {
    const modes = await dbQuery('SELECT * FROM gamemodes ORDER BY id ASC');
    res.json(modes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/board/overall', async (req, res) => {
  try {
    const players = await dbQuery(`
        SELECT p.id as player_id, p.username, p.uuid, p.skin_url, p.top_title, p.region,
               s.winrate, s.ping, s.notes
        FROM players p
        LEFT JOIN stats s ON p.id = s.player_id
    `);

    const rankings = await dbQuery(`
        SELECT r.player_id, r.gamemode_id, r.tier_id, r.points, r.retired,
               g.icon as gamemode_icon, t.name as tier_name, t.color as tier_color
        FROM rankings r
        JOIN gamemodes g ON r.gamemode_id = g.id
        LEFT JOIN tiers t ON r.tier_id = t.id
    `);

    // Compile points and tier badges
    const leaderboard = players.map((p: any) => {
      const pRanks = rankings.filter((r: any) => r.player_id === p.player_id);
      const totalPoints = pRanks.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
      
      const badges = pRanks.map((r: any) => ({
        gamemode_id: r.gamemode_id,
        icon: r.gamemode_icon,
        tierName: r.tier_name,
        color: r.tier_color,
        retired: r.retired === 1
      }));

      return { ...p, points: totalPoints, badges };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);
    res.json(leaderboard);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gamemodes/:id/board', async (req, res) => {
  const gmId = req.params.id;
  try {
    const tiers = await dbQuery('SELECT * FROM tiers WHERE gamemode_id = ? ORDER BY id ASC', [gmId]);
    
    // Sort automatically by points DESC
    const rankings = await dbQuery(`
      SELECT r.id as ranking_id, r.tier_id, r.points, r.retired,
             p.id as player_id, p.username, p.uuid, p.skin_url, p.top_title, p.region,
             s.winrate, s.ping, s.notes
      FROM players p
      LEFT JOIN rankings r ON r.player_id = p.id AND r.gamemode_id = ?
      LEFT JOIN stats s ON p.id = s.player_id
      ORDER BY COALESCE(r.points, 0) DESC, p.username ASC
    `, [gmId]);
    
    res.json({ tiers, rankings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  // Use Mojang API to get UUID first for accurate crafatar 3D body
  let uuid = '';
  try {
    const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (mojangRes.ok) {
      const mojangData = await mojangRes.json();
      uuid = mojangData.id;
    }
  } catch (e) { console.error('Failed to grab UUID', e); }

  const targetIdentifier = uuid || username;
  const skin_url = `https://crafatar.com/renders/body/${targetIdentifier}?overlay=true`;

  try {
    const pResult = await dbRun('INSERT INTO players (username, uuid, skin_url) VALUES (?, ?, ?)', [username, uuid, skin_url]);
    await dbRun('INSERT INTO stats (player_id) VALUES (?)', [pResult.id]);
    res.json({ id: pResult.id, username, uuid, skin_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/players/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM players WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const TITLE_THRESHOLDS = [
  { points: 400, title: 'Combat Grandmaster' },
  { points: 250, title: 'Combat Master' },
  { points: 100, title: 'Combat Ace' },
  { points: 50, title: 'Combat Specialist' },
  { points: 20, title: 'Combat Cadet' },
  { points: 10, title: 'Combat Novice' },
  { points: 0, title: 'Rookie' }
];

function getTitle(points: number) {
  for (const t of TITLE_THRESHOLDS) {
    if (points >= t.points) return t.title;
  }
  return 'Rookie';
}

// Update specific point / tier for a gamemode
app.patch('/api/rankings/:playerId', requireAuth, async (req, res) => {
  const playerId = req.params.playerId;
  const { gamemode_id, points, tier_id, title, region, retired } = req.body; 

  try {
    // Update player title and region
    if (title || region) {
      const titleUpdate = title !== undefined ? title : undefined;
      const regionUpdate = region !== undefined ? region : undefined;
      let query = 'UPDATE players SET ';
      let params = [];
      if (titleUpdate !== undefined) { query += 'top_title = ?, '; params.push(titleUpdate); }
      if (regionUpdate !== undefined) { query += 'region = ? '; params.push(regionUpdate); }
      if (query.endsWith(', ')) query = query.slice(0, -2);
      query += 'WHERE id = ?';
      params.push(playerId);
      await dbRun(query, params);
    }

    if (gamemode_id) {
       const existing = await dbQuery('SELECT id FROM rankings WHERE player_id = ? AND gamemode_id = ?', [playerId, gamemode_id]);
       if (existing.length > 0) {
          await dbRun('UPDATE rankings SET points = ?, tier_id = ?, retired = ? WHERE player_id = ? AND gamemode_id = ?', 
            [points, tier_id || null, retired ? 1 : 0, playerId, gamemode_id]);
       } else {
          await dbRun('INSERT INTO rankings (player_id, gamemode_id, tier_id, points, retired) VALUES (?, ?, ?, ?, ?)', 
            [playerId, gamemode_id, tier_id || null, points, retired ? 1 : 0]);
       }
       
       // Recalculate total points and set title automatically
       const rows = await dbQuery('SELECT SUM(points) as total FROM rankings WHERE player_id = ?', [playerId]);
       const totalPoints = rows[0]?.total || 0;
       const newTitle = getTitle(totalPoints);
       await dbRun('UPDATE players SET top_title = ? WHERE id = ?', [newTitle, playerId]);
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve frontend for any non-API route (SPA support)
app.get('*splat', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

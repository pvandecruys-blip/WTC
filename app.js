require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { db, init } = require('./db');
const storage = require('./storage');

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Enkel afbeeldingen toegestaan'), ok);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
if (!storage.useBlob) {
  app.use('/uploads', express.static(storage.localUploadDir()));
}

// ---- Init DB once at cold start ----
let dbReady = init();
app.use(async (req, res, next) => {
  try { await dbReady; next(); }
  catch (err) { res.status(500).json({ error: 'DB init failed: ' + err.message }); }
});

// ============================================================
// RIDES
// ============================================================
const rideRowToObj = (row) => ({
  id: row.id,
  date: row.date,
  title: row.title,
  km: row.km,
  time: row.time,
  cafe: row.cafe,
  riders: JSON.parse(row.riders || '[]'),
  notes: row.notes || '',
  photo: row.photo || null
});

app.get('/api/rides', async (req, res) => {
  const result = await db.execute('SELECT * FROM rides ORDER BY date DESC, id DESC');
  res.json(result.rows.map(rideRowToObj));
});

app.post('/api/rides', upload.single('photo'), async (req, res) => {
  try {
    const { date, title, km, time, cafe, notes } = req.body;
    let { riders } = req.body;
    if (typeof riders === 'string') {
      try { riders = JSON.parse(riders); } catch { riders = riders.split(',').map(s => s.trim()).filter(Boolean); }
    }
    if (!date || !title || km == null || !time || cafe == null || !Array.isArray(riders)) {
      return res.status(400).json({ error: 'Verplichte velden ontbreken' });
    }
    const photoUrl = await storage.saveImage(req.file);
    const ins = await db.execute({
      sql: `INSERT INTO rides (date, title, km, time, cafe, riders, notes, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [date, title, Number(km), time, Number(cafe), JSON.stringify(riders), notes || '', photoUrl]
    });
    const row = await db.execute({ sql: 'SELECT * FROM rides WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(rideRowToObj(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rides/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.execute({ sql: 'SELECT photo FROM rides WHERE id = ?', args: [id] });
  if (!row.rows.length) return res.status(404).json({ error: 'Niet gevonden' });
  await db.execute({ sql: 'DELETE FROM rides WHERE id = ?', args: [id] });
  await storage.deleteImage(row.rows[0].photo);
  res.json({ ok: true });
});

// ============================================================
// SPONSORS
// ============================================================
app.get('/api/sponsors', async (req, res) => {
  const result = await db.execute('SELECT * FROM sponsors ORDER BY sort_order ASC, id DESC');
  res.json(result.rows);
});

app.post('/api/sponsors', upload.single('logo'), async (req, res) => {
  try {
    const { name, tier, description, url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Naam vereist' });
    const logoUrl = await storage.saveImage(req.file);
    const ins = await db.execute({
      sql: `INSERT INTO sponsors (name, tier, description, url, logo, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [name, tier || 'silver', description || '', url || '', logoUrl, Number(sort_order) || 0]
    });
    const row = await db.execute({ sql: 'SELECT * FROM sponsors WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sponsors/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.execute({ sql: 'SELECT logo FROM sponsors WHERE id = ?', args: [id] });
  if (!row.rows.length) return res.status(404).json({ error: 'Niet gevonden' });
  await db.execute({ sql: 'DELETE FROM sponsors WHERE id = ?', args: [id] });
  await storage.deleteImage(row.rows[0].logo);
  res.json({ ok: true });
});

// ============================================================
// MEMBERS
// ============================================================
const memberRowToObj = (r) => ({ ...r, is_board: !!r.is_board });

app.get('/api/members', async (req, res) => {
  const result = await db.execute('SELECT * FROM members ORDER BY is_board DESC, sort_order ASC, name ASC');
  res.json(result.rows.map(memberRowToObj));
});

app.post('/api/members', upload.single('photo'), async (req, res) => {
  try {
    const { name, role, category, bio, is_board, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Naam vereist' });
    const photoUrl = await storage.saveImage(req.file);
    const ins = await db.execute({
      sql: `INSERT INTO members (name, role, category, bio, photo, is_board, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [name, role || '', category || '', bio || '', photoUrl, is_board === 'true' || is_board === true ? 1 : 0, Number(sort_order) || 0]
    });
    const row = await db.execute({ sql: 'SELECT * FROM members WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(memberRowToObj(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.execute({ sql: 'SELECT photo FROM members WHERE id = ?', args: [id] });
  if (!row.rows.length) return res.status(404).json({ error: 'Niet gevonden' });
  await db.execute({ sql: 'DELETE FROM members WHERE id = ?', args: [id] });
  await storage.deleteImage(row.rows[0].photo);
  res.json({ ok: true });
});

// ============================================================
// EVENTS
// ============================================================
const eventRowToObj = (r) => ({ ...r, is_special: !!r.is_special });

app.get('/api/events', async (req, res) => {
  const result = await db.execute('SELECT * FROM events ORDER BY date ASC, id ASC');
  res.json(result.rows.map(eventRowToObj));
});

app.post('/api/events', async (req, res) => {
  try {
    const { date, time, title, location, distance, pace, description, is_special } = req.body;
    if (!date || !title) return res.status(400).json({ error: 'Datum en titel vereist' });
    const ins = await db.execute({
      sql: `INSERT INTO events (date, time, title, location, distance, pace, description, is_special) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [date, time || '', title, location || '', distance || '', pace || '', description || '', is_special ? 1 : 0]
    });
    const row = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(eventRowToObj(row.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Niet gevonden' });
  res.json({ ok: true });
});

// ============================================================
// STATS / DASHBOARD
// ============================================================
function parseTimeToHours(t) {
  if (!t || !String(t).includes(':')) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return h + (m || 0) / 60;
}

app.get('/api/stats', async (req, res) => {
  const result = await db.execute('SELECT * FROM rides');
  const rows = result.rows.map(rideRowToObj);

  if (!rows.length) {
    return res.json({
      empty: true,
      totals: { rides: 0, km: 0, hours: 0, cafe: 0, avgSpeed: 0 },
      byRider: [], slowdown: [], monthly: []
    });
  }

  const totalKm = rows.reduce((a, r) => a + r.km, 0);
  const totalHours = rows.reduce((a, r) => a + parseTimeToHours(r.time), 0);
  const totalCafe = rows.reduce((a, r) => a + r.cafe, 0);

  const riderMap = new Map();
  rows.forEach((r) => {
    const hours = parseTimeToHours(r.time);
    const speed = hours > 0 ? r.km / hours : 0;
    const groupSize = r.riders.length || 1;
    r.riders.forEach((name) => {
      const k = name.trim();
      if (!k) return;
      if (!riderMap.has(k)) riderMap.set(k, { name: k, rides: 0, km: 0, hours: 0, cafeShare: 0, speedSum: 0 });
      const e = riderMap.get(k);
      e.rides += 1;
      e.km += r.km;
      e.hours += hours;
      e.cafeShare += r.cafe / groupSize;
      e.speedSum += speed;
    });
  });

  const byRider = Array.from(riderMap.values())
    .map((e) => ({
      name: e.name,
      rides: e.rides,
      km: +e.km.toFixed(1),
      hours: +e.hours.toFixed(2),
      cafeShare: +e.cafeShare.toFixed(2),
      avgSpeed: +(e.rides > 0 ? e.speedSum / e.rides : 0).toFixed(2),
      avgKmPerRide: +(e.rides > 0 ? e.km / e.rides : 0).toFixed(1)
    }))
    .sort((a, b) => b.rides - a.rides);

  const allSpeeds = rows.map((r) => {
    const h = parseTimeToHours(r.time);
    return h > 0 ? r.km / h : 0;
  });
  const overallAvgSpeed = allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length;

  const slowdown = byRider
    .filter((r) => r.rides >= 2)
    .map((r) => {
      const w = [], wo = [];
      rows.forEach((ride, idx) => {
        if (ride.riders.includes(r.name)) w.push(allSpeeds[idx]); else wo.push(allSpeeds[idx]);
      });
      const avgWith = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
      const avgWithout = wo.length ? wo.reduce((a, b) => a + b, 0) / wo.length : null;
      return {
        name: r.name, rides: r.rides,
        avgWith: +avgWith.toFixed(2),
        avgWithout: avgWithout != null ? +avgWithout.toFixed(2) : null,
        delta: avgWithout != null ? +(avgWith - avgWithout).toFixed(2) : null
      };
    })
    .sort((a, b) => (a.delta == null ? 1 : b.delta == null ? -1 : a.delta - b.delta));

  const monthlyMap = new Map();
  rows.forEach((r) => {
    const key = r.date.slice(0, 7);
    if (!monthlyMap.has(key)) monthlyMap.set(key, { month: key, rides: 0, km: 0, cafe: 0 });
    const m = monthlyMap.get(key);
    m.rides += 1; m.km += r.km; m.cafe += r.cafe;
  });
  const monthly = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, km: +m.km.toFixed(1), cafe: +m.cafe.toFixed(2) }));

  res.json({
    empty: false,
    totals: {
      rides: rows.length,
      km: +totalKm.toFixed(1),
      hours: +totalHours.toFixed(2),
      cafe: +totalCafe.toFixed(2),
      avgSpeed: +overallAvgSpeed.toFixed(2)
    },
    byRider, slowdown, monthly
  });
});

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = app;

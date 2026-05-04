require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase } = require('./db');
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

const fail = (res, error) => res.status(500).json({ error: error.message || String(error) });

// ============================================================
// RIDES
// ============================================================
app.get('/api/rides', async (req, res) => {
  const { data, error } = await supabase
    .from('rides').select('*')
    .order('date', { ascending: false }).order('id', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
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
    const { data, error } = await supabase.from('rides').insert({
      date, title, km: Number(km), time, cafe: Number(cafe),
      riders, notes: notes || '', photo: photoUrl
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { fail(res, err); }
});

app.delete('/api/rides/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data: row } = await supabase.from('rides').select('photo').eq('id', id).single();
    if (!row) return res.status(404).json({ error: 'Niet gevonden' });
    const { error } = await supabase.from('rides').delete().eq('id', id);
    if (error) throw error;
    await storage.deleteImage(row.photo);
    res.json({ ok: true });
  } catch (err) { fail(res, err); }
});

// ============================================================
// SPONSORS
// ============================================================
app.get('/api/sponsors', async (req, res) => {
  const { data, error } = await supabase
    .from('sponsors').select('*')
    .order('sort_order', { ascending: true }).order('id', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
});

app.post('/api/sponsors', upload.single('logo'), async (req, res) => {
  try {
    const { name, tier, description, url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Naam vereist' });
    const logoUrl = await storage.saveImage(req.file);
    const { data, error } = await supabase.from('sponsors').insert({
      name, tier: tier || 'silver',
      description: description || '', url: url || '',
      logo: logoUrl, sort_order: Number(sort_order) || 0
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { fail(res, err); }
});

app.delete('/api/sponsors/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data: row } = await supabase.from('sponsors').select('logo').eq('id', id).single();
    if (!row) return res.status(404).json({ error: 'Niet gevonden' });
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    await storage.deleteImage(row.logo);
    res.json({ ok: true });
  } catch (err) { fail(res, err); }
});

// ============================================================
// MEMBERS
// ============================================================
app.get('/api/members', async (req, res) => {
  const { data, error } = await supabase
    .from('members').select('*')
    .order('is_board', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) return fail(res, error);
  res.json(data);
});

app.post('/api/members', upload.single('photo'), async (req, res) => {
  try {
    const { name, role, category, bio, is_board, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Naam vereist' });
    const photoUrl = await storage.saveImage(req.file);
    const { data, error } = await supabase.from('members').insert({
      name, role: role || '', category: category || '',
      bio: bio || '', photo: photoUrl,
      is_board: is_board === 'true' || is_board === true,
      sort_order: Number(sort_order) || 0
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { fail(res, err); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data: row } = await supabase.from('members').select('photo').eq('id', id).single();
    if (!row) return res.status(404).json({ error: 'Niet gevonden' });
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    await storage.deleteImage(row.photo);
    res.json({ ok: true });
  } catch (err) { fail(res, err); }
});

// ============================================================
// EVENTS
// ============================================================
app.get('/api/events', async (req, res) => {
  const { data, error } = await supabase
    .from('events').select('*')
    .order('date', { ascending: true }).order('id', { ascending: true });
  if (error) return fail(res, error);
  res.json(data);
});

app.post('/api/events', async (req, res) => {
  try {
    const { date, time, title, location, distance, pace, description, is_special } = req.body;
    if (!date || !title) return res.status(400).json({ error: 'Datum en titel vereist' });
    const { data, error } = await supabase.from('events').insert({
      date, time: time || '', title,
      location: location || '', distance: distance || '',
      pace: pace || '', description: description || '',
      is_special: is_special === true || is_special === 'true'
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { fail(res, err); }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error, count } = await supabase.from('events').delete({ count: 'exact' }).eq('id', id);
    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Niet gevonden' });
    res.json({ ok: true });
  } catch (err) { fail(res, err); }
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
  const { data: rides, error } = await supabase.from('rides').select('*');
  if (error) return fail(res, error);

  if (!rides.length) {
    return res.json({
      empty: true,
      totals: { rides: 0, km: 0, hours: 0, cafe: 0, avgSpeed: 0 },
      byRider: [], slowdown: [], monthly: []
    });
  }

  const totalKm = rides.reduce((a, r) => a + r.km, 0);
  const totalHours = rides.reduce((a, r) => a + parseTimeToHours(r.time), 0);
  const totalCafe = rides.reduce((a, r) => a + r.cafe, 0);

  const riderMap = new Map();
  rides.forEach((r) => {
    const hours = parseTimeToHours(r.time);
    const speed = hours > 0 ? r.km / hours : 0;
    const groupSize = (r.riders || []).length || 1;
    (r.riders || []).forEach((name) => {
      const k = String(name).trim();
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

  const allSpeeds = rides.map((r) => {
    const h = parseTimeToHours(r.time);
    return h > 0 ? r.km / h : 0;
  });
  const overallAvgSpeed = allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length;

  const slowdown = byRider
    .filter((r) => r.rides >= 2)
    .map((r) => {
      const w = [], wo = [];
      rides.forEach((ride, idx) => {
        if ((ride.riders || []).includes(r.name)) w.push(allSpeeds[idx]); else wo.push(allSpeeds[idx]);
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
  rides.forEach((r) => {
    const key = String(r.date).slice(0, 7);
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
      rides: rides.length,
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

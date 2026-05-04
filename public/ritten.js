// Ritten — public read view + delete (if admin)

const monthsNL = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];
const $ = (sel) => document.querySelector(sel);
const ridesList = $('#ridesList');

let rides = [];
let searchTerm = '';

async function loadRides() {
  try {
    const res = await fetch('/api/rides');
    if (!res.ok) throw new Error(res.status);
    rides = await res.json();
  } catch (e) {
    rides = [];
    ridesList.innerHTML = '<p class="empty-state">Kon ritten niet laden.</p>';
    return;
  }
  render();
}

function parseTimeToHours(t) {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

function fmtBadge(iso) {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, '0'), month: monthsNL[d.getMonth()] };
}

function fmtLong(iso) {
  return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function render() {
  renderStats();
  renderList();
}

function renderStats() {
  const total = rides.length;
  const totalKm = rides.reduce((a, r) => a + Number(r.km), 0);
  const totalHours = rides.reduce((a, r) => a + parseTimeToHours(r.time), 0);
  const totalCafe = rides.reduce((a, r) => a + Number(r.cafe), 0);
  const avgSpeed = totalHours > 0 ? totalKm / totalHours : 0;
  const avgCafe = total > 0 ? totalCafe / total : 0;

  $('#totalRides').textContent = total;
  $('#totalKm').textContent = totalKm.toFixed(1);
  $('#totalTime').textContent = totalHours.toFixed(1);
  $('#avgSpeed').textContent = avgSpeed.toFixed(1);
  $('#totalCafe').textContent = totalCafe.toFixed(2);
  $('#avgCafe').textContent = avgCafe.toFixed(2);
}

function renderList() {
  if (!rides.length) {
    ridesList.innerHTML = '<p class="empty-state">Nog geen ritten geregistreerd. Voeg er eentje toe via de gele <strong>+</strong>-knop rechtsonder.</p>';
    return;
  }

  const filtered = rides.filter((r) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return r.title.toLowerCase().includes(t)
      || r.riders.some((rd) => rd.toLowerCase().includes(t))
      || (r.notes || '').toLowerCase().includes(t);
  });

  if (!filtered.length) {
    ridesList.innerHTML = '<p class="empty-state">Geen ritten gevonden voor die zoekterm.</p>';
    return;
  }

  ridesList.innerHTML = filtered.map((r) => {
    const badge = fmtBadge(r.date);
    const speed = parseTimeToHours(r.time) > 0 ? (Number(r.km) / parseTimeToHours(r.time)).toFixed(1) : '—';
    const perPerson = r.riders.length > 0 ? (Number(r.cafe) / r.riders.length).toFixed(2) : '0';
    return `
      <article class="ride-card${r.photo ? ' with-photo' : ''}" data-id="${r.id}">
        ${r.photo ? `<a href="${escapeHtml(r.photo)}" target="_blank" class="ride-card-photo"><img src="${escapeHtml(r.photo)}" alt="${escapeHtml(r.title)}"></a>` : ''}
        <div class="ride-card-date">
          <div class="ride-card-day">${badge.day}</div>
          <div class="ride-card-month">${badge.month}</div>
        </div>
        <div class="ride-card-body">
          <h3>${escapeHtml(r.title)}</h3>
          <div class="ride-card-meta">
            <span>📅 ${escapeHtml(fmtLong(r.date))}</span>
            <span>📏 ${Number(r.km).toFixed(1)} km</span>
            <span>⏱️ ${escapeHtml(r.time)}</span>
            <span>⚡ ${speed} km/u</span>
            <span>👥 ${r.riders.length} renners</span>
          </div>
          <div class="ride-card-riders">
            ${r.riders.map((rd) => `<span class="rider-pill">${escapeHtml(rd)}</span>`).join('')}
          </div>
          ${r.notes ? `<p class="ride-card-notes">"${escapeHtml(r.notes)}"</p>` : ''}
        </div>
        <div class="ride-card-cafe">
          <div class="ride-card-cafe-label">Café</div>
          <div class="ride-card-cafe-amount">€ ${Number(r.cafe).toFixed(2)}</div>
          <div class="ride-card-cafe-label" style="margin-top:0.4rem">€ ${perPerson} p.p.</div>
          <button class="delete-ride" data-id="${r.id}">Verwijderen</button>
        </div>
      </article>
    `;
  }).join('');

  ridesList.querySelectorAll('.delete-ride').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deze rit verwijderen?')) return;
      const res = await fetch(`/api/rides/${btn.dataset.id}`, { method: 'DELETE' });
      if (!res.ok) return alert('Mislukt');
      loadRides();
    });
  });
}

const search = $('#search');
if (search) search.addEventListener('input', (e) => { searchTerm = e.target.value; renderList(); });

loadRides();

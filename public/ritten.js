// Ritten — public read view + edit + delete

const monthsNL = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];
const $ = (sel) => document.querySelector(sel);
const ridesList = $('#ridesList');

let rides = [];
let allMembers = [];
let searchTerm = '';

async function loadRides() {
  try {
    const [ridesRes, membersRes] = await Promise.all([
      fetch('/api/rides'),
      fetch('/api/members')
    ]);
    if (!ridesRes.ok) throw new Error(ridesRes.status);
    rides = await ridesRes.json();
    if (membersRes.ok) allMembers = await membersRes.json();
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
      || r.riders.some((rd) => rd.name.toLowerCase().includes(t))
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
            ${r.riders.map((rd) => `<span class="rider-pill">${escapeHtml(rd.name)}</span>`).join('')}
          </div>
          ${r.notes ? `<p class="ride-card-notes">"${escapeHtml(r.notes)}"</p>` : ''}
        </div>
        <div class="ride-card-cafe">
          <div class="ride-card-cafe-label">Café</div>
          <div class="ride-card-cafe-amount">€ ${Number(r.cafe).toFixed(2)}</div>
          <div class="ride-card-cafe-label" style="margin-top:0.4rem">€ ${perPerson} p.p.</div>
          <button class="edit-ride btn-sm" data-id="${r.id}">Aanpassen</button>
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

  ridesList.querySelectorAll('.edit-ride').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ride = rides.find((r) => r.id === Number(btn.dataset.id));
      if (ride) openEditModal(ride);
    });
  });
}

// ============================================================
// EDIT MODAL
// ============================================================
let editModal = null;

function ensureEditModal() {
  if (editModal) return editModal;
  editModal = document.createElement('div');
  editModal.className = 'modal-backdrop';
  editModal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>Rit aanpassen</h2>
        <button class="modal-close" aria-label="Sluiten">&times;</button>
      </div>
      <form id="editRideForm" class="ride-form" enctype="multipart/form-data">
        <input type="hidden" id="erId">
        <div class="form-row">
          <div class="form-field"><label>Datum</label><input type="date" id="erDate" required></div>
          <div class="form-field"><label>Naam / route</label><input type="text" id="erTitle" required></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Afstand (km)</label><input type="number" id="erKm" step="0.1" min="0" required></div>
          <div class="form-field"><label>Tijd (uu:mm)</label><input type="text" id="erTime" pattern="[0-9]{1,2}:[0-9]{2}" required></div>
          <div class="form-field"><label>Café (€)</label><input type="number" id="erCafe" step="0.01" min="0" required></div>
        </div>
        <div class="form-field">
          <label>Wie reed mee? <span id="erCounter" class="muted" style="font-weight:400">(0 geselecteerd)</span></label>
          <input type="search" id="erRiderSearch" placeholder="Filter leden..." style="margin-bottom:0.4rem">
          <div id="erRiderList" class="rider-picker"></div>
        </div>
        <div class="form-field">
          <label>Foto vervangen (optioneel — laat leeg om te behouden)</label>
          <input type="file" id="erPhoto" accept="image/*">
        </div>
        <div class="form-field">
          <label>Notities</label>
          <textarea id="erNotes" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Opslaan</button>
          <button type="button" class="btn btn-ghost modal-cancel">Annuleer</button>
        </div>
        <p id="erStatus" class="form-status"></p>
      </form>
    </div>
  `;
  document.body.appendChild(editModal);
  editModal.querySelector('.modal-close').addEventListener('click', closeEditModal);
  editModal.querySelector('.modal-cancel').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
  document.getElementById('editRideForm').addEventListener('submit', submitEditForm);
  document.getElementById('erRiderSearch').addEventListener('input', (e) => renderEditRiders(e.target.value));
  return editModal;
}

function renderEditRiders(filter = '', selectedIds = null) {
  const list = document.getElementById('erRiderList');
  const f = filter.toLowerCase();
  const checked = selectedIds || new Set(
    Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value)
  );
  const filtered = allMembers.filter((m) => !f || m.name.toLowerCase().includes(f));
  if (!filtered.length) {
    list.innerHTML = `<p class="muted" style="padding:0.5rem">Geen leden gevonden.</p>`;
    document.getElementById('erCounter').textContent = '(0 geselecteerd)';
    return;
  }
  list.innerHTML = filtered.map((m) => `
    <label class="rider-pick">
      <input type="checkbox" value="${m.id}"${checked.has(String(m.id)) ? ' checked' : ''}>
      <span>${escapeHtml(m.name)}${m.category ? `<span class="muted"> · ${escapeHtml(m.category)}</span>` : ''}</span>
    </label>
  `).join('');
  list.querySelectorAll('input').forEach(c => c.addEventListener('change', updateEditCounter));
  updateEditCounter();
}

function updateEditCounter() {
  const list = document.getElementById('erRiderList');
  const n = list.querySelectorAll('input[type="checkbox"]:checked').length;
  document.getElementById('erCounter').textContent = `(${n} geselecteerd)`;
}

function openEditModal(ride) {
  ensureEditModal();
  document.getElementById('erId').value = ride.id;
  document.getElementById('erDate').value = ride.date;
  document.getElementById('erTitle').value = ride.title;
  document.getElementById('erKm').value = ride.km;
  document.getElementById('erTime').value = ride.time;
  document.getElementById('erCafe').value = ride.cafe;
  document.getElementById('erNotes').value = ride.notes || '';
  document.getElementById('erPhoto').value = '';
  document.getElementById('erRiderSearch').value = '';
  document.getElementById('erStatus').textContent = '';
  const selectedIds = new Set(ride.riders.map(r => String(r.id)));
  renderEditRiders('', selectedIds);
  editModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  if (!editModal) return;
  editModal.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitEditForm(e) {
  e.preventDefault();
  const id = document.getElementById('erId').value;
  const status = document.getElementById('erStatus');
  const memberIds = Array.from(document.querySelectorAll('#erRiderList input:checked')).map(c => Number(c.value));
  if (!memberIds.length) { status.textContent = '✗ Selecteer minstens één renner'; return; }

  const fd = new FormData();
  fd.append('date', document.getElementById('erDate').value);
  fd.append('title', document.getElementById('erTitle').value.trim());
  fd.append('km', document.getElementById('erKm').value);
  fd.append('time', document.getElementById('erTime').value.trim());
  fd.append('cafe', document.getElementById('erCafe').value);
  fd.append('member_ids', JSON.stringify(memberIds));
  fd.append('notes', document.getElementById('erNotes').value.trim());
  const photo = document.getElementById('erPhoto');
  if (photo.files[0]) fd.append('photo', photo.files[0]);

  status.textContent = 'Opslaan...';
  try {
    const res = await fetch(`/api/rides/${id}`, { method: 'PATCH', body: fd });
    if (!res.ok) throw new Error((await res.json()).error || res.status);
    status.textContent = '✓ Opgeslagen';
    setTimeout(() => { closeEditModal(); loadRides(); }, 600);
  } catch (err) {
    status.textContent = '✗ ' + err.message;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal && editModal.classList.contains('open')) closeEditModal();
});

const search = $('#search');
if (search) search.addEventListener('input', (e) => { searchTerm = e.target.value; renderList(); });

loadRides();

// Shared site script — mobile nav + floating quick-add button (admin-only)

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initQuickAdd();
});

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
}

function initQuickAdd() {
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.title = 'Rit toevoegen';
  fab.setAttribute('aria-label', 'Rit toevoegen');
  fab.innerHTML = '<span class="fab-icon">+</span><span class="fab-label">Rit toevoegen</span>';
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="qaTitle">
      <div class="modal-header">
        <h2 id="qaTitle">Rit toevoegen</h2>
        <button class="modal-close" aria-label="Sluiten">&times;</button>
      </div>
      <form id="quickAddForm" class="ride-form" enctype="multipart/form-data">
        <div class="form-row">
          <div class="form-field">
            <label for="qaDate">Datum</label>
            <input type="date" id="qaDate" required>
          </div>
          <div class="form-field">
            <label for="qaTitleInput">Naam / route</label>
            <input type="text" id="qaTitleInput" placeholder="bv. Ronse - Kluisbergen" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="qaKm">Afstand (km)</label>
            <input type="number" id="qaKm" step="0.1" min="0" placeholder="85.4" required>
          </div>
          <div class="form-field">
            <label for="qaTime">Tijd (uu:mm)</label>
            <input type="text" id="qaTime" pattern="[0-9]{1,2}:[0-9]{2}" placeholder="2:45" required>
          </div>
          <div class="form-field">
            <label for="qaCafe">Café (€)</label>
            <input type="number" id="qaCafe" step="0.01" min="0" placeholder="42.50" required>
          </div>
        </div>
        <div class="form-field">
          <label for="qaRiders">Wie reed mee? (komma-gescheiden)</label>
          <input type="text" id="qaRiders" placeholder="Jan, Marc, Piet, Sofie" required>
        </div>
        <div class="form-field">
          <label for="qaPhoto">Foto (optioneel)</label>
          <input type="file" id="qaPhoto" accept="image/*">
        </div>
        <div class="form-field">
          <label for="qaNotes">Notities</label>
          <textarea id="qaNotes" rows="2" placeholder="Optioneel — anekdote, weer, plat van wie..."></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Opslaan</button>
          <button type="button" class="btn btn-ghost modal-cancel">Annuleer</button>
        </div>
        <p id="qaStatus" class="form-status"></p>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const open = () => {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!document.getElementById('qaDate').value) {
      document.getElementById('qaDate').valueAsDate = new Date();
    }
    setTimeout(() => document.getElementById('qaTitleInput').focus(), 100);
  };
  const close = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  fab.addEventListener('click', open);
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  document.getElementById('quickAddForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('qaStatus');
    const fd = new FormData();
    fd.append('date', document.getElementById('qaDate').value);
    fd.append('title', document.getElementById('qaTitleInput').value.trim());
    fd.append('km', document.getElementById('qaKm').value);
    fd.append('time', document.getElementById('qaTime').value.trim());
    fd.append('cafe', document.getElementById('qaCafe').value);
    const ridersArr = document.getElementById('qaRiders').value.split(',').map(s => s.trim()).filter(Boolean);
    fd.append('riders', JSON.stringify(ridersArr));
    fd.append('notes', document.getElementById('qaNotes').value.trim());
    const photo = document.getElementById('qaPhoto');
    if (photo && photo.files[0]) fd.append('photo', photo.files[0]);
    status.textContent = 'Opslaan...';
    try {
      const res = await fetch('/api/rides', { method: 'POST', body: fd });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Server gaf ' + res.status);
      }
      status.textContent = '✓ Rit opgeslagen!';
      e.target.reset();
      setTimeout(() => {
        close();
        status.textContent = '';
        if (typeof loadRides === 'function') loadRides();
        else if (typeof loadDashboard === 'function') loadDashboard();
        else window.location.reload();
      }, 700);
    } catch (err) {
      status.textContent = '✗ Kon niet opslaan: ' + err.message;
    }
  });
}

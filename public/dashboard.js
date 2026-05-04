// Dashboard — fetch /api/stats and render charts + leaderboards

const dashboard = document.getElementById('dashboard');
const charts = {};

const palette = {
  primary: '#fbd441',                    // gele trui
  primaryDim: 'rgba(251, 212, 65, 0.6)',
  accent: '#18a558',                     // groene trui
  accentDim: 'rgba(24, 165, 88, 0.6)',
  polka: '#d6275f',                      // bolletjes
  rosa: '#f48fb1',                       // maglia rosa
  success: '#18a558',
  danger: '#d6275f',
  text: '#1f2230',
  textDim: '#6b7080',
  grid: 'rgba(31, 34, 48, 0.08)'
};

async function loadDashboard() {
  let data;
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (e) {
    dashboard.innerHTML = '<p class="empty-state">Kon stats niet laden — draait de server?</p>';
    return;
  }

  if (data.empty) {
    dashboard.innerHTML = `
      <p class="empty-state">
        Nog geen ritten geregistreerd — voeg eerst enkele ritten toe via de gele <strong>+</strong>-knop onderaan,
        of de <a href="ritten.html">ritten-pagina</a>.<br><br>
        Het dashboard wordt automatisch ingevuld zodra er data is.
      </p>`;
    return;
  }

  renderDashboard(data);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderDashboard(data) {
  const { totals, byRider, slowdown, monthly } = data;

  // Top performers
  const topRides = [...byRider].sort((a, b) => b.rides - a.rides).slice(0, 5);
  const topKm = [...byRider].sort((a, b) => b.km - a.km).slice(0, 5);
  const topSpeed = [...byRider].filter(r => r.rides >= 1).sort((a, b) => b.avgSpeed - a.avgSpeed).slice(0, 5);
  const topCafe = [...byRider].sort((a, b) => b.cafeShare - a.cafeShare).slice(0, 5);

  // Slowdown leaders / accelerators
  const withDelta = slowdown.filter(s => s.delta != null);
  const slowest = [...withDelta].sort((a, b) => a.delta - b.delta).slice(0, 5); // most negative
  const fastest = [...withDelta].sort((a, b) => b.delta - a.delta).slice(0, 5); // most positive

  dashboard.innerHTML = `
    <div class="ride-stats">
      <div class="ride-stat">
        <div class="ride-stat-label">Ritten</div>
        <div class="ride-stat-value">${totals.rides}</div>
      </div>
      <div class="ride-stat">
        <div class="ride-stat-label">Totaal km</div>
        <div class="ride-stat-value">${totals.km.toLocaleString('nl-BE')}</div>
      </div>
      <div class="ride-stat">
        <div class="ride-stat-label">Totaal uur</div>
        <div class="ride-stat-value">${totals.hours.toFixed(1)}</div>
      </div>
      <div class="ride-stat">
        <div class="ride-stat-label">Gem. snelheid</div>
        <div class="ride-stat-value">${totals.avgSpeed.toFixed(1)}<span style="font-size:.7em">km/u</span></div>
      </div>
      <div class="ride-stat highlight">
        <div class="ride-stat-label">Toogrekening</div>
        <div class="ride-stat-value">€ ${totals.cafe.toFixed(0)}</div>
      </div>
      <div class="ride-stat">
        <div class="ride-stat-label">Renners</div>
        <div class="ride-stat-value">${byRider.length}</div>
      </div>
    </div>

    <h2>🏆 Leaderboards</h2>
    <div class="leaderboard-grid">
      ${leaderboard('🚴 Meeste ritten', topRides, 'rides', '')}
      ${leaderboard('📏 Meeste kilometers', topKm, 'km', 'km')}
      ${leaderboard('⚡ Snelste gemiddelde', topSpeed, 'avgSpeed', 'km/u')}
      ${leaderboard('🍺 Toogkampioen', topCafe, 'cafeShare', '€', true)}
    </div>

    <h2 class="mt-large">📊 Activiteit</h2>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>Ritten per renner</h3>
        <div class="chart-wrap"><canvas id="chartRides"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Kilometers per renner</h3>
        <div class="chart-wrap"><canvas id="chartKm"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Gemiddelde snelheid per renner</h3>
        <div class="chart-wrap"><canvas id="chartSpeed"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Toogbijdrage per renner</h3>
        <div class="chart-wrap"><canvas id="chartCafe"></canvas></div>
      </div>
    </div>

    ${monthly.length > 1 ? `
      <h2 class="mt-large">📅 Trend per maand</h2>
      <div class="chart-card chart-card-wide">
        <div class="chart-wrap chart-wrap-wide"><canvas id="chartMonthly"></canvas></div>
      </div>
    ` : ''}

    <h2 class="mt-large">🐢 Trage- en snelle-renner-effect</h2>
    <p class="lead" style="font-size:1rem">
      Voor elke renner: gemiddelde snelheid van ritten <strong>met</strong> hen erbij vs. ritten <strong>zonder</strong>.
      Een negatieve delta betekent: het peloton rijdt trager wanneer deze renner meedoet. Positief = juist sneller.
    </p>

    <div class="two-col">
      <div>
        <h3>🐢 Tempo zakt het meest</h3>
        ${slowdown.length === 0 ? '<p class="empty-state">Onvoldoende data (minimum 2 ritten met én zonder een renner nodig).</p>' :
          slowdownTable(slowest, 'down')}
      </div>
      <div>
        <h3>🚀 Tempo gaat omhoog</h3>
        ${slowdown.length === 0 ? '<p class="empty-state">Onvoldoende data.</p>' :
          slowdownTable(fastest, 'up')}
      </div>
    </div>

    ${slowdown.length > 0 ? `
      <h2 class="mt-large">📊 Snelheidseffect per renner</h2>
      <p class="lead" style="font-size:1rem">Verschil in groepsgemiddelde wanneer deze renner meedoet, t.o.v. wanneer niet.</p>
      <div class="chart-card chart-card-wide">
        <div class="chart-wrap chart-wrap-wide"><canvas id="chartSlowdown"></canvas></div>
      </div>
    ` : ''}

    <h2 class="mt-large">📋 Volledige tabel</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Renner</th>
            <th>Ritten</th>
            <th>Km</th>
            <th>Uur</th>
            <th>Gem. km/rit</th>
            <th>Gem. snelheid</th>
            <th>Toog (aandeel)</th>
          </tr>
        </thead>
        <tbody>
          ${byRider.map(r => `
            <tr>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td>${r.rides}</td>
              <td>${r.km.toFixed(1)}</td>
              <td>${r.hours.toFixed(1)}</td>
              <td>${r.avgKmPerRide.toFixed(1)}</td>
              <td>${r.avgSpeed.toFixed(1)} km/u</td>
              <td>€ ${r.cafeShare.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  drawCharts(byRider, slowdown, monthly);
}

function leaderboard(title, items, key, unit, isMoney = false) {
  if (!items.length) return '';
  const max = Math.max(...items.map(i => i[key])) || 1;
  return `
    <div class="leader-card">
      <h3>${title}</h3>
      <ol class="leader-list">
        ${items.map((it, i) => `
          <li>
            <span class="leader-rank">${i + 1}</span>
            <span class="leader-name">${escapeHtml(it.name)}</span>
            <span class="leader-bar"><span style="width:${(it[key] / max * 100).toFixed(1)}%"></span></span>
            <span class="leader-value">${isMoney ? '€ ' : ''}${typeof it[key] === 'number' ? it[key].toFixed(isMoney || key === 'avgSpeed' ? 1 : (key === 'rides' ? 0 : 0)) : it[key]}${unit ? ' ' + unit : ''}</span>
          </li>
        `).join('')}
      </ol>
    </div>
  `;
}

function slowdownTable(items, dir) {
  if (!items.length) return '<p class="empty-state">Nog geen data.</p>';
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Renner</th>
            <th>Met</th>
            <th>Zonder</th>
            <th>Δ</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(s => `
            <tr>
              <td><strong>${escapeHtml(s.name)}</strong> <span class="muted">(${s.rides}×)</span></td>
              <td>${s.avgWith.toFixed(1)}</td>
              <td>${s.avgWithout != null ? s.avgWithout.toFixed(1) : '—'}</td>
              <td class="${dir === 'down' ? 'delta-down' : 'delta-up'}">${s.delta != null ? (s.delta > 0 ? '+' : '') + s.delta.toFixed(1) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function commonOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: palette.text } } },
    scales: {
      x: { ticks: { color: palette.textDim }, grid: { color: palette.grid } },
      y: { ticks: { color: palette.textDim }, grid: { color: palette.grid }, beginAtZero: true }
    }
  };
}

function drawCharts(byRider, slowdown, monthly) {
  // Sort for nicer charts
  const top = byRider.slice(0, 12);
  const labels = top.map(r => r.name);

  destroyChart('chartRides');
  charts.chartRides = new Chart(document.getElementById('chartRides'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Ritten', data: top.map(r => r.rides), backgroundColor: palette.primary }]
    },
    options: commonOpts()
  });

  destroyChart('chartKm');
  charts.chartKm = new Chart(document.getElementById('chartKm'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Kilometers', data: top.map(r => r.km), backgroundColor: palette.accent }]
    },
    options: commonOpts()
  });

  destroyChart('chartSpeed');
  charts.chartSpeed = new Chart(document.getElementById('chartSpeed'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Gem. km/u', data: top.map(r => r.avgSpeed), backgroundColor: palette.success }]
    },
    options: commonOpts()
  });

  destroyChart('chartCafe');
  charts.chartCafe = new Chart(document.getElementById('chartCafe'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: '€ toog (aandeel)', data: top.map(r => r.cafeShare), backgroundColor: palette.polka }]
    },
    options: commonOpts()
  });

  if (monthly.length > 1) {
    destroyChart('chartMonthly');
    charts.chartMonthly = new Chart(document.getElementById('chartMonthly'), {
      type: 'line',
      data: {
        labels: monthly.map(m => m.month),
        datasets: [
          {
            label: 'Kilometers',
            data: monthly.map(m => m.km),
            borderColor: '#c89a00',
            backgroundColor: 'rgba(251, 212, 65, 0.2)',
            fill: true,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: '€ café',
            data: monthly.map(m => m.cafe),
            borderColor: palette.polka,
            backgroundColor: 'rgba(214, 39, 95, 0.15)',
            fill: true,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: palette.text } } },
        scales: {
          x: { ticks: { color: palette.textDim }, grid: { color: palette.grid } },
          y: { position: 'left', ticks: { color: palette.textDim }, grid: { color: palette.grid }, beginAtZero: true, title: { display: true, text: 'km', color: palette.textDim } },
          y1: { position: 'right', ticks: { color: palette.textDim }, grid: { drawOnChartArea: false }, beginAtZero: true, title: { display: true, text: '€', color: palette.textDim } }
        }
      }
    });
  }

  if (slowdown.length > 0) {
    const sorted = [...slowdown].filter(s => s.delta != null).sort((a, b) => a.delta - b.delta);
    destroyChart('chartSlowdown');
    charts.chartSlowdown = new Chart(document.getElementById('chartSlowdown'), {
      type: 'bar',
      data: {
        labels: sorted.map(s => s.name),
        datasets: [{
          label: 'Δ km/u (met − zonder)',
          data: sorted.map(s => s.delta),
          backgroundColor: sorted.map(s => s.delta < 0 ? palette.danger : palette.success)
        }]
      },
      options: {
        ...commonOpts(),
        scales: {
          x: { ticks: { color: palette.textDim }, grid: { color: palette.grid } },
          y: { ticks: { color: palette.textDim }, grid: { color: palette.grid }, title: { display: true, text: 'km/u verschil', color: palette.textDim } }
        }
      }
    });
  }
}

loadDashboard();

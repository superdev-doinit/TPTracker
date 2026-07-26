// PJ Tissue Tracker — main app script
// Run after DOM is parsed (works on file:// and iOS Safari)
function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

ready(function () {

  // --- Tab switching (delegated + touchend for iOS reliability) ---
  const tabsBar = document.querySelector('.tabs');
  if (tabsBar) {
    const handler = (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      e.preventDefault();
      const targetId = btn.dataset.tab + '-panel';
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Fire a custom event so other modules can react to tab changes
      window.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: btn.dataset.tab } }));
    };
    tabsBar.addEventListener('click', handler);
    tabsBar.addEventListener('touchend', handler, { passive: false });
  }

  // --- Calculator ---
  const $ = (id) => document.getElementById(id);
  const inputs = ['length','width','gsm','sheets','rate','other','ws_mark','ret_mark'];

  function round2(x) { return Math.round(x * 100) / 100; }

  function calc() {
    const L = parseFloat($('length').value) || 0;
    const W = parseFloat($('width').value) || 0;
    const GSM = parseFloat($('gsm').value) || 0;
    const S = parseFloat($('sheets').value) || 0;
    const R = parseFloat($('rate').value) || 0;
    const O = parseFloat($('other').value) || 0;
    const Wsm = parseFloat($('ws_mark').value) || 0;
    const Rm = parseFloat($('ret_mark').value) || 0;

    const weight = (L * W * GSM * S) / 10000;
    const perKg = weight > 0 ? 1000 / weight : 0;
    const paperCost = perKg > 0 ? R / perKg : 0;
    const total = paperCost + O;
    const ws = total + Wsm;
    const ret = total + Rm;

    $('r_weight').textContent = round2(weight).toFixed(2);
    $('r_per_kg').textContent = perKg > 0 ? perKg.toFixed(1) : '—';
    $('r_paper').textContent = paperCost.toFixed(2);
    $('r_other').textContent = O.toFixed(2);
    $('r_total').textContent = total.toFixed(2);
    $('r_ws').textContent = ws.toFixed(2);
    $('r_ret').textContent = ret.toFixed(2);

    // Shape quality
    const shapeEl = $('r_shape');
    if (L > 0 && W > 0) {
      const diff = Math.abs(L - W);
      const ratio = Math.max(L, W) / Math.min(L, W);
      let cls, label, msg;
      if (L === W) {
        cls = 'best'; label = `■ Square ${L}×${W}`;
        msg = 'Square — ideal tissue shape.';
      } else if (diff <= 0.10 * Math.min(L, W)) {
        cls = 'good'; label = `▣ Near-square ${L}×${W} (${ratio.toFixed(2)}:1)`;
        msg = 'Near-square — good tissue shape.';
      } else {
        cls = 'bad'; label = `▭ Rectangular ${L}×${W} (${ratio.toFixed(2)}:1)`;
        msg = 'Rectangular — not a standard tissue shape.';
      }
      shapeEl.className = 'shape-pill ' + cls;
      shapeEl.textContent = label;
      shapeEl.title = msg;
    } else {
      shapeEl.className = 'shape-pill';
      shapeEl.textContent = '—';
      shapeEl.title = '';
    }

    $('formula').textContent =
      `(${L} × ${W} × ${GSM} × ${S}) / 10000 = ${weight.toFixed(2)} g  →  1000 / ${weight.toFixed(2)} = ${perKg.toFixed(1)} pkt/kg`;
  }

  // Listen to BOTH 'input' and 'change' — iOS Safari is inconsistent.
  function wire(id) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', calc);
    el.addEventListener('change', calc);
  }
  inputs.forEach(wire);

  const resetBtn = $('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      $('length').value = 27;
      $('width').value = 27;
      $('gsm').value = 15;
      $('sheets').value = 100;
      $('rate').value = 2;
      $('other').value = 2;
      $('ws_mark').value = 2;
      $('ret_mark').value = 4;
      calc();
    });
  }
  calc();

  // --- Full combination matrix ---
  (function buildMatrix() {
    const lengths  = [27, 28, 29, 30, 31, 32, 33];
    const widths   = [27, 28, 29, 30, 31, 32, 33];
    const gsms     = [15, 30, 45];
    const sheets   = [100, 85, 75, 70, 60, 50];
    const sheetHdr = ['100', '85', '75', '70', '60', '50'];
    const container = document.getElementById('matrix_container');
    const meta = document.getElementById('m_meta');

    function shapeClass(L, W) {
      if (L === W) return 'best';
      const diff = Math.abs(L - W);
      if (diff <= 0.10 * Math.min(L, W)) return 'good';
      return 'bad';
    }

    function render() {
      if (!container) return;
      const rate = parseFloat($('m_rate').value) || 0;
      const other = parseFloat($('m_other').value) || 0;
      const show = $('m_show').value;
      const wsMark = parseFloat($('ws_mark').value) || 2;
      const retMark = parseFloat($('ret_mark').value) || 4;

      let html = '';
      gsms.forEach(gsm => {
        const gsmLabel = gsm === 15 ? '1 ply' : gsm === 30 ? '2 ply' : '3 ply';
        html += `<h4 style="margin: 18px 0 8px; font-size: 14px; color: var(--accent);">
          GSM = ${gsm} (${gsmLabel})
        </h4>`;
        html += '<div class="matrix-wrap"><table class="matrix-table"><thead><tr>';
        html += '<th class="lbl">L × W (cm)</th>';
        sheetHdr.forEach(s => html += `<th>${s} sheets</th>`);
        html += '</tr></thead><tbody>';

        lengths.forEach(L => {
          widths.forEach(W => {
            const cls = shapeClass(L, W);
            html += `<tr><td class="lbl ${cls}">${L} × ${W}</td>`;
            sheets.forEach(S => {
              const w = (L * W * gsm * S) / 10000;
              const perKg = w > 0 ? 1000 / w : 0;
              const paper = perKg > 0 ? rate / perKg : 0;
              let val;
              if (show === 'weight') val = w.toFixed(2) + 'g';
              else if (show === 'paper') val = '₹' + paper.toFixed(2);
              else if (show === 'ws') val = '₹' + (paper + other + wsMark).toFixed(2);
              else if (show === 'ret') val = '₹' + (paper + other + retMark).toFixed(2);
              else val = '₹' + (paper + other).toFixed(2);
              html += `<td class="${cls}">${val}</td>`;
            });
            html += '</tr>';
          });
        });

        html += '</tbody></table></div>';
      });
      container.innerHTML = html;
      if (meta) {
        meta.textContent = `${lengths.length * widths.length * gsms.length * sheets.length} combinations (49 L/W pairs × 3 GSM × 6 sheets)`;
      }
    }

    ['m_rate', 'm_other', 'm_show', 'ws_mark', 'ret_mark'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    render();
  })();

  // --- Service worker (offline support) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  // --- Online/offline indicator ---
  function updateOnlineStatus() {
    const el = document.getElementById('offlineStatus');
    if (!el) return;
    if (navigator.onLine) {
      el.textContent = '● Online';
      el.className = 'offline-status online';
    } else {
      el.textContent = '● Offline (using cache)';
      el.className = 'offline-status offline';
    }
  }
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // ============================================================
  //  SURVEY FORM + DASHBOARD
  // ============================================================
  const SURVEY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzahOY06Aa-qGjpZOlXiSzdEnTN91zLeqn_zQlBEJQ5jPFbtyWYsaNgaRcwrDBblwlb/exec';
  const SHEET_VIEW_URL  = 'https://docs.google.com/spreadsheets/d/1qIWJ16htvwjXoYUVYRr1kbgWqtfyBc6y4ysw7jRlB68/edit?usp=sharing';

  const form = document.getElementById('surveyForm');
  const status = document.getElementById('surveyStatus');
  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');
  const setupStatus = document.getElementById('setupStatus');
  const setupDetail = document.getElementById('setupDetail');
  const setupDot = document.getElementById('setupDot');
  const viewResponsesLink = document.getElementById('viewResponsesLink');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');
  const thankYou = document.getElementById('thankYou');
  const ty_name = document.getElementById('ty_name');
  const ty_business = document.getElementById('ty_business');
  const ty_stats = document.getElementById('ty_stats');
  const ty_another = document.getElementById('ty_another');
  const ty_dashboard = document.getElementById('ty_dashboard');
  const dashboardCard = document.getElementById('dashboardCard');

  if (viewResponsesLink) viewResponsesLink.href = SHEET_VIEW_URL;

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg;
    status.className = 'survey-status ' + (kind || '');
  }

  function setSetup(state, msg, detailHtml) {
    if (!setupStatus) return;
    setupStatus.textContent = msg;
    if (setupDetail) setupDetail.innerHTML = detailHtml || '';
    if (setupDot) setupDot.className = 'setup-dot' + (state === 'ok' ? '' : ' warn');
  }

  // Initial setup indicator
  if (SURVEY_ENDPOINT) {
    setSetup('ok', 'Connected to Google Sheets', ' — fetching stats…');
  } else {
    setSetup('warn', 'Not connected yet',
      ' — deploy <code>Code.gs</code> and paste the Web App URL into <code>js/app.js</code>.');
  }

  // Show/hide the "Other" store type input
  const storeTypeSel = document.getElementById('s_storeType');
  const otherWrap = document.getElementById('s_storeTypeOtherWrap');
  if (storeTypeSel && otherWrap) {
    storeTypeSel.addEventListener('change', () => {
      otherWrap.style.display = storeTypeSel.value === 'Other' ? '' : 'none';
    });
  }

  function collectForm() {
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });
    return data;
  }

  function validate(data) {
    if (!data.name || !data.name.trim()) return 'Name is required.';
    if (!data.phone || !data.phone.trim()) return 'Phone is required.';
    if (!/^[0-9 +\-]{7,15}$/.test(data.phone.trim())) return 'Phone looks invalid.';
    if (!data.role) return 'Please select a role (Owner, Manager, or Worker).';
    if (!data.businessName || !data.businessName.trim()) return 'Store / business name is required.';
    if (!data.storeType) return 'Please select a store type.';
    if (data.storeType === 'Other' && (!data.storeTypeOther || !data.storeTypeOther.trim()))
      return 'Please describe the store type.';
    return null;
  }

  // ---- Fetch stats from the Apps Script ----
  async function fetchStats() {
    if (!SURVEY_ENDPOINT) return null;
    try {
      const url = SURVEY_ENDPOINT + '?action=stats&t=' + Date.now();
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      // Strip the 302 redirect HTML if present — Apps Script sometimes
      // wraps JSON in HTML. Look for the first '{' and last '}'.
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first === -1 || last === -1) return null;
      return JSON.parse(text.slice(first, last + 1));
    } catch (e) {
      console.warn('Stats fetch failed:', e);
      return null;
    }
  }

  function renderStatsInline(stats) {
    if (!stats) return;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statToday').textContent = stats.today;
    document.getElementById('statWeek').textContent  = stats.week;
    document.getElementById('statApp').textContent   = stats.interestedApp;
    document.getElementById('statsRow').style.display = 'grid';
    renderMiniChart(stats.byDay);
  }

  function renderMiniChart(byDay) {
    const chart = document.getElementById('dayChart');
    const wrap  = document.getElementById('chartWrap');
    if (!chart || !byDay || !byDay.length) return;
    const max = Math.max.apply(null, byDay.map(d => d.count)) || 1;
    const today = byDay.length ? byDay[byDay.length - 1].date : null;
    chart.innerHTML = byDay.map(d => {
      const h = Math.max(2, Math.round((d.count / max) * 50));
      const dayShort = d.date.slice(5); // MM-DD
      const cls = 'day-bar' + (d.date === today ? ' today' : '');
      return `<div class="${cls}" style="height: ${h}px;" title="${d.date}: ${d.count}">
        <span class="val">${d.count || ''}</span>
        <span class="lbl">${dayShort}</span>
      </div>`;
    }).join('');
    wrap.style.display = 'block';
  }

  function renderDashboard(stats) {
    if (!stats) return;
    document.getElementById('dash_total').textContent   = stats.total;
    document.getElementById('dash_today').textContent   = stats.today;
    document.getElementById('dash_week').textContent    = stats.week;
    document.getElementById('dash_website').textContent = stats.interestedWebsite;
    document.getElementById('dash_app').textContent     = stats.interestedApp;

    // Big 7-day chart
    const dashChart = document.getElementById('dashChart');
    if (stats.byDay && stats.byDay.length) {
      const max = Math.max.apply(null, stats.byDay.map(d => d.count)) || 1;
      const today = stats.byDay[stats.byDay.length - 1].date;
      dashChart.innerHTML = stats.byDay.map(d => {
        const h = Math.max(2, Math.round((d.count / max) * 100));
        const cls = 'day-bar' + (d.date === today ? ' today' : '');
        return `<div class="${cls}" style="height: ${h}px;" title="${d.date}: ${d.count}">
          <span class="val">${d.count || ''}</span>
          <span class="lbl">${d.date.slice(5)}</span>
        </div>`;
      }).join('');
    }

    // Bar lists
    const renderBars = (obj, targetId) => {
      const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
      const max = Math.max.apply(null, entries.map(e => e[1])) || 1;
      const target = document.getElementById(targetId);
      if (!target) return;
      if (!entries.length) { target.innerHTML = '<p class="muted">No data yet.</p>'; return; }
      target.innerHTML = entries.map(([name, count]) => {
        const w = Math.round((count / max) * 100);
        return `<div class="bar-row">
          <span class="bar-name">${name}</span>
          <span class="bar-track"><span class="bar-fill" style="width: ${w}%;"></span></span>
          <span class="bar-count">${count}</span>
        </div>`;
      }).join('');
    };
    renderBars(stats.byStoreType, 'dashStoreType');
    renderBars(stats.byRole, 'dashRole');

    // "Last updated" timestamp
    const updated = document.getElementById('dashUpdated');
    if (updated) {
      const now = new Date();
      updated.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Track when the dashboard tab is opened → fetch fresh stats
  let dashLoaded = false;
  window.addEventListener('tabchange', async (e) => {
    if (e.detail.tab === 'dashboard') {
      if (dashLoaded) return;
      dashLoaded = true;
      const stats = await fetchStats();
      if (stats) renderDashboard(stats);
    } else {
      // reset so re-entering the tab reloads
      dashLoaded = false;
    }
  });

  // Dashboard refresh button
  const dashRefreshBtn = document.getElementById('dashRefreshBtn');
  if (dashRefreshBtn) {
    dashRefreshBtn.addEventListener('click', async () => {
      dashRefreshBtn.disabled = true;
      dashRefreshBtn.textContent = '↻ Refreshing…';
      const stats = await fetchStats();
      if (stats) renderDashboard(stats);
      dashRefreshBtn.disabled = false;
      dashRefreshBtn.textContent = '↻ Refresh';
    });
  }

  // "View dashboard" from thank-you screen → switch tabs
  if (ty_dashboard) {
    ty_dashboard.addEventListener('click', () => {
      const dashTab = document.querySelector('.tab-btn[data-tab="dashboard"]');
      if (dashTab) dashTab.click();
    });
  }

  // ---- Submit handler ----
  let lastSubmission = null;
  async function submitSurvey(e) {
    e.preventDefault();
    if (!SURVEY_ENDPOINT) {
      setStatus('Backend not configured yet. See Code.gs deploy steps below.', 'err');
      return;
    }
    const data = collectForm();
    const err = validate(data);
    if (err) { setStatus(err, 'err'); return; }

    setStatus('Submitting…', 'pending');
    submitBtn.disabled = true;
    try {
      const res = await fetch(SURVEY_ENDPOINT, {
        method: 'POST',
        // No custom headers — Apps Script requires simple CORS
        body: JSON.stringify(data)
      });
      // Apps Script returns JSON wrapped in a 302 HTML page; strip the HTML.
      const text = await res.text();
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      let json = null;
      if (first !== -1 && last !== -1) {
        try { json = JSON.parse(text.slice(first, last + 1)); } catch {}
      }
      if ((res.ok || res.status === 302) && (!json || json.ok !== false)) {
        lastSubmission = { name: data.name, business: data.businessName };
        setStatus('', '');
        // Hide form, show thank-you
        form.style.display = 'none';
        if (ty_name) ty_name.textContent = data.name.split(' ')[0] || data.name;
        if (ty_business) ty_business.textContent = data.businessName;
        if (thankYou) {
          thankYou.style.display = 'block';
          thankYou.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Refresh stats
        const stats = await fetchStats();
        if (stats) {
          renderStatsInline(stats);
          if (ty_stats) {
            const s = stats;
            ty_stats.textContent =
              `That's survey #${s.total}. ` +
              `${s.today} submitted today, ${s.week} this week.`;
          }
        }
      } else {
        setStatus('Save failed: ' + ((json && json.error) || res.statusText || 'unknown'), 'err');
      }
    } catch (networkErr) {
      setStatus('Network error: ' + networkErr.message + '. Check connectivity.', 'err');
    } finally {
      submitBtn.disabled = false;
    }
  }

  function showFormAgain() {
    form.reset();
    if (otherWrap) otherWrap.style.display = 'none';
    form.style.display = '';
    if (thankYou) thankYou.style.display = 'none';
    setStatus('', '');
    document.getElementById('s_name').focus();
  }

  if (form) form.addEventListener('submit', submitSurvey);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      form.reset();
      if (otherWrap) otherWrap.style.display = 'none';
      setStatus('', '');
    });
  }

  if (ty_another) ty_another.addEventListener('click', showFormAgain);

  // ty_dashboard handler is registered earlier (switches to the Dashboard tab)

  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', async () => {
      refreshStatsBtn.disabled = true;
      refreshStatsBtn.textContent = '↻ Refreshing…';
      const stats = await fetchStats();
      if (stats) {
        renderStatsInline(stats);
        // Also refresh the dashboard if it's been loaded
        if (dashLoaded) renderDashboard(stats);
      }
      refreshStatsBtn.disabled = false;
      refreshStatsBtn.textContent = '↻ Refresh stats';
    });
  }

  // Initial stats fetch on load
  (async () => {
    const stats = await fetchStats();
    if (stats) {
      setSetup('ok', '✓ Connected to Google Sheets',
        ` — ${stats.total} ${stats.total === 1 ? 'survey' : 'surveys'} so far, ${stats.today} today.`);
      renderStatsInline(stats);
    } else if (SURVEY_ENDPOINT) {
      setSetup('warn', 'Connected, but stats unavailable',
        ' — the Sheet may be empty or the script is still warming up.');
    }
  })();

}); // end ready()

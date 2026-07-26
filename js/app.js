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
  //  SURVEY FORM
  // ============================================================
  // After deploying Code.gs as a Web App, paste the URL here:
  const SURVEY_ENDPOINT = ''; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'

  const form = document.getElementById('surveyForm');
  const status = document.getElementById('surveyStatus');
  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');
  const setupStatus = document.getElementById('setupStatus');
  const setupDetail = document.getElementById('setupDetail');

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg;
    status.className = 'survey-status ' + (kind || '');
  }

  // Show whether the Apps Script endpoint is configured
  if (setupStatus) {
    if (SURVEY_ENDPOINT) {
      setupStatus.textContent = '✓ Connected to Google Sheets';
      setupStatus.style.color = '#1f6b4a';
      setupStatus.style.fontWeight = '600';
      if (setupDetail) setupDetail.textContent = ' — submissions go straight to your Sheet.';
    } else {
      setupStatus.textContent = '⚠ Not connected yet';
      setupStatus.style.color = '#a83a25';
      setupStatus.style.fontWeight = '600';
      if (setupDetail) {
        setupDetail.innerHTML =
          ' — open <code>Code.gs</code> in the repo, follow the deploy steps, ' +
          'and paste the Web App URL into <code>js/app.js</code> (look for <code>SURVEY_ENDPOINT</code>).';
      }
    }
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
      // Google Apps Script expects text/plain (CORS quirk) — JSON.stringify works.
      const res = await fetch(SURVEY_ENDPOINT, {
        method: 'POST',
        // No custom headers — Apps Script rejects requests with non-simple headers
        body: JSON.stringify(data)
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { ok: res.ok, raw: text }; }
      if (res.ok && json.ok !== false) {
        setStatus('✓ Saved to Google Sheets. Thank you!', 'ok');
        form.reset();
        if (otherWrap) otherWrap.style.display = 'none';
      } else {
        setStatus('Save failed: ' + (json.error || res.statusText || 'unknown error'), 'err');
      }
    } catch (networkErr) {
      setStatus('Network error: ' + networkErr.message + '. Check connectivity and the endpoint URL.', 'err');
    } finally {
      submitBtn.disabled = false;
    }
  }

  if (form) {
    form.addEventListener('submit', submitSurvey);
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      form.reset();
      if (otherWrap) otherWrap.style.display = 'none';
      setStatus('', '');
    });
  }

}); // end ready()

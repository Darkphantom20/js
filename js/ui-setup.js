/* ============================================================
 * ui-setup.js — loading screen + first-run setup wizard.
 * ============================================================ */

function loadingScreen(msg = 'Connecting to your database…') {
  return `
  <div class="loading-wrap">
    <div class="loading-card">
      <div class="spin"></div>
      <div style="font-weight:700">${esc(msg)}</div>
    </div>
  </div>`;
}

function setupScreen(errorMsg) {
  const creds = getCreds() || {};
  return `
  <div class="setup-wrap">
    <div class="setup-inner">

      <div class="brandrow">
        <div class="mark">🌾</div>
        <div>
          <h1>Welcome to Golden Grain</h1>
          <div class="sub">Connect your Supabase project to bring the shop online.</div>
        </div>
      </div>

      <div class="setup-card">
        <h2>Setup — takes about 2 minutes</h2>
        <p class="lead">You only do this once. The credentials stay in your browser.</p>

        <div class="step">
          <div class="num">1</div>
          <div class="body">
            <h3>Create a Supabase project</h3>
            <p>Go to <a href="https://supabase.com" target="_blank" rel="noopener" style="color:var(--green);font-weight:600">supabase.com</a> → New project. Free tier is plenty for this prototype.</p>
          </div>
        </div>

        <div class="step">
          <div class="num">2</div>
          <div class="body">
            <h3>Run the setup SQL</h3>
            <p>Open <strong>SQL Editor</strong> in your project, paste the SQL below and click <strong>Run</strong>. It creates the tables, adds a storage bucket for rice photos, and seeds 6 demo varieties.</p>
            <div class="sql-block">
              <button class="copy-btn" data-act="copy-sql">Copy SQL</button>
              <pre id="sqlText">${esc(SQL_SCHEMA)}</pre>
            </div>
          </div>
        </div>

        <div class="step" style="margin-bottom:8px">
          <div class="num">3</div>
          <div class="body">
            <h3>Paste your project credentials</h3>
            <p>In Supabase, go to <strong>Project Settings → API</strong>. Copy the <em>Project URL</em> and the <em>publishable / anon</em> key.</p>

            <form id="connectForm">
              <div class="fields">
                <label class="field wide">
                  <span>Project URL</span>
                  <input type="text" id="cfgUrl" placeholder="https://xxxxxxxx.supabase.co"
                         value="${esc(creds.url || '')}" required autocomplete="off">
                </label>
                <label class="field wide">
                  <span>Anon / Publishable key</span>
                  <input type="text" id="cfgKey" placeholder="sb_publishable_…  or  ******"
                         value="${esc(creds.key || '')}" required autocomplete="off">
                </label>
              </div>
              <div id="setupStatus" class="setup-status ${errorMsg ? 'err' : ''}">${esc(errorMsg || '')}</div>
              <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
                <button class="btn" type="submit">🔌 Connect & launch shop</button>
                <button class="btn ghost" type="button" data-act="test-conn">Test connection</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div style="color:#a9d0bc;font-size:12.5px;text-align:center">
        Prototype only — the anon key is stored in localStorage. Lock down RLS before production use.
      </div>
    </div>
  </div>`;
}

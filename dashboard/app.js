// ── State Management ────────────────────────────────────────────────────────
const state = {
  activeTab: 'tests',
  tests: [
    {
      id: 1,
      name: 'KMS Login via Authenticator',
      url: 'https://qa3-kms.kinesis.money/home',
      zephyrId: 'SFT-T74',
      suite: 'Signup Flow',
      type: 'Web (Desktop)',
      runTime: '1:08',
      steps: 21,
      lastRun: 'Feb 4th 2026',
      created: 'Feb 4th 2026',
      status: 'passed'
    }
  ],
  variables: [
    {
      id: 1,
      key: 'login_button',
      desc: 'Salesforce central login submit button',
      fallbacks: [
        "[data-testid='login']",
        "button[type='submit']",
        "text=Login"
      ]
    },
    {
      id: 2,
      key: 'verification_code_field',
      desc: '2FA verification code input field',
      fallbacks: [
        "input[name='otc']",
        "#otc-input",
        "placeholder='Enter code'"
      ]
    }
  ],
  runs: [
    {
      id: 'RUN-124',
      testName: 'KMS Login via Authenticator',
      zephyrId: 'SFT-T74',
      status: 'passed',
      time: 'Feb 4th 2026, 11:01 PM'
    }
  ],
  consoleLogs: []
};

// ── App Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFormHandlers();
  renderActiveTab();
});

// ── Navigation Setup ────────────────────────────────────────────────────────
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      state.activeTab = item.getAttribute('data-tab');
      renderActiveTab();
    });
  });
}

// ── Tab Render Dispatcher ───────────────────────────────────────────────────
function renderActiveTab() {
  const root = document.getElementById('workspace-root');
  
  switch(state.activeTab) {
    case 'tests':
      renderTestsView(root);
      break;
    case 'suites':
      renderSuitesView(root);
      break;
    case 'runs':
      renderRunsView(root);
      break;
    case 'globals':
      renderGlobalsView(root);
      break;
  }
}

// ── 1. Tests View ──────────────────────────────────────────────────────────
function renderTestsView(container) {
  const passedCount = state.tests.filter(t => t.status === 'passed').length;
  const failedCount = state.tests.filter(t => t.status === 'failed').length;
  const runningCount = state.tests.filter(t => t.status === 'running').length;

  container.innerHTML = `
    <div class="split-view">
      <div class="split-sidebar">
        <h4 class="section-hdr">Tests</h4>
        <ul class="folder-list">
          <li class="folder-item active">All Tests <span class="badge">${state.tests.length}</span></li>
          <li class="folder-item">+ Add Folder</li>
        </ul>
        <h4 class="section-hdr" style="margin-top: 15px;">Segments</h4>
        <ul class="folder-list">
          <li class="folder-item">All Segments <span class="badge">0</span></li>
          <li class="folder-item">+ Add Segment</li>
        </ul>
      </div>
      
      <div class="split-content">
        <div class="control-bar">
          <h2>All Tests</h2>
          <button class="btn primary" onclick="openModal('test-modal')">Create Test</button>
        </div>

        <div class="subtabs">
          <button class="subtab active">Web</button>
          <button class="subtab">Mobile</button>
          <button class="subtab">API</button>
        </div>

        <div class="control-bar">
          <input type="text" class="search-input" placeholder="Search Tests..." oninput="filterTests(this.value)">
          <div class="filter-group">
            <button class="filter-tab active">All</button>
            <button class="filter-tab">Passed <span class="tab-badge passed">${passedCount}</span></button>
            <button class="filter-tab">Failed <span class="tab-badge failed">${failedCount}</span></button>
            <button class="filter-tab">Running <span class="tab-badge running">${runningCount}</span></button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th width="30"><input type="checkbox"></th>
              <th>Name</th>
              <th>Type</th>
              <th>Run Time</th>
              <th>Last Run</th>
              <th>Created</th>
              <th>Zephyr ID</th>
            </tr>
          </thead>
          <tbody id="tests-table-body">
            ${state.tests.map(test => `
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  <span class="status-indicator ${test.status}"></span>
                  <strong>${test.name}</strong>
                  <span class="test-link">${test.url}</span>
                </td>
                <td><span class="pill">${test.type}</span></td>
                <td>
                  <div>${test.runTime}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${test.steps} steps</div>
                </td>
                <td>${test.lastRun}</td>
                <td>${test.created}</td>
                <td><span class="pill" style="background-color: #EBF8FF; color: #2B6CB0; font-weight: bold;">${test.zephyrId}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 2. Suites View ──────────────────────────────────────────────────────────
function renderSuitesView(container) {
  container.innerHTML = `
    <div class="split-view">
      <div class="split-sidebar">
        <h4 class="section-hdr">Suites</h4>
        <ul class="folder-list">
          <li class="folder-item active">All Suites <span class="badge">2</span></li>
        </ul>
      </div>
      <div class="split-content">
        <div class="control-bar">
          <h2>Suites & Folders</h2>
          <button class="btn primary">Create Suite</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Suite Name</th>
              <th>Description</th>
              <th>Linked Tests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Signup Flow</strong></td>
              <td>Verifies KMS Signup pipelines and email checks</td>
              <td>1 Test</td>
              <td><button class="btn secondary">View</button></td>
            </tr>
            <tr>
              <td><strong>Salesforce Integration</strong></td>
              <td>End-to-end user sync tests between KMS and SF</td>
              <td>0 Tests</td>
              <td><button class="btn secondary">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 3. Runs View (Execution Console) ────────────────────────────────────────
function renderRunsView(container) {
  container.innerHTML = `
    <div class="split-view">
      <div class="split-sidebar">
        <h4 class="section-hdr">Run Configurations</h4>
        <div class="form-group" style="padding: 0; margin-bottom: 15px;">
          <label>Target Test</label>
          <select id="run-test-select" style="width: 100%; margin-top: 5px;">
            ${state.tests.map(t => `<option value="${t.id}">${t.name} (${t.zephyrId})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="padding: 0; margin-bottom: 15px;">
          <label>Mode</label>
          <select id="run-mode-select" style="width: 100%; margin-top: 5px;">
            <option value="headless">Headless (Background)</option>
            <option value="headed">Headed (Show Browser)</option>
          </select>
        </div>
        <button class="btn primary" style="width: 100%;" onclick="startMockRun()">Run Test Now</button>
      </div>

      <div class="split-content">
        <h2>Test Runs</h2>
        
        <div class="console-box" id="console-output">
          <div class="console-line info">Console ready. Select configuration and click "Run Test Now" to execute.</div>
        </div>

        <h3 style="margin-top: 20px;">Execution History</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Test Case</th>
              <th>Zephyr Key</th>
              <th>Status</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody id="runs-table-body">
            ${state.runs.map(run => `
              <tr>
                <td><strong>${run.id}</strong></td>
                <td>${run.testName}</td>
                <td><span class="pill" style="background-color: #EBF8FF; color: #2B6CB0;">${run.zephyrId}</span></td>
                <td><span class="status-indicator ${run.status}"></span>${run.status.toUpperCase()}</td>
                <td>${run.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 4. Globals View (Variables / Locators Masterlist) ──────────────────────
function renderGlobalsView(container) {
  container.innerHTML = `
    <div class="split-view">
      <div class="split-sidebar">
        <h4 class="section-hdr">Globals</h4>
        <ul class="folder-list">
          <li class="folder-item active">Account Variables <span class="badge">0</span></li>
          <li class="folder-item">Secrets <span class="badge">1</span></li>
        </ul>
      </div>

      <div class="split-content">
        <div class="control-bar">
          <div>
            <h2>Variables</h2>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Identifiers assigned to test steps used to copy and assert on values with multiple fallbacks.
            </p>
          </div>
          <button class="btn primary" onclick="openModal('var-modal')">+ Add Variable</button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Key / Variable Name</th>
              <th>Description</th>
              <th>Priority 1 Fallback</th>
              <th>Priority 2 Fallback</th>
              <th>Priority 3 Fallback</th>
            </tr>
          </thead>
          <tbody>
            ${state.variables.map(v => `
              <tr>
                <td><strong>${v.key}</strong></td>
                <td style="color: var(--text-muted);">${v.desc || 'No description'}</td>
                <td><code>${v.fallbacks[0] || '-'}</code></td>
                <td><code>${v.fallbacks[1] || '-'}</code></td>
                <td><code>${v.fallbacks[2] || '-'}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Mock Runner Execution ────────────────────────────────────────────────────
function startMockRun() {
  const consoleBox = document.getElementById('console-output');
  const selectTest = document.getElementById('run-test-select');
  const testObj = state.tests.find(t => t.id == selectTest.value);
  const runMode = document.getElementById('run-mode-select').value;

  consoleBox.innerHTML = '';
  state.consoleLogs = [];

  const logs = [
    { text: `[Playwright] Launching Chromium browser in ${runMode} mode...`, type: 'info' },
    { text: `[Playwright] Navigating to ${testObj.url}...`, type: 'info' },
    { text: `[Playwright] Executing verification test steps...`, type: 'info' },
    { text: `[Playwright] Injecting email: ${Date.now()}.etiqoodhhm@testmail.getscandium.com`, type: 'info' },
    { text: `[Playwright] Locating 2FA Field with fallbacks: [${state.variables[1].fallbacks.join(', ')}]`, type: 'info' },
    { text: `[Playwright] Step success: 2FA Input visible and validated.`, type: 'success' },
    { text: `[Zephyr Scale] Publishing run result to ${testObj.zephyrId} (Cycle SFT-R79)...`, type: 'info' },
    { text: `[Zephyr Scale] Success! Created execution ID: 2842982115.`, type: 'success' },
    { text: `[Playwright] Run finished: PASSED (100% assertions met).`, type: 'success' }
  ];

  let i = 0;
  function printLog() {
    if (i < logs.length) {
      const div = document.createElement('div');
      div.className = `console-line ${logs[i].type}`;
      div.innerText = logs[i].text;
      consoleBox.appendChild(div);
      consoleBox.scrollTop = consoleBox.scrollHeight;
      i++;
      setTimeout(printLog, 800);
    } else {
      // Add to execution history state
      const runId = 'RUN-' + Math.floor(100 + Math.random() * 900);
      state.runs.unshift({
        id: runId,
        testName: testObj.name,
        zephyrId: testObj.zephyrId,
        status: 'passed',
        time: new Date().toLocaleString()
      });
      renderActiveTab();
    }
  }
  printLog();
}

// ── Modals Logic ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ── Form Submit Handlers ─────────────────────────────────────────────────────
function setupFormHandlers() {
  // Test creation
  document.getElementById('create-test-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newTest = {
      id: state.tests.length + 1,
      name: document.getElementById('test-name').value,
      url: document.getElementById('test-url').value,
      zephyrId: document.getElementById('zephyr-id').value,
      suite: document.getElementById('test-suite').value,
      type: 'Web (Desktop)',
      runTime: '--',
      steps: 0,
      lastRun: 'Never',
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'idle'
    };
    
    state.tests.push(newTest);
    closeModal('test-modal');
    renderActiveTab();
    e.target.reset();
  });

  // Global variables creation
  document.getElementById('create-var-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fallbackInputs = document.querySelectorAll('.fallback-input');
    const fallbacks = Array.from(fallbackInputs).map(input => input.value).filter(val => val !== '');

    const newVar = {
      id: state.variables.length + 1,
      key: document.getElementById('var-name').value,
      desc: document.getElementById('var-desc').value,
      fallbacks: fallbacks
    };

    state.variables.push(newVar);
    closeModal('var-modal');
    renderActiveTab();
    e.target.reset();
  });
}

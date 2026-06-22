function getSelectors(el) {
  const fallbacks = [];

  // 1. Test attribute
  const testId = el.getAttribute('data-testid') || el.getAttribute('data-qa');
  if (testId) {
    fallbacks.push(`[data-testid="${testId}"]`);
  }

  // 2. ID attribute
  if (el.id) {
    fallbacks.push(`#${el.id}`);
  }

  // 3. Class selection
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(c => c.trim() && !c.includes(':') && !c.startsWith('Mui') && c.length > 2);
    if (classes.length > 0) {
      fallbacks.push(`.${classes.slice(0, 3).join('.')}`);
    }
  }

  // 4. Button/link specific text selector
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || (tag === 'a' && el.innerText.trim().length < 25)) {
    const text = el.innerText || el.textContent || '';
    if (text.trim()) {
      fallbacks.push(`${tag}:has-text("${text.trim().replace(/"/g, '\\"')}")`);
    }
  }

  // 5. Basic Tag
  fallbacks.push(tag);

  // Return unique non-empty selectors padded to 3 elements
  const unique = Array.from(new Set(fallbacks.filter(Boolean)));
  while (unique.length < 3) unique.push('');
  return unique;
}

// Click recorder
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a, input[type="submit"], input[type="button"], [role="button"], select');
  if (!target) return;

  const fallbacks = getSelectors(target);
  chrome.runtime.sendMessage({
    action: "RECORD_STEP",
    step: {
      id: `step-${Date.now()}`,
      action: "Click",
      selectorType: "manual",
      fallbacks,
      value: ""
    }
  });
}, true);

// Type recorder
document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const type = target.getAttribute('type') || 'text';
    if (['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type) || target.tagName === 'TEXTAREA') {
      const fallbacks = getSelectors(target);
      chrome.runtime.sendMessage({
        action: "RECORD_STEP",
        step: {
          id: `step-${Date.now()}`,
          action: "Type",
          selectorType: "manual",
          fallbacks,
          value: target.value
        }
      });
    }
  }
}, true);

// Check if current tab is recording, if so render indicator
chrome.runtime.sendMessage({ action: "CHECK_RECORDING" }, (response) => {
  if (response && response.isRecording) {
    showRecordingIndicator();
  }
});

function showRecordingIndicator() {
  const id = 'sfqa-recording-indicator';
  if (document.getElementById(id)) return;

  const bar = document.createElement('div');
  bar.id = id;
  bar.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'height:56px',
    'display:flex',
    'align-items:center',
    'gap:16px',
    'padding:0 18px',
    'box-sizing:border-box',
    'background:#2f1f46',
    'color:#ffffff',
    'font:14px Arial, sans-serif',
    'box-shadow:0 2px 10px rgba(0,0,0,0.18)',
    'user-select:none'
  ].join(';');

  const text = document.createElement('span');
  text.textContent = '"SFQA Reflect" Automation Testing started debugging this browser';
  text.style.cssText = 'font-weight:600';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Cancel';
  button.style.cssText = [
    'border:0',
    'border-radius:18px',
    'padding:9px 18px',
    'background:#c7c2ff',
    'color:#170f29',
    'font:600 13px Arial, sans-serif',
    'cursor:pointer'
  ].join(';');
  button.addEventListener('click', () => bar.remove());

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = [
    'margin-left:auto',
    'cursor:pointer',
    'font-size:18px',
    'opacity:0.85',
    'user-select:none',
    'padding:4px'
  ].join(';');
  closeBtn.addEventListener('click', () => bar.remove());

  bar.appendChild(text);
  bar.appendChild(button);
  bar.appendChild(closeBtn);
  
  // Make sure body or html element is ready
  if (document.body) {
    document.body.appendChild(bar);
  } else {
    document.documentElement.appendChild(bar);
  }
}

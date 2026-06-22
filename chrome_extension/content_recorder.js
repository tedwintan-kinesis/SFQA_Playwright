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

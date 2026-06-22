function getSelectors(el) {
  const fallbacks = [];
  const tag = el.tagName.toLowerCase();

  // 1. test-id attributes
  const testId = el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-cy');
  if (testId) {
    fallbacks.push(`[data-testid="${testId}"]`);
    fallbacks.push(`[data-qa="${testId}"]`);
    fallbacks.push(`[data-cy="${testId}"]`);
  }

  // 2. ID attribute
  if (el.id) {
    fallbacks.push(`#${el.id}`);
  }

  // 3. Name attribute
  const name = el.getAttribute('name');
  if (name) {
    fallbacks.push(`${tag}[name="${name}"]`);
  }

  // 4. ARIA label or role attribute
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    fallbacks.push(`[aria-label="${ariaLabel}"]`);
  }
  const role = el.getAttribute('role');
  if (role) {
    fallbacks.push(`${tag}[role="${role}"]`);
  }

  // 5. Placeholder attribute
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) {
    fallbacks.push(`${tag}[placeholder="${placeholder}"]`);
  }

  // 6. Text selector
  const text = el.innerText || el.textContent || '';
  const cleanText = text.trim().replace(/\s+/g, ' ');
  if (cleanText && cleanText.length < 50) {
    fallbacks.push(`${tag}:has-text("${cleanText.replace(/"/g, '\\"')}")`);
    fallbacks.push(`text="${cleanText.replace(/"/g, '\\"')}"`);
  }

  // 7. Class selector
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(c => c.trim() && !c.includes(':') && !c.startsWith('Mui') && c.length > 2);
    if (classes.length > 0) {
      fallbacks.push(`${tag}.${classes.join('.')}`);
      fallbacks.push(`.${classes.join('.')}`);
      fallbacks.push(`${tag}.${classes[0]}`);
    }
  }

  // 8. Full CSS selector path
  const getCssPath = (element) => {
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth > 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(' > ');
  };
  try {
    const cssPath = getCssPath(el);
    if (cssPath) fallbacks.push(cssPath);
  } catch (e) {}

  // 9. XPath
  const getXPath = (element) => {
    if (element.id !== '') return 'id("' + element.id + '")';
    if (element === document.body) return element.tagName.toLowerCase();
    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
    }
  };
  try {
    const xpath = getXPath(el);
    if (xpath) fallbacks.push(`xpath=${xpath}`);
  } catch (e) {}

  // 10. Tag name
  fallbacks.push(tag);

  return Array.from(new Set(fallbacks.filter(Boolean)));
}

// Click recorder
document.addEventListener('click', (event) => {
  let target = event.target.closest('button, a, input, select, textarea, [role="button"]');
  if (!target) {
    const style = window.getComputedStyle(event.target);
    if (style.cursor === 'pointer' || event.target.onclick) {
      target = event.target;
    }
  }
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

// content_runner.js
// Injected by background.js to execute a single step in the DOM

window.sfqaRunStep = async function(step) {
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  
  function findElement(fallbacks) {
    for (const sel of fallbacks) {
      if (!sel) continue;
      try {
        let el = null;
        if (sel.startsWith('text=')) {
          const text = sel.slice(5).replace(/^"|"$/g, '').toLowerCase();
          const elements = Array.from(document.querySelectorAll('button, a, div, span, p, h1, h2, h3, input, label'));
          el = elements.find(e => (e.innerText || e.textContent || '').toLowerCase().includes(text));
        } else if (sel.startsWith('xpath=')) {
          const xpath = sel.slice(6);
          el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } else if (sel.startsWith('role=')) {
          // Naive role parser: role=button[name="Submit"i]
          const match = sel.match(/role=(\w+)(?:\[name="([^"]+)"i\])?/);
          if (match) {
            const role = match[1];
            const name = match[2]?.toLowerCase();
            const elements = Array.from(document.querySelectorAll(`[role="${role}"], ${role}`));
            if (name) {
              el = elements.find(e => (e.innerText || e.textContent || '').toLowerCase().includes(name));
            } else {
              el = elements[0];
            }
          }
        } else if (sel.startsWith('internal:')) {
            // Very naive internal parser
            const match = sel.match(/="([^"]+)"/);
            if (match) {
               const val = match[1].toLowerCase();
               const elements = Array.from(document.querySelectorAll('*'));
               el = elements.find(e => 
                 (e.placeholder || '').toLowerCase() === val ||
                 (e.alt || '').toLowerCase() === val ||
                 (e.title || '').toLowerCase() === val ||
                 (e.innerText || '').toLowerCase().includes(val)
               );
            }
        } else {
          el = document.querySelector(sel);
        }
        if (el) {
          // Scroll into view
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return el;
        }
      } catch (e) {}
    }
    return null;
  }

  // Wait for element to appear
  let target = null;
  for (let i = 0; i < 30; i++) {
    target = findElement(step.fallbacks);
    if (target) break;
    await sleep(200);
  }

  if (!target && step.action !== "Wait" && step.action !== "Javascript" && step.action !== "Execute JS") {
    throw new Error(`Element not found: ${(step.fallbacks || []).join(', ')}`);
  }

  switch (step.action) {
    case "Click":
      target.click();
      break;
    case "Type":
      target.value = step.value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    case "Wait":
      await sleep(parseInt(step.value, 10) || 1000);
      break;
    case "Javascript":
    case "Execute JS":
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(step.value);
        await fn();
      } catch (e) {
        throw new Error(`Javascript error: ${e.message}`);
      }
      break;
    case "Assert Text":
    case "AssertText":
      const actualText = target.innerText || target.textContent || target.value || '';
      if (!actualText.includes(step.value)) {
        throw new Error(`Assertion failed: expected "${step.value}", got "${actualText}"`);
      }
      break;
  }
  
  // Brief pause after action
  await sleep(300);
  return true;
};

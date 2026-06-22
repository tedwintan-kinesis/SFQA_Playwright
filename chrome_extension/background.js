let dashboardTabId = null;
let recordingTabId = null;

function injectIndicator(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
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
        'font:14px Arial,sans-serif',
        'box-shadow:0 2px 10px rgba(0,0,0,0.18)',
        'user-select:none'
      ].join(';');

      const text = document.createElement('span');
      text.textContent = '"SFQA Reflect" Automation Testing started debugging this browser';
      text.style.cssText = 'font-weight:600;flex:1';

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Cancel';
      button.style.cssText = [
        'border:0',
        'border-radius:18px',
        'padding:9px 18px',
        'background:#c7c2ff',
        'color:#170f29',
        'font:600 13px Arial,sans-serif',
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
        'padding:4px 8px'
      ].join(';');
      closeBtn.addEventListener('click', () => bar.remove());

      bar.appendChild(text);
      bar.appendChild(button);
      bar.appendChild(closeBtn);
      document.documentElement.appendChild(bar);
    }
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    dashboardTabId = sender.tab.id;
    chrome.windows.create({ url: message.url, incognito: true }, (win) => {
      chrome.tabs.query({ windowId: win.id }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];
        recordingTabId = tab.id;
        // Send navigation step back as step 1
        chrome.tabs.sendMessage(dashboardTabId, {
          action: "STEP_RECORDED",
          step: {
            action: "Navigate",
            selectorType: "manual",
            fallbacks: ["", "", ""],
            value: message.url
          }
        });
      });
    });
  } else if (message.action === "RECORD_STEP") {
    if (sender.tab && sender.tab.id === recordingTabId && dashboardTabId) {
      chrome.tabs.sendMessage(dashboardTabId, {
        action: "STEP_RECORDED",
        step: message.step
      });
    }
  } else if (message.action === "CHECK_RECORDING") {
    sendResponse({ isRecording: (sender.tab && sender.tab.id === recordingTabId) });
    return true;
  }
});

// Inject indicator on every page load in the recording tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId !== recordingTabId) return;

  if (changeInfo.status === 'complete') {
    injectIndicator(tabId);
  }

  // Report navigations to dashboard
  if (changeInfo.url && dashboardTabId) {
    chrome.tabs.sendMessage(dashboardTabId, {
      action: "STEP_RECORDED",
      step: {
        action: "Navigate",
        selectorType: "manual",
        fallbacks: ["", "", ""],
        value: changeInfo.url
      }
    });
  }
});

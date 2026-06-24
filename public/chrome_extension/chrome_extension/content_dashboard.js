// Set CSP-safe attribute flag on document element
document.documentElement.setAttribute('data-sfqa-extension-active', 'true');

// Listen to messages from dashboard page
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "sfqa-dashboard") {
    chrome.runtime.sendMessage(event.data);
  }
});

// Listen to events from background.js and forward to dashboard page
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "STEP_RECORDED") {
    window.postMessage({
      source: "sfqa-extension",
      action: "STEP_RECORDED",
      step: message.step
    }, "*");
  } else if (message.action === "RUN_LOG") {
    window.postMessage({
      source: "sfqa-extension",
      action: "RUN_LOG",
      payload: message.payload
    }, "*");
  }
});

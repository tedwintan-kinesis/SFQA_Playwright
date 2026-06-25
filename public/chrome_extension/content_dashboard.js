// Set CSP-safe attribute flag on document element
document.documentElement.setAttribute('data-sfqa-extension-active', 'true');

// Listen to messages from dashboard page
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "sfqa-dashboard") {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(event.data);
      } else {
        throw new Error("Extension context invalidated");
      }
    } catch (e) {
      console.error("SFQA Extension Error:", e);
      alert("The SFQA extension was reloaded or updated. Please refresh this page to reconnect.");
    }
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

// Inject flag to main page context
const script = document.createElement('script');
script.textContent = 'window.SFQA_EXTENSION_ACTIVE = true;';
(document.head || document.documentElement).appendChild(script);
script.remove();

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
  }
});

let dashboardTabId = null;
let recordingTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    dashboardTabId = sender.tab.id;
    chrome.windows.create({ url: message.url, incognito: true }, (window) => {
      const tab = window.tabs[0];
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

// Track navigation on the recording tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === recordingTabId && changeInfo.url && dashboardTabId) {
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

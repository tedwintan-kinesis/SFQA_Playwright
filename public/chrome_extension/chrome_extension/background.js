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
  if (message.action === "START_TEST_RUN") {
    const dashboardTabId = sender.tab.id;
    const test = message.test;
    
    // Send initial log
    chrome.tabs.sendMessage(dashboardTabId, {
      action: "RUN_LOG",
      payload: { type: "info", line: `[Extension] Starting run for: ${test.name}` }
    });

    chrome.windows.create({ url: test.url, incognito: true }, (win) => {
      chrome.tabs.query({ windowId: win.id }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const runTabId = tabs[0].id;
        
        let currentStepIdx = 0;
        
        const executeNextStep = () => {
          if (currentStepIdx >= test.steps.length) {
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "RUN_LOG",
              payload: { type: "success", line: `[Extension] Run finished: PASSED` }
            });
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "RUN_LOG",
              payload: { type: "done" }
            });
            return;
          }
          
          const step = test.steps[currentStepIdx];
          chrome.tabs.sendMessage(dashboardTabId, {
            action: "RUN_LOG",
            payload: { type: "log", line: `  - Executing step ${currentStepIdx + 1}: ${step.action} ${step.value || ''}` }
          });

          if (step.action === "Navigate") {
            chrome.tabs.update(runTabId, { url: step.value }, () => {
              // Wait for load, then continue
              const listener = (tid, info) => {
                if (tid === runTabId && info.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(() => {
                    currentStepIdx++;
                    executeNextStep();
                  }, 1000);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
            });
            return;
          }

          // Inject content_runner.js if not present, then execute step
          chrome.scripting.executeScript({
            target: { tabId: runTabId },
            files: ['content_runner.js'],
            world: 'MAIN'
          }).then(() => {
            return chrome.scripting.executeScript({
              target: { tabId: runTabId },
              func: (stepData) => window.sfqaRunStep(stepData),
              args: [step],
              world: 'MAIN'
            });
          }).then((results) => {
            currentStepIdx++;
            executeNextStep();
          }).catch((err) => {
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "RUN_LOG",
              payload: { type: "error", line: `[Extension] Error: ${err.message}` }
            });
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "RUN_LOG",
              payload: { type: "error", line: `[Extension] Run finished: FAILED` }
            });
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "RUN_LOG",
              payload: { type: "done" }
            });
          });
        };

        // Start execution after initial load
        const initialLoadListener = (tid, info) => {
          if (tid === runTabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(initialLoadListener);
            setTimeout(executeNextStep, 1000);
          }
        };
        chrome.tabs.onUpdated.addListener(initialLoadListener);
      });
    });

  } else if (message.action === "START_RECORDING") {
    const dashboardTabId = sender.tab.id;
    chrome.windows.create({ url: message.url, incognito: true }, (win) => {
      chrome.tabs.query({ windowId: win.id }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const recordingTabId = tabs[0].id;

        const hasPriorSteps = Number.isInteger(message.throughStepIndex) && message.test && message.test.steps;
        const stepsToRun = hasPriorSteps ? message.test.steps.slice(0, message.throughStepIndex + 1) : [];

        if (stepsToRun.length > 0) {
          let currentStepIdx = 0;
          const executeNextStep = () => {
            if (currentStepIdx >= stepsToRun.length) {
              chrome.storage.session.set({ dashboardTabId, recordingTabId }, () => {
                injectIndicator(recordingTabId);
              });
              return;
            }
            const step = stepsToRun[currentStepIdx];
            if (step.action === "Navigate") {
              chrome.tabs.update(recordingTabId, { url: step.value }, () => {
                const listener = (tid, info) => {
                  if (tid === recordingTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    setTimeout(() => { currentStepIdx++; executeNextStep(); }, 1000);
                  }
                };
                chrome.tabs.onUpdated.addListener(listener);
              });
              return;
            }
            chrome.scripting.executeScript({
              target: { tabId: recordingTabId },
              files: ['content_runner.js'],
              world: 'MAIN'
            }).then(() => {
              return chrome.scripting.executeScript({
                target: { tabId: recordingTabId },
                func: (stepData) => window.sfqaRunStep(stepData),
                args: [step],
                world: 'MAIN'
              });
            }).then(() => {
              currentStepIdx++;
              executeNextStep();
            }).catch(() => {
              chrome.storage.session.set({ dashboardTabId, recordingTabId }, () => {
                injectIndicator(recordingTabId);
              });
            });
          };

          const initialLoadListener = (tid, info) => {
            if (tid === recordingTabId && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(initialLoadListener);
              setTimeout(executeNextStep, 1000);
            }
          };
          chrome.tabs.onUpdated.addListener(initialLoadListener);
        } else {
          chrome.storage.session.set({ dashboardTabId, recordingTabId }, () => {
            chrome.tabs.sendMessage(dashboardTabId, {
              action: "STEP_RECORDED",
              step: {
                id: `step-${Date.now()}`,
                action: "Navigate",
                selectorType: "manual",
                fallbacks: ["", "", ""],
                value: message.url
              }
            });
          });
        }
      });
    });

  } else if (message.action === "RECORD_STEP") {
    chrome.storage.session.get(['dashboardTabId', 'recordingTabId'], (stored) => {
      if (sender.tab && sender.tab.id === stored.recordingTabId && stored.dashboardTabId) {
        chrome.tabs.sendMessage(stored.dashboardTabId, {
          action: "STEP_RECORDED",
          step: message.step
        });
      }
    });

  } else if (message.action === "CHECK_RECORDING") {
    chrome.storage.session.get(['recordingTabId'], (stored) => {
      sendResponse({ isRecording: !!(sender.tab && sender.tab.id === stored.recordingTabId) });
    });
    return true;
  }
});

// Inject indicator and report navigations in the recording tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.session.get(['recordingTabId', 'dashboardTabId'], (stored) => {
    if (tabId !== stored.recordingTabId) return;

    if (changeInfo.status === 'complete') {
      injectIndicator(tabId);
    }

    if (changeInfo.url && stored.dashboardTabId) {
      chrome.tabs.sendMessage(stored.dashboardTabId, {
        action: "STEP_RECORDED",
        step: {
          id: `step-${Date.now()}`,
          action: "Navigate",
          selectorType: "manual",
          fallbacks: ["", "", ""],
          value: changeInfo.url
        }
      });
    }
  });
});

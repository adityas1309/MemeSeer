// MemeSeer Extension Background Service Worker

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🔮 MemeSeer extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    scannedCount: 0,
    highRiskCount: 0,
    cacheSize: 0
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    updateStats(request.data);
    sendResponse({ success: true });
  }
  
  if (request.action === 'incrementScanned') {
    incrementCounter('scannedCount', request.isHighRisk);
    sendResponse({ success: true });
  }
  
  return true;
});

// Update statistics
function updateStats(data) {
  chrome.storage.local.get(['scannedCount', 'highRiskCount', 'cacheSize'], (result) => {
    const newStats = {
      scannedCount: (result.scannedCount || 0) + (data.scannedCount || 0),
      highRiskCount: (result.highRiskCount || 0) + (data.highRiskCount || 0),
      cacheSize: data.cacheSize || result.cacheSize || 0
    };
    
    chrome.storage.local.set(newStats);
  });
}

// Increment counter
function incrementCounter(counter, isHighRisk = false) {
  chrome.storage.local.get([counter, 'highRiskCount'], (result) => {
    const updates = {
      [counter]: (result[counter] || 0) + 1
    };
    
    if (isHighRisk) {
      updates.highRiskCount = (result.highRiskCount || 0) + 1;
    }
    
    chrome.storage.local.set(updates);
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled automatically by manifest)
});

// Periodic cache cleanup (every hour)
setInterval(() => {
  chrome.storage.local.get(['cacheSize'], (result) => {
    if (result.cacheSize > 100) {
      // Send message to all tabs to clean old cache entries
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'cleanCache' }).catch(() => {});
        });
      });
    }
  });
}, 3600000); // 1 hour
// MemeSeer Extension Popup Script

const MEMESEER_URL = 'http://localhost:3000'; // Replace with your actual domain

// Load stats from storage
chrome.storage.local.get(['scannedCount', 'highRiskCount', 'cacheSize'], (result) => {
  document.getElementById('scannedCount').textContent = result.scannedCount || 0;
  document.getElementById('highRiskCount').textContent = result.highRiskCount || 0;
  document.getElementById('cacheSize').textContent = result.cacheSize || 0;
});

// Open dashboard
document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: MEMESEER_URL });
});

// Scan current page
document.getElementById('scanCurrentPage').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('blockscout.com') && !tab.url.includes('celoscan.io')) {
    alert('Please navigate to a blockchain explorer to scan tokens');
    return;
  }

  // Send message to content script to rescan
  chrome.tabs.sendMessage(tab.id, { action: 'rescan' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
      alert('Please refresh the page and try again');
    } else {
      alert('Scanning tokens on this page...');
      window.close();
    }
  });
});

// Clear cache
document.getElementById('clearCache').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear the cache?')) {
    chrome.storage.local.clear(() => {
      document.getElementById('scannedCount').textContent = '0';
      document.getElementById('highRiskCount').textContent = '0';
      document.getElementById('cacheSize').textContent = '0';
      
      // Send message to content script to clear its cache
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'clearCache' }).catch(() => {});
        });
      });
      
      alert('Cache cleared successfully');
    });
  }
});
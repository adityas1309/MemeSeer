// content.js
// MemeSeer Browser Extension - Content Script
// This script runs on blockchain explorer pages and injects risk scores

'use strict';

const MEMESEER_API = 'http://localhost:3000/api'; // Replace with your actual domain
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class MemeSeerInjector {
  constructor() {
    this.cache = new Map();
    this.processedTokens = new Set();
    this.init();
  }

  init() {
    console.log('🔮 MemeSeer extension loaded');
    this.detectPageType();
    this.observePageChanges();
  }

  detectPageType() {
    const url = window.location.href;

    if (url.includes('/token/0x')) {
      // Single token page
      this.injectSingleTokenBadge();
    } else if (url.includes('/tokens')) {
      // Token list page
      this.injectTokenListBadges();
    }
  }

  observePageChanges() {
    // Watch for dynamic content loading
    const observer = new MutationObserver(() => {
      this.detectPageType();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  extractTokenAddress() {
    // Extract token address from URL
    const match = window.location.href.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  }

  extractTokensFromList() {
    const tokens = [];

    // Generic token list selectors: try multiple possibilities
    const tokenRows = document.querySelectorAll('tbody tr, .token-item, [data-token-address]');

    tokenRows.forEach(row => {
      let address = null;

      // Method 1: data attribute
      address = row.getAttribute('data-token-address');

      // Method 2: Find link with address
      if (!address) {
        const link = row.querySelector('a[href*="/token/0x"]');
        if (link) {
          const match = link.href.match(/0x[a-fA-F0-9]{40}/);
          if (match) address = match[0];
        }
      }

      // Method 3: Search in text content
      if (!address) {
        const text = row.textContent || '';
        const match = text.match(/0x[a-fA-F0-9]{40}/);
        if (match) address = match[0];
      }

      if (address && !this.processedTokens.has(address)) {
        tokens.push({ address, element: row });
        this.processedTokens.add(address);
      }
    });

    return tokens;
  }

  async injectSingleTokenBadge() {
    const address = this.extractTokenAddress();
    if (!address) return;

    // Find token name/title element
    const titleSelectors = [
      'h1',
      '.token-name',
      '[data-test="token-name"]',
      '.page-title'
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
      titleElement = document.querySelector(selector);
      if (titleElement) break;
    }

    if (!titleElement) return;

    // Check if badge already exists
    if (titleElement.querySelector('.memeseer-badge')) return;

    // Show loading badge
    const loadingBadge = this.createLoadingBadge();
    this.insertBadge(titleElement, loadingBadge);

    // Fetch risk score
    try {
      const riskData = await this.fetchRiskScore(address);
      loadingBadge.remove();

      const badge = this.createRiskBadge(riskData, address);
      this.insertBadge(titleElement, badge);
    } catch (error) {
      console.error('MemeSeer: Failed to fetch risk score', error);
      loadingBadge.remove();
    }
  }

  async injectTokenListBadges() {
    const tokens = this.extractTokensFromList();

    for (const { address, element } of tokens) {
      // Find name cell or appropriate location
      const nameCell = element.querySelector('td:first-child, .token-name-cell, a[href*="/token/"]');

      if (!nameCell || nameCell.querySelector('.memeseer-mini-badge')) continue;

      try {
        // Show a tiny loading indicator optionally (not mandatory)
        const miniBadge = this.createMiniLoadingBadge();
        if (nameCell.tagName === 'TD') {
          const container = nameCell.querySelector('div, span') || nameCell;
          container.appendChild(miniBadge);
        } else {
          nameCell.parentElement.insertBefore(miniBadge, nameCell.nextSibling);
        }

        const riskData = await this.fetchRiskScore(address);
        const finalMini = this.createMiniBadge(riskData, address);

        // replace loading small badge with final
        miniBadge.replaceWith(finalMini);
      } catch (error) {
        console.error('MemeSeer: Failed to fetch risk score for', address, error);
      }
    }
  }

  // Single merged fetch function (caches + sends runtime messages)
  async fetchRiskScore(address) {
    if (!address) throw new Error('No address provided to fetchRiskScore');

    // Check cache first
    const cached = this.cache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from API
    let response;
    try {
      response = await fetch(`${MEMESEER_API}/scan?address=${address}`);
    } catch (err) {
      // Network or CORS error
      throw new Error('Network error fetching risk score: ' + err.message);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch risk score: ' + response.status);
    }

    const data = await response.json();

    // Cache the result
    this.cache.set(address, {
      data,
      timestamp: Date.now()
    });

    // Update stats (best-effort; content scripts can message background)
    try {
      const isHighRisk = data.riskLevel === 'HIGH' || data.riskLevel === 'CRITICAL';
      chrome.runtime.sendMessage({ action: 'incrementScanned', isHighRisk });
      chrome.runtime.sendMessage({ action: 'updateStats', data: { cacheSize: this.cache.size } });
    } catch (err) {
      // Ignore messaging failures (e.g. runtime not available in some contexts)
      console.warn('MemeSeer: Could not send stats message', err);
    }

    return data;
  }

  createLoadingBadge() {
    const badge = document.createElement('div');
    badge.className = 'memeseer-badge memeseer-loading';
    badge.innerHTML = `
      <span class="memeseer-spinner">⚡</span>
      <span>Scanning...</span>
    `;
    return badge;
  }

  createMiniLoadingBadge() {
    const span = document.createElement('span');
    span.className = 'memeseer-mini-badge memeseer-loading';
    span.innerHTML = `<span class="memeseer-mini-icon">⚡</span><span class="memeseer-mini-score">...</span>`;
    return span;
  }

  createRiskBadge(riskData = {}, address = '') {
    const { totalScore = 'N/A', riskLevel = 'UNKNOWN', name = '', symbol = '' } = riskData;
    const colorClass = this.getRiskColorClass(riskLevel);

    const badge = document.createElement('div');
    badge.className = `memeseer-badge ${colorClass}`;
    badge.innerHTML = `
      <div class="memeseer-badge-content">
        <div class="memeseer-icon">🔮</div>
        <div class="memeseer-info">
          <div class="memeseer-score">${totalScore}</div>
          <div class="memeseer-level">${riskLevel}</div>
        </div>
        <div class="memeseer-label">Risk Score</div>
      </div>
      <button class="memeseer-view-btn" data-address="${address}">
        View Full Analysis →
      </button>
    `;

    // Add click handler for view button
    const viewBtn = badge.querySelector('.memeseer-view-btn');
    viewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(`${MEMESEER_API.replace('/api', '')}?scan=${address}`, '_blank');
    });

    return badge;
  }

  createMiniBadge(riskData = {}, address = '') {
    const { totalScore = 'N/A', riskLevel = 'UNKNOWN' } = riskData;
    const colorClass = this.getRiskColorClass(riskLevel);

    const badge = document.createElement('span');
    badge.className = `memeseer-mini-badge ${colorClass}`;
    badge.setAttribute('data-address', address);
    badge.innerHTML = `
      <span class="memeseer-mini-icon">🔮</span>
      <span class="memeseer-mini-score">${totalScore}</span>
      <span class="memeseer-mini-level">${riskLevel}</span>
    `;

    // Tooltip
    badge.title = `MemeSeer Risk Score: ${totalScore} (${riskLevel}) - Click to view full analysis`;

    // Clickable
    badge.style.cursor = 'pointer';
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(`${MEMESEER_API.replace('/api', '')}?scan=${address}`, '_blank');
    });

    return badge;
  }

  insertBadge(titleElement, badge) {
    // Try to insert badge next to title
    if (!titleElement || !titleElement.parentElement) return;

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '1rem';
    container.style.flexWrap = 'wrap';

    titleElement.parentElement.insertBefore(container, titleElement);
    container.appendChild(titleElement);
    container.appendChild(badge);
  }

  getRiskColorClass(riskLevel) {
    switch ((riskLevel || '').toString().toUpperCase()) {
      case 'LOW': return 'memeseer-low';
      case 'MEDIUM': return 'memeseer-medium';
      case 'HIGH': return 'memeseer-high';
      case 'CRITICAL': return 'memeseer-critical';
      default: return 'memeseer-unknown';
    }
  }

  clearCache() {
    this.cache.clear();
    this.processedTokens.clear();
    console.log('MemeSeer: Cache cleared');
  }

  cleanOldCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
    console.log('MemeSeer: Old cache entries cleaned');
  }
}

// Message listener for popup/background commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  if (!window.injector) {
    sendResponse({ success: false, message: 'Injector not initialized' });
    return;
  }

  if (request.action === 'rescan') {
    window.injector.processedTokens.clear();
    window.injector.detectPageType();
    sendResponse({ success: true });
  } else if (request.action === 'clearCache') {
    window.injector.clearCache();
    sendResponse({ success: true });
  } else if (request.action === 'cleanCache') {
    window.injector.cleanOldCache();
    sendResponse({ success: true });
  } else {
    sendResponse({ success: false, message: 'Unknown action' });
  }

  // Indicate async response not used
  return false;
});

// Initialize injector
let injector;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injector = new MemeSeerInjector();
    window.injector = injector;
  });
} else {
  injector = new MemeSeerInjector();
  window.injector = injector;
}

// Reinitialize on history changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      if (window.injector) {
        window.injector.processedTokens.clear();
        window.injector.detectPageType();
      }
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });

/**
 * Currency Utility - Handle PKR and USD conversions
 * Provides global currency formatting and conversion functions
 * Fetches live exchange rates from API with caching
 * 
 * FEATURES:
 * - Automatic fetching of live exchange rates from free APIs
 * - 1-hour cache to minimize API calls
 * - Fallback to default rate if API fails
 * - Manual refresh capability
 * 
 * APIs USED:
 * - Primary: exchangerate-api.com (Free, 1,500 requests/month, no API key)
 * - Backup: frankfurter.app (Free, unlimited, no API key)
 * 
 * To add more APIs or use paid services:
 * 1. Add API URL to EXCHANGE_API_URLS object
 * 2. Update fetchExchangeRate() to handle the new API's response format
 * 
 * Popular alternatives:
 * - fixer.io (requires API key) - https://fixer.io/
 * - currencyapi.com (requires API key) - https://currencyapi.com/
 * - openexchangerates.org (requires API key) - https://openexchangerates.org/
 */

// Default exchange rate (fallback if API fails)
const DEFAULT_EXCHANGE_RATE = {
  PKR_TO_USD: 0.00357, // 1 PKR = 0.00357 USD
  USD_TO_PKR: 280,     // 1 USD = 280 PKR
  lastUpdated: null
};

// Cache duration (1 hour)
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Free exchange rate API endpoints (you can use any of these)
const EXCHANGE_API_URLS = {
  // Option 1: exchangerate-api.com (Free tier: 1,500 requests/month)
  exchangeRateAPI: 'https://api.exchangerate-api.com/v4/latest/USD',
  
  // Option 2: frankfurter.app (Free, no API key required)
  frankfurter: 'https://api.frankfurter.app/latest?from=USD&to=PKR',
  
  // Option 3: fixer.io (requires API key)
  // fixer: 'https://api.fixer.io/latest?base=USD&symbols=PKR'
};

// Current exchange rate (will be updated from API)
let EXCHANGE_RATE = { ...DEFAULT_EXCHANGE_RATE };

// Fetch live exchange rate from API
async function fetchExchangeRate() {
  try {
    console.log('📊 Fetching live exchange rate...');
    
    // Try primary API
    const response = await fetch(EXCHANGE_API_URLS.exchangeRateAPI);
    
    if (!response.ok) {
      throw new Error('Primary API failed, trying backup...');
    }
    
    const data = await response.json();
    
    if (data && data.rates && data.rates.PKR) {
      const usdToPkr = data.rates.PKR;
      const pkrToUsd = 1 / usdToPkr;
      
      const newRate = {
        PKR_TO_USD: pkrToUsd,
        USD_TO_PKR: usdToPkr,
        lastUpdated: Date.now()
      };
      
      // Update in-memory rate
      EXCHANGE_RATE = newRate;
      
      // Cache in localStorage
      localStorage.setItem('exchangeRate', JSON.stringify(newRate));
      
      console.log('✅ Exchange rate updated:', {
        'USD to PKR': usdToPkr.toFixed(2),
        'PKR to USD': pkrToUsd.toFixed(5)
      });
      
      return newRate;
    }
  } catch (error) {
    console.warn('⚠️ Primary API failed, trying backup API...');
    
    try {
      // Try backup API
      const response = await fetch(EXCHANGE_API_URLS.frankfurter);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.rates && data.rates.PKR) {
          const usdToPkr = data.rates.PKR;
          const pkrToUsd = 1 / usdToPkr;
          
          const newRate = {
            PKR_TO_USD: pkrToUsd,
            USD_TO_PKR: usdToPkr,
            lastUpdated: Date.now()
          };
          
          EXCHANGE_RATE = newRate;
          localStorage.setItem('exchangeRate', JSON.stringify(newRate));
          
          console.log('✅ Exchange rate updated from backup:', {
            'USD to PKR': usdToPkr.toFixed(2),
            'PKR to USD': pkrToUsd.toFixed(5)
          });
          
          return newRate;
        }
      }
    } catch (backupError) {
      console.error('❌ All exchange rate APIs failed:', backupError);
    }
    
    console.warn('⚠️ Using default/cached exchange rate');
    return EXCHANGE_RATE;
  }
}

// Get exchange rate (from cache or fetch new)
async function getExchangeRate() {
  // Check if we have a cached rate
  const cachedRate = localStorage.getItem('exchangeRate');
  
  if (cachedRate) {
    try {
      const parsed = JSON.parse(cachedRate);
      const age = Date.now() - (parsed.lastUpdated || 0);
      
      // If cached rate is less than CACHE_DURATION old, use it
      if (age < CACHE_DURATION) {
        EXCHANGE_RATE = parsed;
        console.log('📊 Using cached exchange rate (age: ' + Math.round(age / 60000) + ' minutes)');
        return EXCHANGE_RATE;
      }
    } catch (e) {
      console.error('Error parsing cached rate:', e);
    }
  }
  
  // Fetch new rate if cache is expired or doesn't exist
  return await fetchExchangeRate();
}

// Initialize exchange rate on page load
(async function initExchangeRate() {
  await getExchangeRate();
})();

// Get user's preferred currency from localStorage
function getUserCurrency() {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      return parsed.currency || 'PKR';
    } catch (e) {
      return 'PKR';
    }
  }
  return 'PKR';
}

// Update user's currency preference
function setUserCurrency(currency) {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      parsed.currency = currency;
      localStorage.setItem('user', JSON.stringify(parsed));
      
      // Dispatch currency change event
      window.dispatchEvent(new CustomEvent('currencyChanged', { 
        detail: { currency } 
      }));
      
      return true;
    } catch (e) {
      console.error('Error setting currency:', e);
      return false;
    }
  }
  return false;
}

// Convert amount from PKR to USD or vice versa
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  if (fromCurrency === 'PKR' && toCurrency === 'USD') {
    return amount * EXCHANGE_RATE.PKR_TO_USD;
  }
  
  if (fromCurrency === 'USD' && toCurrency === 'PKR') {
    return amount * EXCHANGE_RATE.USD_TO_PKR;
  }
  
  return amount;
}

// Format currency with appropriate symbol and locale
function formatCurrency(amount, currency = null) {
  if (currency === null) {
    currency = getUserCurrency();
  }
  
  const numAmount = parseFloat(amount) || 0;
  
  if (currency === 'USD') {
    return '$' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } else {
    // PKR
    return 'Rs ' + new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  }
}

// Format currency with conversion - always expects PKR as base
function formatPrice(amountInPKR, targetCurrency = null) {
  if (targetCurrency === null) {
    targetCurrency = getUserCurrency();
  }
  
  const converted = convertCurrency(amountInPKR, 'PKR', targetCurrency);
  return formatCurrency(converted, targetCurrency);
}

// Get currency symbol
function getCurrencySymbol(currency = null) {
  if (currency === null) {
    currency = getUserCurrency();
  }
  return currency === 'USD' ? '$' : 'Rs';
}

// Get currency name
function getCurrencyName(currency = null) {
  if (currency === null) {
    currency = getUserCurrency();
  }
  return currency === 'USD' ? 'US Dollar' : 'Pakistani Rupee';
}

// Get current exchange rate info
function getExchangeRateInfo() {
  return {
    usdToPkr: EXCHANGE_RATE.USD_TO_PKR,
    pkrToUsd: EXCHANGE_RATE.PKR_TO_USD,
    lastUpdated: EXCHANGE_RATE.lastUpdated,
    age: EXCHANGE_RATE.lastUpdated ? Date.now() - EXCHANGE_RATE.lastUpdated : null,
    isExpired: EXCHANGE_RATE.lastUpdated ? (Date.now() - EXCHANGE_RATE.lastUpdated) > CACHE_DURATION : true
  };
}

// Manually refresh exchange rate
async function refreshExchangeRate() {
  console.log('🔄 Manually refreshing exchange rate...');
  const rate = await fetchExchangeRate();
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('exchangeRateUpdated', { 
    detail: { rate } 
  }));
  
  return rate;
}

// Format last updated time
function getLastUpdateTime() {
  if (!EXCHANGE_RATE.lastUpdated) {
    return 'Never updated';
  }
  
  const age = Date.now() - EXCHANGE_RATE.lastUpdated;
  const minutes = Math.floor(age / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Make functions globally available
window.getUserCurrency = getUserCurrency;
window.setUserCurrency = setUserCurrency;
window.convertCurrency = convertCurrency;
window.formatCurrency = formatCurrency;
window.formatPrice = formatPrice;
window.getCurrencySymbol = getCurrencySymbol;
window.getCurrencyName = getCurrencyName;
window.getExchangeRate = getExchangeRate;
window.fetchExchangeRate = fetchExchangeRate;
window.refreshExchangeRate = refreshExchangeRate;
window.getExchangeRateInfo = getExchangeRateInfo;
window.getLastUpdateTime = getLastUpdateTime;
window.EXCHANGE_RATE = EXCHANGE_RATE;

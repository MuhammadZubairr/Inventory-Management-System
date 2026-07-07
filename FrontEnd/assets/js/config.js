/**
 * API Configuration
 * Single source of truth for environment URLs
 */

// Edit only these values when changing environments/domains.
window.APP_ENV = Object.freeze({
  LOCAL_API_BASE_URL: 'http://localhost:3001/api',
  TEST_API_BASE_URL: 'http://185.216.75.147:3002/api',
  PRODUCTION_API_BASE_URL: 'https://prismbreaksolution.com/api',
});

function resolveApiBaseUrl() {
  const hostname = window.location.hostname;
  const port = window.location.port;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.APP_ENV.LOCAL_API_BASE_URL;
  }
  if (port === '3002') {
    return window.APP_ENV.TEST_API_BASE_URL;
  }
  return window.APP_ENV.PRODUCTION_API_BASE_URL;
}
// window.APP_ENV = Object.freeze({
//   LOCAL_API_BASE_URL: 'http://localhost:3001/api',
//   PRODUCTION_API_BASE_URL: 'https://prismbreaksolution.com/api',
// });

// function resolveApiBaseUrl() {
//   const isLocalhost =
//     window.location.hostname === 'localhost' ||
//     window.location.hostname === '127.0.0.1' ||
//     window.location.hostname === '';

//   return isLocalhost
//     ? window.APP_ENV.LOCAL_API_BASE_URL
//     : window.APP_ENV.PRODUCTION_API_BASE_URL;
// }

window.resolveApiBaseUrl = resolveApiBaseUrl;
window.API_BASE_URL = window.API_BASE_URL || resolveApiBaseUrl();
window.UPLOAD_BASE_URL = window.API_BASE_URL.replace('/api', '');

console.log('Environment:', window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '' ? 'Development' : 'Production');
console.log('API Base URL:', window.API_BASE_URL);

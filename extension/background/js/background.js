/* exported methods */
let bypassCDNCache = false;
window.enableCDNCacheBypass = function (bool) {
  console.log(bool);
  if (bool) {
    console.log('[INFO]: enabling CDN Cache Bypass');
  } else {
    console.log('[INFO]: disabling CDN Cache Bypass');
  }
  bypassCDNCache = bool;
};
const additionnalHeadersAFR = { };
window.addHeaderAFR = function (key, value) {
  console.log('[INFO]: adding header to AFR urls ', key, value);
  additionnalHeadersAFR[key] = value;
};

const afrRegex = /(staging\.afrostream\.tv|\-staging\.herokuapp\.com)/;

chrome.webRequest.onBeforeRequest.addListener(function (details) {
  const randomKey = 'afrrnd';
  if (bypassCDNCache &&
      details.url.match(afrRegex) &&
      details.url.indexOf(randomKey) === -1) {
    const r = String(Math.round(Math.random() * 1000000));
    const redirectUrl = details.url + (details.url.indexOf('?') === -1 ? '?'+randomKey+'=':'&'+randomKey+'=') + r;
    return { redirectUrl: redirectUrl };
  }
}, {"urls": [ "*://*/*" ]}, ['blocking'])

chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
  var headers = details.requestHeaders;

  if (Object.keys(additionnalHeadersAFR).length &&
      details.url.match(afrRegex)) {
    Object.keys(additionnalHeadersAFR).forEach(function (headerName) {
      var header = getHeaderObject(headers, headerName);
      if (header) {
        header.value = additionnalAdvstHeader[headerName];
      } else {
        headers.push({name:headerName, value:additionnalHeadersAFR[headerName]});
      }
    });
  }

  return {requestHeaders: headers};
}, {"urls": [ "*://*/*" ]}, ['requestHeaders', 'blocking']);


var getHeaderObject = function (headers, headerName) {
  for (var i = 0; i < headers.length; ++i) {
    if (headers[i].name === headerName) {
      return headers[i];
    }
  }
  return null;
};

const additionnalHeadersStaging = {};

window.addHeaderStaging = function (key, value) {
  additionnalHeadersStaging[key] = value;
};

const stagingRegex = /(staging\.afrostream\.tv|\-staging\.herokuapp\.com)/;

/*
 * on s'abonne a l'ensemble des requests du browser
 * on ajoute les flags si besoin.
 * on ajoute des cookies si besoin.
 *
 * Attention: exception pour les urls de la forme adxcore.com/config pour éviter de poser un flag sur cette url de gestion de flags.
 *
 * @param details object
 * { frameId: 0, method: "GET", parentFrameId: -1, requestHeaders: Array[4], requestId: "297424", tabId: -1, timeStamp: 1429601019249.217, type: "xmlhttprequest", url: "http://control.advertstream.com/sondes/st
atus" }
 */
chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
  var headers = details.requestHeaders;

  if (Object.keys(additionnalHeadersStaging).length &&
      details.url.match(stagingRegex)) {
    Object.keys(additionnalHeadersStaging).forEach(function (headerName) {
      var header = getHeaderObject(headers, headerName);
      if (header) {
        header.value = additionnalAdvstHeader[headerName];
      } else {
        headers.push({name:headerName, value:additionnalHeadersStaging[headerName]});
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

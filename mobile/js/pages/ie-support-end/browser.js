(function () {
  const navigator = window.navigator;
  const agent = navigator.userAgent.toLowerCase();
  /** * @isIe : Internet Explorer 6-11
   * https://daily-dev-tips.com/posts/vanilla-javascript-browser-detection/ */
  const isIE =
    /*@cc_on!@*/ false ||
    !!document.documentMode ||
    (navigator.appName == 'Netscape' && navigator.userAgent.search('Trident') != -1) ||
    agent.indexOf('msie') != -1;
  if (isIE) window.location = '/pages/ie-support-end.html';
})();

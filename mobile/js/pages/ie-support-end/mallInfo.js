(function () {
  var urlInfo = {
    alpha: 'https://alpha-shop-api.e-ncp.com',
    real: 'https://shop-api.e-ncp.com',
  };
  var baseUrl = '';
  var clientId = '';

  env().then(function (info) {
    baseUrl = urlInfo[info.profile];
    clientId = info.clientId;
    requestMallInfo();
  });

  function env() {
    return fetch('/environment.json').then(function (res) {
      return res.json();
    });
  }

  function requestMallInfo() {
    var api = ShopSDK(fetchMallInfo);
    api.admin.getMalls();
  }

  function fetchMallInfo(option) {
    var info = generateRequest(option);

    fetch(info.url, info.detail)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        document.querySelector('#notSupportMallName').textContent = data.mall.mallName;
      });
  }

  function generateRequest(option) {
    return {
      url: baseUrl + option.url,
      detail: {
        method: option.method,
        headers: {
          platform: 'MOBILE_WEB',
          clientId: clientId,
          Version: '1.0',
        },
      },
    };
  }
})();

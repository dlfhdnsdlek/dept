$(() => {
  shopby.naverInflow = {
    async initiate() {
      this.wcsDo();
    },

    wcsDo() {
      const currentPath = location.pathname;

      if (!currentPath.includes('/pages/order/order-complete.html')) {
        if (!window.wcs_add) {
          window.wcs_add = {};
        }

        window.wcs_add['wa'] = shopby.naverCommonAuthKey; // TODO: 네이버페이 쇼핑몰 설정 생기면 setting

        window.wcs.inflow(location.host.replace('www.', ''));
        window.wcs_do();
      }
    },
    wcsDoCPA: function (cpaOrder, goodsPrice) {
      if (!window.wcs_add) {
        window.wcs_add = {};
      }

      // TODO: naverCommonAuthKey 확인
      window.wcs_add['wa'] = shopby.naverCommonAuthKey; // TODO: 네이버페이 쇼핑몰 설정 생기면 setting
      window.wcs.inflow(location.host.replace('www.', ''));

      const _nao = {};

      if (window.wcs.isCPA && shopby.agreeCPA === 'Y') {
        _nao['chn'] = 'AD';
        _nao['order'] = JSON.stringify(cpaOrder);
        window.wcs.CPAOrder(_nao);
      }

      const _nasa = {};
      _nasa['cnv'] = window.wcs.cnv('1', goodsPrice);
      window.wcs_do(_nasa);
    },
  };
  shopby.start.entries.push(shopby.naverInflow.initiate.bind(shopby.naverInflow));
});

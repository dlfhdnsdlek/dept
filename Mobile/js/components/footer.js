/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.6.29
 */

$(() => {
  shopby.footer = {
    mallInfo: null,
    boardsConfig: null,
    aboutConfig: null,
    orderConfig: null,
    boardId: 'notice',
    articles: null,
    mallSSLSeal: null,
    renderData: {
      top: null,
      bottom: null,
    },
    async initiate() {
      await this._prepareData();
      await this._getCache();
      this._setToGenerateShortcut();
      this.setData();
      this.render();
      this.bindEvents();
    },
    setData() {
      this.renderData = {
        top: this._getTopData(),
        bottom: this._getBottomData(),
      };
    },
    render() {
      $('#footer_wrap').render(this.renderData);
    },
    async _prepareData() {
      await shopby.cache.checkFooterAboutDataExpired();
      await shopby.cache.checkFooterArticlesDataExpired();
    },
    async _getCache() {
      this.mallInfo = shopby.cache.getMall();
      this.boardsConfig = shopby.cache.getBoardsConfig();
      this.articles = shopby.cache.getFooterArticles().items;
      this.aboutConfig = shopby.cache.getFooterAbout();
      this.mallSSLSeal = this._mapSSLSeal(shopby.cache.getMallsSSLSeal());

      const { data } = await shopby.api.order.getOrderConfigs();
      this.orderConfig = {
        ...data,
        pgType: data.escrow.exposeLogo ? data.pgType : '',
      };

      console.log(this.mallSSLSeal); // TODO: debug. seal 적용된 도메인만 실제 노출여부 확인가능하기땜에 일단 찍어둠
    },
    _mapSSLSeal(mallsSSLSeal) {
      const mallSSLSeal = mallsSSLSeal.find(({ domain }) => domain === location.hostname);
      return mallSSLSeal && mallSSLSeal.trustSeal ? mallSSLSeal.trustSeal : null;
    },
    _getTopData() {
      const boardList = this.boardsConfig.boardConfigs.find(({ boardId }) => boardId === this.boardId);
      const { mall, bankAccountInfos } = this.mallInfo;
      const articles = this.articles;
      return {
        boardList,
        articles,
        mall,
        bankAccountInfos,
      };
    },
    _getBottomData() {
      const boardsConfig = this.boardsConfig;
      const { mall, serviceBasicInfo, termsConfig, accumulationConfig } = this.mallInfo;
      const since = mall && mall.createdDateTime ? mall.createdDateTime.split('-')[0] : '';
      const businessRegistration = {
        url: `//www.ftc.go.kr/bizCommPop.do?wrkr_no=${serviceBasicInfo.businessRegistrationNo}`,
        no: serviceBasicInfo.businessRegistrationNo,
      };
      const about = this.about.filter(item => item.used);
      const customAccumulationMenuName = (accumulationConfig && accumulationConfig.accumulationName) || '마일리지';
      return {
        business: {
          mall,
          serviceBasicInfo,
          termsConfig,
          since,
          businessRegistration,
          mallSSLSeal: this.mallSSLSeal,
          orderConfig: this.orderConfig,
        },
        menu: {
          boardsConfig,
          mall,
          about,
          customAccumulationMenuName,
        },
      };
    },
    get about() {
      return [
        { page: 'company', label: '회사소개', used: this.aboutConfig.mall_introduction.used },
        { page: 'guide', label: '이용안내', used: this.aboutConfig.access_guide.used },
      ];
    },
    bindEvents() {
      $('.ft_mid_con div > a').on('click', this.drawerEvent);
      $('.foot_shortcut').on('click', this._generateShortcut.bind(this));
      $('.toPcVersion').on('click', this._goToPcVersion.bind(this));
    },
    _goToPcVersion(event) {
      event.preventDefault();
      const search = new URLSearchParams(window.location.search);

      search.delete('pc');
      search.set('mobile', 'mobile');
      location.href = `//${window.location.host}${window.location.pathname}?${search.toString()}`;
    },
    drawerEvent(event) {
      event.preventDefault();
      if ($(this).hasClass('on')) {
        $(this).removeClass('on');
      } else {
        $(this).addClass('on');
      }
    },
    async _generateShortcut() {
      const promptEvent = window.deferredPrompt;
      if (!promptEvent) return;

      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
        window.close();
      }
    },
    async _setToGenerateShortcut() {
      await this._replaceManifestWith(this._generateManifestUrl());
      this._generateServiceWorker();
    },
    _generateServiceWorker() {
      this._deferPromptEvent();
      this._registerServiceWorker();
    },
    _registerServiceWorker() {
      'serviceWorker' in navigator && navigator.serviceWorker.register('/mobileServiceWorker.js');
    },
    _deferPromptEvent() {
      window.addEventListener('appinstalled', event => {
        event.preventDefault();
        window.deferredPrompt = null;
      });
    },
    _replaceManifestWith(manifestURL) {
      $('#manifest-placeholder').attr('href', manifestURL);
    },
    _generateManifestUrl() {
      const mallName = shopby.config.skin.mallName;
      const manifest = {
        name: mallName,
        short_name: mallName,
        description: mallName,
        start_url: location.origin,
        display: 'standalone',
        orientation: 'portrait',
        incognito: 'split',
        icons: [
          {
            src: `https:${shopby.config.skin.appIcon}`,
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      return URL.createObjectURL(blob);
    },
  };

  shopby.footer.initiate().catch(console.error);
});

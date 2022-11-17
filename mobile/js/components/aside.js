/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Haekyu Cho
 * @since 2021-6-18
 */
$(() => {
  const EXPIRE = 60 * 60 * 24 * 1000; // 1일
  const GUEST_RECENT_PRODUCT_KEY = 'guestRecentProducts';
  const localStorage = shopby.localStorage;

  const $recentProduct = $('#recentProduct');
  const $scrollWrap = $('.scroll_wrap');

  shopby.aside = {
    async initiate() {
      await this.addRecentProductIfProductView();
      this.bindEvents();
      this.getRecentProducts();
      this.renderScrollBanner();
    },
    bindEvents() {
      $(window).on('scroll', this.events.onScrollScrollBanner);
      $scrollWrap
        .on('click', '.btn_scroll_list_del', this.events.onClickDeleteRecentProduct.bind(this))
        .on('click', '.bnt_scroll_prev', this.events.onClickPrevPage.bind(this))
        .on('click', '.bnt_scroll_next', this.events.onClickNextPage.bind(this));
    },
    events: {
      onClickPrevPage() {
        this.page.prevPage();
        this.render(this.page);
      },
      onClickNextPage() {
        this.page.nextPage();
        this.render(this.page);
      },
      onClickDeleteRecentProduct(e) {
        const name = 'productNo';
        const productNo = e.target.dataset[name];

        const refresh = productNo => {
          const items = this.page.getItemsByCache().filter(item => item[name] && item[name].toString() !== productNo);
          this.render(this.page.create(items));
        };

        if (shopby.logined()) {
          shopby.api.product.deleteProfileRecentProducts({ productNo }).then(() => refresh.call(this, productNo));
        } else {
          localStorage.popItemByOrder(GUEST_RECENT_PRODUCT_KEY, productNo);
          refresh.call(this, productNo);
        }
      },
      onScrollScrollBanner() {
        const $scrollBanner = $scrollWrap.find('.scrollBanner');
        const scrollWrapOffsetTop = $scrollWrap.offset().top;
        const scrollTop = $(window).scrollTop() + 200;
        const removeStyle = () => $scrollBanner.removeClass('ban_fixed').removeAttr('style');
        const addStyle = () => $scrollBanner.addClass('ban_fixed');
        scrollTop <= scrollWrapOffsetTop ? removeStyle() : addStyle();
      },
    },
    render(pageData) {
      $recentProduct.render(pageData).show();
    },
    renderScrollBanner() {
      const { scrollLeftBanner, scrollRightBanner } = this.getScrollBannerInfo();
      $('#scroll_left').render(scrollLeftBanner);
      $('.right_banner').render(scrollRightBanner);
    },
    getScrollBannerInfo() {
      const skin = shopby.cache.getSkin();
      const found08 = skin.find(({ bannerGroupCode }) => bannerGroupCode === 'BANNER08');
      const found09 = skin.find(({ bannerGroupCode }) => bannerGroupCode === 'BANNER09');
      const latestLeftBanner = this.findLatestBanner(found08 ? found08.banners : []);
      const latestRightBanner = this.findLatestBanner(found09 ? found09.banners : []);
      const scrollLeftBanner =
        latestLeftBanner && latestLeftBanner.bannerImages ? latestLeftBanner.bannerImages[0] : null;
      const scrollRightBanner =
        latestRightBanner && latestRightBanner.bannerImages ? latestRightBanner.bannerImages[0] : null;
      return { scrollLeftBanner, scrollRightBanner };
    },
    findLatestBanner(banners = []) {
      if (banners.length === 0) return;
      if (banners.length === 1) return banners[0];
      return banners.reduce((prev, curr) => {
        return new Date(prev.updateDateTime).getTime() <= new Date(curr.updateDateTime).getTime() ? curr : prev;
      });
    },
    getRecentProducts() {
      const renderCallBack = result => {
        const expiredToken = !result || !result.error;

        if (expiredToken) {
          this.render(this.page.create(result));
        } else {
          this.page.evictItems();
          this.render(this.page.create());
        }
      };

      const items = this.page.getItemsByCache();
      if (shopby.utils.isArrayNotEmpty(items)) {
        renderCallBack(items);
        return;
      }

      if (shopby.logined()) {
        shopby.api.product
          .getProfileRecentProducts({ queryString: {} })
          .then(({ data }) => renderCallBack.call(this, data));
      } else {
        const guestRecentProductNos = (localStorage.getItemsByParced(GUEST_RECENT_PRODUCT_KEY) || []).join(',');
        if (guestRecentProductNos) {
          shopby.api.product
            .getGuestRecentProducts({ queryString: { mallProductNos: guestRecentProductNos } })
            .then(({ data }) => renderCallBack.call(this, data));
        } else {
          renderCallBack.call([]);
        }
      }
    },
    async addRecentProductIfProductView() {
      const isProductView = window.location.href.includes('/product/view.html');

      if (!isProductView) return;
      const name = 'productNo';
      const searchParams = new URLSearchParams(window.location.search);

      if (searchParams.has(name) && Boolean(searchParams.get(name))) {
        const productNo = searchParams.get(name);

        if (shopby.logined()) {
          await shopby.api.product.postProfileRecentProducts({ requestBody: { productNo } });
        } else {
          localStorage.unshiftItemByOrder(GUEST_RECENT_PRODUCT_KEY, productNo, EXPIRE);
        }

        this.page.evictItems();
      }
    },
    page: {
      currentPage: 1,
      totalPage: 0,
      totalCount: 0,
      PER_PAGE: 3,
      itemsByPaging: [],
      EXPIRE_TIME: 60 * 5 * 1000,
      _calculate() {
        this.totalCount = this.getItemsByCache().length;
        this.totalPage = Math.ceil(this.totalCount / this.PER_PAGE);
        const start = (this.currentPage - 1) * this.PER_PAGE;
        const end = start + this.PER_PAGE;
        this.itemsByPaging = this.getItemsByCache().slice(start, end) || [];

        // 최근상품 10개가 있고 현제 페이지가 2페이지에서 5개의 상품을 모두 삭제했을경우 이전페이지로 간다.
        if (this.currentPage > 1 && start === this.totalPage * this.PER_PAGE) {
          this.prevPage();
        }
      },
      prevPage() {
        const canPrev = this.currentPage > 1;
        this.currentPage = canPrev ? this.currentPage - 1 : this.totalPage;
        this._calculate();
      },
      nextPage() {
        const canNext = this.currentPage < this.totalPage;
        this.currentPage = canNext ? this.currentPage + 1 : 1;
        this._calculate();
      },
      create(items = []) {
        localStorage.setItemWithExpire(this.getExpireKey(), items, this.EXPIRE_TIME);
        this._calculate();

        return this;
      },
      getItemsByCache() {
        return localStorage.getItemWithExpire(this.getExpireKey()) || [];
      },
      evictItems() {
        localStorage.removeItem(this.getExpireKey());
      },
      getExpireKey() {
        const key = shopby.cache.key.product.recent;
        return shopby.logined() ? key : `GUEST-${key}`;
      },
    },
  };

  shopby.aside.initiate();
});

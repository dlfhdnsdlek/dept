$(() => {
  shopby.header = {
    initiate() {
      this.top.initiate();
      this.logo.initiate();
      this.categories.initiate();
      this.search.initiate();
    },

    top: {
      container: $('#headerTop'),
      dropdown: $('.js_hover_drop_down_content'),
      myPageTitle: $('.top_mypage_tit'),
      data: {
        logined: shopby.logined(),
        cartCount: 0,
        openIdProvider: shopby.localStorage.getItem(shopby.cache.key.member.oauthProvider),
      },
      initiate() {
        this.setData();
        this.render();
        this.bindEvents();
      },
      async setData() {
        const count = await shopby.helper.cart.getCartCount();
        this.container.find('.js_cart_length').text(count);

        // shopby.helper.cart.getCartProductLength().then(productLength => {
        //   this.data.cartCount = productLength || 0;
        //
        //   this.container.find('.js_cart_length').html(this.data.cartCount);
        // });
      },
      render() {
        this.container.render(this.data);
        this.dropdown = $('.js_hover_drop_down_content');
        this.myPageTitle = $('.top_mypage_tit');
      },
      bindEvents() {
        this.container
          .find('.js_hover_drop_down_trigger')
          .on('mouseover', this.showDropDown.bind(this))
          .on('mouseleave', this.hideDropDown.bind(this));
        this.container.find('#logout').on('click', this.logout);

        this.container.on('click', '#myPageLeftMenu a', shopby.moveForLogined); //FIXME. 마이페이지 공통로직으로 옮겨야함
      },
      showDropDown() {
        if (this.dropdown.css('display') === 'none') {
          this.dropdown.show();
          this.myPageTitle.addClass('active');
        }
      },
      hideDropDown() {
        this.dropdown.hide();
        this.myPageTitle.removeClass('active');
      },
      logout(event) {
        event.preventDefault();

        shopby.cache.removeAccessToken();
        shopby.goHome();
      },
    },

    logo: {
      data: {
        logo: { landingUrl: '/', imageUrl: '/' },
        bannerInfo: null,
        bannerName: 'logo',
        code: shopby.config.skin.bannerGroups.find(banner => banner.groupType === 'LOGO').groupCode,
      },
      initiate() {
        const isSkin = this.findBannerInfo();
        if (!isSkin) {
          return this.render();
        }
        this.setLogo();
        this.render();
        this.setLogoSize();
      },
      findBannerInfo() {
        const skin = shopby.cache.getSkin();
        const foundSkin = skin.find(({ bannerGroupCode }) => bannerGroupCode === this.data.code);
        const banners = foundSkin ? foundSkin.banners : null;
        if (!banners) return;
        this.bannerInfo = this.findLatestBanner(banners);
        return !!this.bannerInfo;
      },
      setLogo() {
        const bannerImage = this.bannerInfo && this.bannerInfo.bannerImages ? this.bannerInfo.bannerImages[0] : null;
        if (!bannerImage) return;
        this.data.logo = bannerImage;
      },
      render() {
        $('#logo').render(this.data.logo);
      },
      findLatestBanner(banners = []) {
        if (banners.length === 0) return;
        if (banners.length === 1) return banners[0];
        return banners.reduce((prev, curr) => {
          return new Date(prev.updateDateTime).getTime() <= new Date(curr.updateDateTime).getTime() ? curr : prev;
        });
      },
      setLogoSize() {
        const { sizeUnitType, height, width } = this.bannerInfo;
        if (!width && !height) return;
        const $img = $(`#banner-${this.data.bannerName}`).find('img');
        if (sizeUnitType === 'PIXEL') {
          $img.css({ width: `${width}px`, height: `${height}px` });
        } else {
          $img.css({ width: `${width}%` });
        }
      },
    },
    categories: {
      $categoryAll: $('#categoryAll'),
      $scrollWrapper: $('nav .gnb_allmenu_wrap').get(0),
      data: {
        categories: shopby.cache.getCategories(),
        page: 0,
        blockSize: null,
        totalPages: null,
      },
      initiate() {
        this.render();
        this.setData();
        this.bindEvents();
      },
      setData() {
        this.data.blockSize =
          this.$scrollWrapper.offsetWidth + window.innerWidth - document.documentElement.clientWidth;
        this.data.totalPages = Number((this.$scrollWrapper.scrollWidth / this.data.blockSize).toFixed(2));
      },
      render() {
        $('#category-navigation').render(this.data.categories);
        this.$categoryAll.render(this.data.categories);
        this.$categoryAll.hide();
      },
      bindEvents() {
        $('.gnb').on('click', this.onClickCategories.bind(this));
      },
      onClickCategories(event) {
        const { type } = event.target.dataset;
        switch (type) {
          case 'prev':
            this.navigationBtnHandler(this.data.page - 1);
            break;
          case 'next':
            this.navigationBtnHandler(this.data.page + 1);
            break;
          case 'all':
            this.$categoryAll.toggle(0);
            break;
        }
      },
      navigationBtnHandler(pageNum) {
        if (pageNum > this.data.totalPages || pageNum < 0) return;
        this.$scrollWrapper.scrollLeft = pageNum * this.data.blockSize;
        this.data.page = pageNum;
      },
    },
    search: {
      $keywordSearch: $('#keywordSearch'),
      data: {
        keyword: shopby.utils.getUrlParam('keyword') || '',
      },
      initiate() {
        this.render();
        this.bindEvents();
      },
      render() {
        this.$keywordSearch.find('input[name=keyword]').val(this.data.keyword);
      },
      bindEvents() {
        $('#btnSearchTop').on('click', this.onClickSearchBtn.bind(this)).enterKeyup('#search_form');
      },
      onClickSearchBtn() {
        const keywordInput = this.$keywordSearch.find('input[name=keyword]');
        const keyword = keywordInput.val();
        if (keyword === '') {
          shopby.alert({ message: '검색어를 입력해주세요' }, () => {
            keywordInput.focus();
          });
          return false;
        }
        const categoryNo = shopby.utils.getUrlParam('categoryNo');
        let params = `keyword=${keyword}`;
        if (categoryNo) {
          params += `&categoryNo=${categoryNo}`;
        }
        window.location.href = `/pages/product/list.html?${params}`;
      },
    },
  };

  shopby.header.initiate();
});

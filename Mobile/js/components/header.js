$(() => {
  shopby.header = {
    initiate() {
      this.top.initiate();
      this.logo.initiate();
      this.categories.initiate();
      this.boardNavigation.initiate();
      this.search.initiate();
      this.sidebar.initiate();
    },
    top: {
      container: $('#navigation'),
      dropdown: $('.js_hover_drop_down_content'),
      myPageTitle: $('.top_mypage_tit'),
      data: {
        logined: shopby.logined(),
        cartCount: 0,
      },
      initiate() {
        this.setData();
        this.render();
        this.bindEvents();
      },
      async setData() {
        const count = await shopby.helper.cart.getCartCount();
        this.container.find('#js_cart_length').text(count);

        // shopby.helper.cart.getCartProductLength().then(productLength => {
        //   this.data.cartCount = productLength || 0;
        //
        //   this.container.find('.js_cart_length').html(this.data.cartCount);
        // });
      },
      render() {
        $('#headerTop').render(this.data);
        this.dropdown = $('.js_hover_drop_down_content');
        this.myPageTitle = $('.top_mypage_tit');
      },
      bindEvents() {
        this.container.on('click', '#logout', this.logout);
        this.container.on('click', '#myPageLeftMenu a', shopby.moveForLogined);
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
      $scrollWrapper: $('nav .gnb_allmenu_wrap').get(0),
      $nav: $('nav'),
      data: {
        categories: shopby.cache.getCategories(),
        page: 0,
        blockSize: null,
        totalPages: null,
        logined: shopby.logined(),
      },
      initiate() {
        this.render();
        this.bindEvents();
      },
      render() {
        // login
        $('#naviLogin').render(this.data);
        $('#category-navigation').render(this.data.categories);
      },
      bindEvents() {
        $('.icon_plus').on('click', this.onClickCategories.bind(this));
      },
      onClickCategories(event) {
        let $li = $(event.target).closest('li');
        let $a = $(event.target).closest('a');
        if ($li.hasClass('on')) {
          $li.removeClass('on');
          $a.removeClass('on');
        } else {
          $li.addClass('on');
          $a.addClass('on');
        }
      },
      navigationBtnHandler(pageNum) {
        if (pageNum > this.data.totalPages || pageNum < 0) return;
        this.$scrollWrapper.scrollLeft = pageNum * this.data.blockSize;
        this.data.page = pageNum;
      },
    },
    boardNavigation: {
      boardsConfig: null,
      initiate() {
        this.fetchData();
        this.render();
      },
      fetchData() {
        this.boardsConfig = shopby.cache.getBoardsConfig();
      },
      render() {
        $('#board-navigation').render(this.boardsConfig);
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
        $('.top_search').on('click', this.openSearchPopup.bind(this));
      },
      openSearchPopup() {
        shopby.popup('search-product');
      },
    },
    sidebar: {
      posY: null,
      resizeChk: 0,
      sc: 0,
      initiate() {
        this.windowScroll();
        this.bindEvents();
      },
      bindEvents() {
        $('.side_menu, nav .bg, .left_close').on('click', this.openSidebar.bind(this));
        $(window).on('resize', this.windowResize.bind(this));
      },
      windowScroll() {
        $(window).on('scroll', function () {
          if (this.resizeChk !== 0) {
            this.sc = $(this).scrollTop();
            if (this.sc > 0) {
              $('#header_wrap header').addClass('h_on');
              $('#header_wrap').css('padding-top', $('#header_wrap header').outerHeight());
              // 사용 가능 하긴 하나, 요소가 header에 있지 않아 일단 주석
              // $('.fixed_btn_top').show();
            } else {
              $('#header_wrap header').removeClass('h_on');
              $('#header_wrap').css('padding-top', 0);
              // $('.fixed_btn_top').hide();
            }
          }
        });
      },
      windowResize() {
        if ($('#navigation nav').css('display') !== 'none') {
          this.blockResize();
        } else {
          this.noneResize();
        }
      },
      blockResize() {
        if ($('body').css('overflow') !== 'hidden') this.posY = $('body').scrollTop();
        //$('nav .nav_bg_box .nav_box .nav_content_box').height($(window).innerHeight()).scrollTop(0);
        $('.nav_content_box').height($(window).innerHeight());
        $('.nav_content_box').css('overflow-y', 'scroll');
        $('#navigation').height($(window).innerHeight());
        $('#navigation').css('overflow-y', 'scroll');
        if ($('body').css('overflow') !== 'hidden') $('#navigation').scrollTop(this.posY);
        $('#navigation, body').css('overflow', 'hidden');
        this.resizeChk = 0;
      },
      noneResize() {
        $('#navigation, body').removeAttr('style');
        if (this.resizeChk == 0) {
          $('body').scrollTop(this.posY);
          this.resizeChk = 1;
        }
      },
      openSidebar() {
        function motionEvent(width_num) {
          $('.nav_bg_box .nav_box').animate({ 'margin-left': width_num }, '5000');
        }
        if ($('#navigation nav').css('display') == 'none') {
          $('#navigation nav').show();
          $('#navigation nav .bg').fadeIn();
          $('#navigation nav .bg').bind('touchmove', function (e) {
            e.preventDefault();
          }); //모바일 스크롤 방지
          motionEvent(0);
          this.blockResize();
        } else {
          $('nav .bg').fadeOut(function () {
            $('#navigation nav').hide();
          });
          this.noneResize();
          motionEvent('-290px');
        }
      },
    },
  };

  shopby.header.initiate();
});

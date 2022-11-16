/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-6-23
 */

(() => {
  shopby.home = {
    initiate() {
      shopby.setGlobalVariableBy('MAIN');
      this.banner.initiate();
      this.sectionProduct.initiate();
      this.instagram.initiate();
      this.ProductsReviewsWidget.initiate();
    },
    banner: {
      DEFAULT_COLOR: '#ffffff',
      data: {
        totalBanners: {},
      },
      initiate() {
        this.setTotalBanners();
        this.render();
        this.iterateSkin(bannerInfo => this.setBannerSize(bannerInfo));
        this.setMainSlider();
      },
      render() {
        $('#promotionBanner').render(this.data.totalBanners);
        this.$sliderBanner = $('.slider-banner');
      },
      setTotalBanners() {
        this.iterateSkin(({ bannerName, banners }) => {
          this.data.totalBanners[bannerName] = this.findLatestBanner(banners);
        });
      },
      findLatestBanner(banners = []) {
        if (banners.length === 0) return;
        if (banners.length === 1) return banners[0];
        return banners.reduce((prev, curr) => {
          return new Date(prev.updateDateTime).getTime() <= new Date(curr.updateDateTime).getTime() ? curr : prev;
        });
      },
      iterateSkin(func) {
        const skin = shopby.cache.getSkin();
        skin.forEach(({ bannerGroupCode, banners }) => {
          const bannerName = this.findBannerName(bannerGroupCode);
          func({ banners, currentBanner: this.data.totalBanners[bannerName], bannerName });
        });
      },
      findBannerName(bannerGroupCode) {
        // eslint-disable-next-line no-unused-vars
        return shopby.config.skin.bannerGroupCodes.find(value => value === bannerGroupCode);
      },
      setBannerSize({ bannerName, currentBanner }) {
        const exclusionBanners = ['LOGO0001'];
        if (exclusionBanners.includes(bannerName)) return;

        const { sizeUnitType, height, width } = currentBanner;
        if (!width && !height) return;

        const $img = $(`#banner-${bannerName}`).find('img');
        if (sizeUnitType === 'PIXEL') {
          $img.css({ width: `${width}px`, height: `${height}px` });
        } else {
          $img.css({ width: `${width}%` });
        }
      },
      setMainSlider() {
        if (!this.data.totalBanners || !this.data.totalBanners.BANNER01) return;
        const banner = this.data.totalBanners.BANNER01;
        this.setSlick(banner);
        this.setNavigationBtn(banner);
        this.setNavigationBtnColor(banner);
        this.setPrevAndNextBtn(banner);
      },
      setSlick(banner) {
        const SPEED_TYPE = {
          FAST: 300,
          NORMAL: 1300,
          SLOW: 2300,
        };
        const defaultSlideBannerConfig = {
          slideNavigationType: null,
          usableSlideButton: null,
          slideTime: 0,
          slideSpeedType: null,
          slideEffectType: null,
        };
        const slideBannerConfig = (({
          slideNavigationType,
          usableSlideButton,
          slideTime,
          slideSpeedType,
          slideEffectType,
        }) => {
          return {
            autoplay: true,
            dots: slideNavigationType === 'VISIBLE',
            arrows: usableSlideButton,
            infinite: true,
            autoplaySpeed: slideTime ? slideTime * 1000 : 3000,
            speed: SPEED_TYPE[slideSpeedType] || 1300,
            slidesToShow: 1,
            fade: slideEffectType === 'FADE',
            variableWidth: false,
            adaptiveHeight: false,
          };
        })(banner && banner.slideBannerConfig ? banner.slideBannerConfig : defaultSlideBannerConfig);

        this.$sliderBanner.slick(slideBannerConfig);
      },
      setNavigationBtn(banner) {
        if (
          !banner.slideBannerConfig ||
          !banner.slideBannerConfig.slideNavigationInfo ||
          !banner.slideBannerConfig.slideNavigationInfo.buttonSizeType
        )
          return;

        const classList = [];
        const prefix = 'indicator-';
        const { buttonSizeType, buttonBorderType } = banner.slideBannerConfig.slideNavigationInfo;
        if (buttonSizeType) {
          classList.push(prefix + 'btn-' + buttonSizeType.toLowerCase());
        }
        if (buttonBorderType) {
          classList.push(prefix + 'border-' + buttonBorderType.toLowerCase());
        }
        this.$sliderBanner.addClass(classList.join(' '));
      },
      setNavigationBtnColor(banner) {
        const defaultSlideBannerConfig = {
          slideNavigationInfo: null,
          slideNavigationType: null,
        };
        const defaultSlideNavigationInfo = {
          inactiveButtonColor: null,
          activeButtonColor: null,
        };
        const { slideNavigationInfo, slideNavigationType } =
          (banner && banner.slideBannerConfig) || defaultSlideBannerConfig;
        if (slideNavigationType !== 'VISIBLE') return;
        const { inactiveButtonColor, activeButtonColor } = slideNavigationInfo || defaultSlideNavigationInfo;
        const color = inactiveButtonColor ? inactiveButtonColor : this.DEFAULT_COLOR;
        const activeColor = activeButtonColor ? activeButtonColor : this.DEFAULT_COLOR;
        $('.slider-banner .slick-dots li button').css({ background: color });

        const style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet.insertRule(
          `.slider-banner .slick-dots li.slick-active button{ background: ${activeColor}!important; }`,
          0,
        );
      },
      setPrevAndNextBtn(banner) {
        const defaultSlideBannerConfig = {
          slideButtonColor: null,
          usableSlideButton: null,
        };
        const { slideButtonColor, usableSlideButton } =
          (banner && banner.slideBannerConfig) || defaultSlideBannerConfig;
        if (!usableSlideButton) return;
        const $prevBtn = this.$sliderBanner.find('.slick-prev');
        const $nextBtn = this.$sliderBanner.find('.slick-next');
        const color = slideButtonColor ? escape(slideButtonColor) : this.DEFAULT_COLOR;

        const prevUrl = `"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M0%2C22L22%2C0l2.1%2C2.1L4.2%2C22l19.9%2C19.9L22%2C44L0%2C22L0%2C22L0%2C22z'%20fill%3D'${color}'%2F%3E%3C%2Fsvg%3E"`;
        const nextUrl = `"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2027%2044'%3E%3Cpath%20d%3D'M27%2C22L27%2C22L5%2C44l-2.1-2.1L22.8%2C22L2.9%2C2.1L5%2C0L27%2C22L27%2C22z'%20fill%3D'${color}'%2F%3E%3C%2Fsvg%3E"`;
        $prevBtn.css({ 'background-image': `url(${prevUrl})` });
        $nextBtn.css({ 'background-image': `url(${nextUrl})` });
      },
    },
    sectionProduct: {
      newSectionProduct: null,
      async initiate() {
        const sectionIds = shopby.config.skin.sections.mobile;
        const responses = await Promise.all(sectionIds.map(id => this._fetchSectionProducts(id)));

        responses
          .map(({ data }) => data)
          .filter(Boolean)
          .map(({ productTotalCount, products, displayConfig, label, sectionId }) => ({
            sectionId: sectionId,
            pagination: null,
            totalCount: productTotalCount,
            productList: products,
            page: 0,
            pageSize: 0,
            listType: 'LIST',
            displayConfig: displayConfig,
            title: label,
          }))
          .forEach(section => {
            this.setSectionProduct(section);
          });
      },

      async _fetchSectionProducts(sectionsId, pageNumber = '0', pageSize = '0') {
        const request = {
          pathVariable: {
            sectionsId,
          },
          queryString: {
            pageNumber,
            pageSize,
            sectionsId,
            soldout: true,
            hasTotalCount: true,
          },
        };

        return await shopby.api.display.getDisplaySectionsIdsSectionId(request);
      },

      setSectionProduct(section) {
        this.setDisplayConfig(section);
        this.render(section);
        this.setPagination(section);
        this.bindEvents(section);
      },

      setDisplayConfig(sectionProduct) {
        const LIST_TYPE_CONVERTOR = {
          GALLERY: 'gallery',
          LIST: 'list',
          SWIPE: 'swipe',
        };
        const { displayHeight, displayWidth, displayType } = sectionProduct.displayConfig;
        sectionProduct.pageSize = displayHeight * displayWidth;
        sectionProduct.listType = LIST_TYPE_CONVERTOR[displayType];
      },
      render(sectionProduct) {
        const sectionProductTemplate = this.getMainSectionProductTemplate(sectionProduct);
        $(`#goodsList-${sectionProduct.sectionId}`).html(sectionProductTemplate).show();

        const { listType, productList, pageSize, displayConfig } = sectionProduct;
        const { displayWidth } = displayConfig;
        productList.forEach(product => {
          product.calculatedSalePrice = shopby.utils.getDisplayProductPrice(product);
          product.isSoldOut = this.isSoldOut(product && product.reservationData, product.stockCnt);
          return product;
        });
        const handlebarTemplate = $(`#product-list-type-${listType}`).html();
        const template = Handlebars.compile(handlebarTemplate);
        const list = listType === 'swipe' ? productList.slice(0, pageSize) : productList;
        const html = template({ productList: list, displayWidth });
        $(`#productList-${sectionProduct.sectionId}`).html(html);
      },
      bindEvents(sectionProduct) {
        const { sectionId } = sectionProduct;
        $(`#productListPaging-${sectionId}`).on('click', '.moreBtn', this.onClickMoreBtn.bind(this, sectionProduct));
        $(`#productList-${sectionId}`).on('click', '#wishBtn', event => this.onClickWishBtn(sectionProduct, event));
      },
      async onClickMoreBtn(sectionProduct) {
        const { sectionId, pageSize, page } = sectionProduct;
        const pageNumber = page === 0 ? page + 2 : page + 1;
        try {
          const { data } = await this._fetchSectionProducts(sectionId, pageNumber, pageSize);
          const newSectionProduct = { ...sectionProduct };
          newSectionProduct.productList = newSectionProduct.productList.concat(data.products); // this
          newSectionProduct.page = pageNumber;
          this.setSectionProduct(newSectionProduct);
        } catch (e) {
          console.error(e);
        }
      },
      async onClickWishBtn(sectionProduct, event) {
        event.preventDefault();

        if (!shopby.logined()) {
          return shopby.confirmLogin();
        }
        try {
          const $button = $(event.currentTarget);
          const liked = $button.hasClass('on');
          const productNo = $button.closest('li').data('product-no');
          const requestBody = { productNos: [productNo] };
          await shopby.api.product.postProfileLikeProducts({ requestBody });
          liked ? $button.removeClass('on') : $button.addClass('on');

          const sectionId = $button.closest('.goods_list_cont').data('sectionId');
          if (sectionProduct.listType === 'swipe') return;
          this.updateSectionProduct(sectionId, sectionProduct);
        } catch (e) {
          console.error(e);
        }
      },

      async updateSectionProduct(sectionId, sectionProduct) {
        this.newSectionProduct = { ...sectionProduct };
        const { data } = await this._fetchSectionProducts(
          sectionId,
          this.newSectionProduct.page === 0 ? 0 : 1,
          this.newSectionProduct.page * this.newSectionProduct.pageSize,
        );

        this.newSectionProduct.productList = data.products;
        this.setSectionProduct(this.newSectionProduct);
      },
      setPagination(sectionProduct) {
        const { listType, totalCount, pageSize, sectionId } = sectionProduct;
        if (listType !== 'swipe') {
          sectionProduct.totalPage = Math.ceil(totalCount / pageSize);
          this.drawMoreButton(sectionProduct);
          return;
        }

        const SLICK_OPTION = {
          draggable: true,
          autoplay: false,
          infinite: true,
          slidesToShow: 1,
          centerMode: true,
          arrows: false,
          variableWidth: true,
        };

        $(`#productList-${sectionId}`).find('.item_swipe_type .slider-wrap').slick(SLICK_OPTION);
      },
      drawMoreButton(sectionProduct) {
        const { totalPage, page, sectionId } = sectionProduct;
        if (page >= totalPage) return;
        const moreBtn = `<div class="btn_goods_down_more">
                            <button class="btn_goods_view_down_more moreBtn more_btn">더보기</button>
                         </div>`.trim();

        $(`#productListPaging-${sectionId}`).html(moreBtn);
      },
      getMainSectionProductTemplate(sectionProduct) {
        const { title, sectionId } = sectionProduct;

        return `<div class="goods_list goods_display_main">
              <div class="goods_list_tit">
                    <h3>${title}</h3>
                    <div class="btn_goods_more goods_list_box">
                        <a href="/pages/product/list.html?sectionId=${sectionId}" class="btn_goods_view_more">더보기</a>
                    </div>
                 </div>
                <div class="goods_list_cont" id="productList-${sectionId}" data-section-id="${sectionId}"></div>
                <div class="paging" id="productListPaging-${sectionId}"></div>
              </div>`.trim();
      },
      isSoldOut(reservationData, stockCnt) {
        if (shopby.utils.isPreSalePeriod(reservationData)) {
          if (reservationData && reservationData.reservationStockCnt === 0) return true;
        } else {
          if (stockCnt === 0) return true;
        }
      },
    },
    instagram: {
      initiate() {
        this.fetchInstagramContents().then(data => data?.length && this.render(data));
      },
      fetchInstagramContents() {
        const request = {
          queryString: {
            platform: 'MOBILE_WEB',
          },
        };

        return shopby.api.manage.getShopbyInstagramMedia(request).then(res => res.data.data);
      },
      render(data) {
        const target = document.getElementById('instagram-widget');
        target.innerHTML = this.getHTMLTemplate(data, 12);
        target.style.display = 'block';
      },
      getHTMLTemplate(contents, maxLength) {
        const getUsernameTemplate = contents => {
          const { username } = contents.find(({ username }) => Boolean(username));
          return username
            ? `
            <p>@${username}</p>
          `
            : '';
        };

        return `<div class="main_goods_cont instagram_widget">
          <header class="instagram_widget_head">
            <img style="width:99px" src="/assets/img/banner/instagram-logo.png" alt="Instagram" />
            ${getUsernameTemplate(contents)}
          </header>
          <ul class="instagram_widget_contents">
            ${contents
              .slice(0, maxLength)
              .map(
                content => `<li><a href="${content.permalink}" target="_blank">
                <img src="${content.thumbnail_url || content.media_url}" alt="instagram image" /></a></li>`,
              )
              .join('')}
          </ul>
        </div>`;
      },
    },
    ProductsReviewsWidget: {
      isAllUse: true,
      allReviewWidgets: [],
      isPhotoUse: true,
      photoWidgets: [],
      isReviewProducts: true,
      reviewWidgets: [],
      async initiate() {
        await this.getProductReviewsConfigurations();
        await this.render();
        this.bindEvents();
      },
      async render() {
        if (this.isAllUse) {
          const widgetList = await this.getReviewBoards('ALL');
          this.allReviewWidgets = widgetList.map(item => ({ ...item, type: 'ALL' }));
          this.renderWidgetList(this.allReviewWidgets, 'ALL');
        }

        if (this.isPhotoUse) {
          this.photoWidgets = await this.getReviewBoards('PHOTO');
          this.renderWidgetList(this.photoWidgets, 'PHOTO');
        }

        if (this.isReviewProducts) {
          this.reviewWidgets = await this.getReviewsBoardsReviewedProducts();
          this.renderWidgetList(this.reviewWidgets, 'REVIEW');
        }
      },
      bindEvents() {
        $('.photo-display-popup-open').on('click', this.onClickLayerPopup.bind(this));
      },
      renderWidgetList(widgetList, type) {
        const domId = type === 'ALL' ? 'all-review' : type === 'PHOTO' ? 'photo-review' : 'product-review';
        const handlebarTemplate = $(
          `${type === 'REVIEW' ? '#widget-list-reviewedProducts-template' : '#widget-list-allPhoto-template'}`,
        ).html();
        const template = Handlebars.compile(handlebarTemplate);
        const html = template({ widgetList, type });
        document.getElementById(domId).insertAdjacentHTML('beforeend', html);
      },
      async getReviewBoards(type) {
        const {
          data: { items },
        } = await shopby.api.display.getReviewBoards({
          queryString: {
            'sorting.sortCriterion': 'BEST_REVIEW',
            'sorting.ordering': 'DESC',
            depth1DisplayCategoryNo: 0,
            keyword: '',
            pageNumber: 1,
            boardType: type,
            isWidget: true,
          },
        });
        return items;
      },
      async getReviewsBoardsReviewedProducts() {
        const {
          data: { items },
        } = await shopby.api.display.getReviewBoardsReviewedProducts({
          queryString: {
            'sorting.sortCriterion': 'REVIEW_COUNT',
            'sorting.ordering': 'DESC',
            depth1DisplayCategoryNo: 0,
            keyword: '',
            pageNumber: 1,
            isWidget: true,
          },
        });

        return items.map(item => {
          return {
            ...item,
            mainImage: item.mainImage.includes('no_img') ? '' : item.mainImage,
            salePrice: item.salePrice,
            appliedImmediateDiscountPrice: item.appliedImmediateDiscountPrice,
          };
        });
      },
      async getProductReviewsConfigurations() {
        const { data } = await shopby.api.display.getProductReviewsConfigurations();
        this.setProductReviewsConfigurations(data);
      },
      setProductReviewsConfigurations(data) {
        const widgetConfig = data.expandedReviewConfig.widgetConfig;
        this.isAllUse = widgetConfig.allReviewWidgetUsable;
        this.isPhotoUse = widgetConfig.photoReviewWidgetUsable;
        this.isReviewProducts = widgetConfig.productReviewWidgetUsable;
      },
      getProductReviewsRequest(productNo) {
        return {
          pathVariable: { productNo },
          queryString: {
            'order.by': 'BEST_REVIEW',
            pageNumber: 1,
            pageSize: 9999,
            hasTotalCount: true,
          },
        };
      },
      getBoardsRequest(boardType) {
        return {
          queryString: {
            'sorting.sortCriterion': 'BEST_REVIEW',
            'sorting.ordering': 'DESC',
            depth1DisplayCategoryNo: 0,
            keyword: '',
            pageNumber: 1,
            boardType,
            isWidget: true,
          },
        };
      },
      onClickLayerPopup(event) {
        event.stopPropagation();
        const reviewNo = Number(event.currentTarget.dataset.reviewNo);
        const productNo = Number(event.currentTarget.dataset.productNo);
        const { type } = event.currentTarget.dataset;
        const isReviewedProducts = type === 'REVIEWED_PRODUCTS';
        const popupType = isReviewedProducts ? 'productReviews' : 'boards';
        const parameter = isReviewedProducts ? this.getProductReviewsRequest(productNo) : this.getBoardsRequest(type);
        const onlyDisplayedReviews = isReviewedProducts ? false : true;

        //TODO(김동욱): A타입 포토후기팝업
        let totalPage = '';
        if (type === 'ALL') totalPage = this.allReviewWidgets.length;
        if (type === 'PHOTO') totalPage = this.photoWidgets.length;
        if (type === 'REVIEWED_PRODUCTS') totalPage = this.reviewWidgets.length;

        shopby.popup('photo-review-detail', {
          reviewNo,
          productNo,
          hasCloseBtn: true,
          type: popupType,
          parameter,
          totalPage,
          onlyDisplayedReviews,
        });
      },
    },
  };

  shopby.start.initiate(shopby.home.initiate.bind(shopby.home));
})();

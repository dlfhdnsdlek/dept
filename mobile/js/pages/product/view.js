/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author hyeyeon-park
 * @author Bomee Yoon
 * @since 2021.6.24
 */

$(() => {
  const $container = $('#viewContainer');

  const { getUrlParam, toCurrencyString } = shopby.utils;
  const productNo = Number(getUrlParam('productNo'));
  const pathVariable = { productNo };

  shopby.product.view = {
    async initiate() {
      try {
        this.addRecentProduct();
        const [product, options, optionImages, relatedProducts, coupons] = await this.fetchProduct();
        const [
          reviewableInfo,
          reviewableOptions,
          reviews,
          reviewsConfigurations,
          photoReviews,
          inquires,
        ] = await this.fetchReviewsAndInquiries();
        shopby.setGlobalVariableBy('PRODUCT', product);
        const { productInquiryConfig, productReviewConfig } = shopby.cache.getBoardsConfig();
        await this.summary.initiate(generateData.summary(product, options, coupons));
        this.detail.initiate(generateData.detail(product, optionImages, options));
        this.basic.initiate(generateData.basic(product));
        this.review.initiate(
          generateData.review(
            reviewableInfo,
            reviewableOptions,
            reviews,
            reviewsConfigurations,
            photoReviews,
            productReviewConfig,
          ),
        );
        this.inquiry.initiate(generateData.inquiry(inquires, productInquiryConfig));
        this.renderProductInfo(product);
        this.renderTabInfo(reviews, inquires);
        this.renderRelatedProducts(relatedProducts);
        this.bindEvents();
        $('.sub_content').removeClass('invisible').addClass('visible');
      } catch (error) {
        console.log(error);
        this._errorHandler(error);
      }
    },
    bindEvents() {
      $(window).on('scroll', this.onScrollTab.bind(this));
    },

    async addRecentProduct() {
      if (shopby.logined()) {
        await shopby.api.product.postProfileRecentProducts({ requestBody: { productNo } });
      } else {
        shopby.localStorage.unshiftItemByOrder('guestRecentProducts', productNo, 60 * 60 * 24 * 1000);
      }
    },

    async fetchProduct() {
      const queryString = { includesCartCoupon: true };
      const result = await shopby.utils.allSettled([
        shopby.api.product.getProductsProductNo({ pathVariable }),
        shopby.api.product.getProductsProductNoOptions({ pathVariable }),
        shopby.api.product.getProductsProductNoOptionsImages({ pathVariable }),
        shopby.api.product.getProductsProductNoRelatedProducts({ pathVariable }),
        shopby.api.promotion.getCouponsProductsProductNoIssuableCoupons({ queryString, pathVariable }),
      ]);
      const hasError = result.some(r => r && r.status === 'rejected');
      if (hasError) {
        throw result;
      } else {
        return result.map(({ value }) => value.data);
      }
    },
    async fetchReviewsAndInquiries() {
      const result = await Promise.all([
        this.review.fetchReviewableInfo(),
        this.review.fetchProductsProductNoReviewableOptions(),
        this.review.fetchReviews(),
        this.review.fetchReviewsConfigurations(),
        this.review.fetchPhotoReviews(),
        this.inquiry.fetchInquires(),
      ]);
      return result.map(({ data }) => data);
    },
    renderProductInfo({ baseInfo }) {
      $container.data('productInfo', {
        productNo: baseInfo.productNo,
        productName: baseInfo.productName,
        imageUrl: (baseInfo && baseInfo.imageUrls && baseInfo.imageUrls[0]) || '',
      });
    },
    renderTabInfo(reviews, inquires) {
      $('#tabInfo').render({
        reviews,
        inquires,
      });
    },
    renderRelatedProducts(relatedProducts) {
      displayHelper.toggleRelatedProducts(relatedProducts && relatedProducts.length > 0, relatedProducts);
    },

    onScrollTab() {
      const scrollPosition = $(window).scrollTop();
      this.setTabPosition(scrollPosition);
      this.setTabMark(scrollPosition);
    },

    setTabPosition(scrollPosition) {
      const tabPosition = $('#tabInfo').offset().top;
      const headerHeight = $('#header').height();
      const subTopHeight = $('#pageTitleBox').height();
      const topContentsHeight = $('#summary').height();
      if (scrollPosition < headerHeight + subTopHeight + topContentsHeight) {
        $('#tabInfo').removeAttr('style');
      } else if (scrollPosition >= tabPosition) {
        $('#tabInfo').css({ position: 'fixed', top: 0 });
      }
    },

    setTabMark(scrollPosition) {
      const $tabInfo = $('#tabInfo');

      $.each($tabInfo.find('a'), (index, el) => {
        const hash = $(el).attr('href');

        const catchInTheNet = () => {
          const offset = $(hash).offset();
          const tabHeight = $('#tabInfo').innerHeight();

          return (
            scrollPosition + tabHeight > offset.top && scrollPosition + tabHeight < offset.top + $(hash).innerHeight()
          );
        };

        if (catchInTheNet()) {
          this.summary.activeCurrentTab($tabInfo, hash);
        }
      });
    },
    async _errorHandler(error) {
      shopby.utils.hideAllContents();

      if (error && error.length > 0) {
        const [{ reason: productReason }, { reason: optionReason }, { reason: imageReason }] = error;
        if (productReason.code === 'E0008') {
          await shopby.alert(productReason.message, () => {
            shopby.goAdultCertification();
          });
          return;
        }

        if (optionReason.code === 'SPEC0002' || imageReason.code === 'SPEC0002' || productReason.code === 'PNPE001') {
          optionReason &&
            optionReason.message &&
            shopby.alert(optionReason.message.replace(/,/g, ''), () => {
              history.back();
            });
        }
      }
    },

    // 상품정보 및 구매
    summary: {
      $summary: $container.find('#summary'),
      naverPay: null,
      orderConfigs: null,
      option: null,
      async initiate(data) {
        this.option = shopby.helper.option(data.options, data.reservationData);
        this.optionUsed = data.options.type !== 'DEFAULT';
        this.render(data);
        this.bindEvents(data.remoteDeliveryAreaFees);
        this.naverPay = await this.generateNaverPay(data);
        this.naverPay &&
          this.naverPay.applyNaverPayButton(this.loadNaverPayOrder.bind(this), this.loadNaverWishlist.bind(this));
      },
      render(data) {
        this.renderOptionSelector();
        this.renderLiked(data.liked, true);
        this.$summary.render(data);
        $('.detail_buy').render(data); //하단 고정영역 : 찜/장바구니/구매하기
        displayHelper.slickMainImages(data.imageUrls);
        displayHelper.isUnablePurchasing(!data.isUnablePurchasing);
      },
      renderOptionSelector() {
        this.$summary.find('#optionSelector').render({
          selectType: this.option.option._selectType,
          options: this.option.options,
          textOptions: this.option.textOptions,
          optionUsed: this.optionUsed,
          showsTotalPriceWithSelectedOptionsArea: this.option.selectedOptions.length > 0,
        });
        this.renderSelectedOptions();
      },
      renderSelectedOptions() {
        this.$summary.find('#selectedOptions').render({
          selectedOptions: this.option.selectedOptions,
          textOptions: this.option.textOptions,
          optionUsed: this.optionUsed,
        });
        this.renderTotalPrice();
      },
      renderTotalPrice() {
        this.$summary.find('#totalPrice').text(toCurrencyString(this.option.totalPrice));
      },
      renderLiked(liked, init) {
        const $wishBtn = this.$summary.find('#wishBtn');

        liked ? $wishBtn.addClass('on') : $wishBtn.removeClass('on');
        displayHelper.fadeOutLikeMessage(liked, init);
      },
      activeCurrentTab($wrap, hash) {
        $wrap.find('.selected').removeClass('selected');
        $(hash + 'Tab').addClass('selected');
      },
      setLocTop(e) {
        e.preventDefault();
        const $wrap = $('#tabInfo');
        const $currentTab = $(e.target);
        const hash = $currentTab.attr('href');
        const tabHeight = 60; // tab높이 + 10

        $('body, html').animate(
          {
            scrollTop: $(hash).offset().top - tabHeight + 'px',
          },
          function () {
            this.activeCurrentTab($wrap, hash);
          }.bind(this),
        );
      },
      bindEvents(remoteDeliveryAreaFees) {
        this.$summary
          .on('change', 'select[name="optionSelector"]', this.events.onChangeOptionSelector.bind(this))
          .on('change', 'input[name="orderCnt"]', this.events.onChangeOrderCount.bind(this))
          .on('blur', 'input', this.events.onBlurTextOptionInput.bind(this))
          .on('keyup', 'input', this.events.onKeyUpTextOptionInput.bind(this))
          .on('click', '#btnToggleTextOptionMode', this.events.onClickTextOptionMode.bind(this))
          .on('click', '#orderCountBtns', this.events.onClickOrderCountBtns.bind(this))
          .on('click', '#bottomBuyBox', this.events.openPurchaseLayer.bind(this))
          .on('click', '#purchaseBtns', this.events.onClickPurchaseBtns.bind(this))
          .on('click', '.detail_apply_del', this.events.onClickDeleteOption.bind(this))
          .on('click', '#downloadCoupon', this.events.onClickDownloadCoupon.bind(this))
          .on('click', '.share_btn_box', this.events.onClickWishOrShare.bind(this))
          .on('click', '.js_lys_close', this.events.closeShareLayer)
          .on('click', '.st_buy_close', this.events.closeBuyLayer)
          .on('click', '#additionalDeliveryFee', () =>
            displayHelper.onClickAdditionalDeliveryFee(remoteDeliveryAreaFees),
          );

        $('.item_photo_big').on('click', this.events.onClickMainImage.bind(this));
        $('#tabInfo').on('click', this.setLocTop.bind(this));
      },
      events: {
        onChangeOptionSelector({ target }) {
          const data = $(target).data();
          const selectedDepth = Number(data.depth);
          const $option = $($('#optionSelector option:selected')[selectedDepth]);

          try {
            const currentSelectedOptionCount = this.option.selectedOptions.length;

            const selectedOptionIndex = Number($option.val());
            this.option.changeSelectOption(selectedDepth, selectedOptionIndex);

            if (currentSelectedOptionCount !== this.option.selectedOptions.length) {
              this.option.resetSelectOption();
            }

            this.renderOptionSelector();
          } catch (error) {
            util.alertFailMsg(error);
          }
        },
        onChangeOrderCount({ target }) {
          const $target = $(target);
          if (!$target.val()) return;

          const optionNo = Number($target.closest('.option_selected').data('option-no'));
          this.option.changeOrderCount('custom', optionNo, Number($target.val()));
          this.renderOptionSelector();
        },
        onBlurTextOptionInput({ target }) {
          const $target = $(target);
          const inputMatchingType = $target.data('option-matching-type');
          if (!inputMatchingType) return;

          const inputNo = Number($target.attr('name'));
          const optionNo = Number($target.closest('.option_selected').data('option-no'));
          this.option.changeTextOption(inputMatchingType, optionNo, inputNo, $target.val(), $target.data('index'));
        },
        onKeyUpTextOptionInput({ target }) {
          if (target.value.length > 100) {
            shopby.alert('텍스트옵션 입력글자수를 초과하였습니다.');
            target.value = target.value.substring(0, 100);
          }
        },
        onClickTextOptionMode({ currentTarget }) {
          const optionNo = $(currentTarget).siblings('#amountTextOption').data('option-no');
          const textInputNo = $(currentTarget).siblings('#amountTextOption').data('text-input-no');
          const { orderCnt } = this.option.selectedOptions.find(option => option.optionNo === optionNo);
          //수량별일때 : orderCnt 만큼 inputbox 뿌려주기
          //옵션별일때 : inputbox 1개만
          this.option.drawAmountTextOption(optionNo, textInputNo, orderCnt);
          this.renderSelectedOptions();
        },
        onClickOrderCountBtns({ target }) {
          const actionType = util.actionType(target);
          const optionNo = Number($(target).closest('.option_selected').data('option-no'));
          if (!actionType) return;

          this.option.changeOrderCount(actionType, optionNo);
          this.renderSelectedOptions();
        },
        openPurchaseLayer({ target, currentTarget }) {
          const actionType = util.actionType(target);
          if (!actionType) return;
          if (actionType === 'buy' || actionType === 'cart') {
            $('.st_buy_content').removeClass('hidden');
            $(currentTarget).addClass('hidden');
          }
        },
        closeBuyLayer({ currentTarget }) {
          $(currentTarget).closest('.st_buy_content').addClass('hidden');
          $('#bottomBuyBox').removeClass('hidden');
        },
        onClickPurchaseBtns({ target }) {
          const actionType = util.actionType(target);
          if (!actionType) return;
          switch (actionType) {
            case 'createCart':
              this.createCart();
              break;
            case 'createOrder':
              this.createOrder();
              break;
            default:
              break;
          }
        },
        onClickDeleteOption({ target }) {
          const optionNo = Number($(target).closest('.option_selected').data('option-no'));
          this.option.deleteSelectedOption(optionNo);
          this.renderSelectedOptions();
        },
        onClickDownloadCoupon(event) {
          event.preventDefault();
          if (shopby.logined()) {
            shopby.popup('download-coupon', { productNo });
          } else {
            shopby.alert('로그인 후 서비스를 이용하실 수 있습니다.', () => shopby.goLogin(location.href));
          }
        },
        onClickMainImage(event) {
          event.preventDefault();
          const src = event.target.src;
          if (src) {
            const imageObjectList = [{ imageUrl: src }];
            shopby.popup('slide-images', { imageObjectList });
          }
        },
        onClickWishOrShare({ target }) {
          const actionType = util.actionType(target);
          if (!actionType) return;
          switch (actionType) {
            case 'wish':
              this.addWish();
              break;
            case 'share':
              this.openShareLayer();
              break;
            default:
              break;
          }
        },
        closeShareLayer() {
          $('.ly_share').hide();
        },
      },

      async generateNaverPay(data) {
        const {
          data: { naverPay },
        } = await shopby.api.order.getOrderConfigs(); // 네이버페이 버튼은 어드민설정과 동일하게 실시간으로 반영되어야 한다.

        // 네이버페이 사용하는 몰이면서, 네이버페이 주문 가능 상품인 경우만 가능
        if (!naverPay || !data.naverPayHandling) {
          return null;
        }

        return shopby.helper.naverPay({
          EMBED_ID: 'naverPay',
          BUTTON_KEY: naverPay.buttonKey,
          BUTTON_COUNT: 2,
          ENABLE: data.isUnablePurchasing ? 'N' : 'Y',
        });
      },
      loadNaverPayOrder() {
        try {
          this.option.validate();

          const { selectedOptions } = this.option;
          const param = selectedOptions.map(opt => ({
            productNo,
            optionNo: opt.optionNo,
            additionalProductNo: 0,
            orderCnt: opt.orderCnt,
            optionInputs: opt.textOptions
              .filter(textOption => textOption.value !== '')
              .map(({ inputLabel, value }) => ({ inputLabel, inputValue: value })),
          }));

          this.naverPay.requestNaverPayOrder(param);
        } catch (error) {
          errorHandler.cartAndOrder(error);
        }
      },
      loadNaverWishlist() {
        this.naverPay.requestNaverWishlist(productNo);
      },

      get requestForCartAndOrder() {
        return shopby.helper.option.requestBodyForCartOrOrder(
          productNo,
          this.option.selectedOptions,
          this.option.textOptions,
          this.optionUsed,
        );
      },
      get requestForOrder() {
        return {
          requestBody: {
            cartNos: null,
            productCoupons: null,
            trackingKey: null,
            channelType: null,
            products: this.requestForCartAndOrder,
          },
        };
      },
      async createCart() {
        try {
          this.option.validate();
          const isSuccess = await shopby.helper.cart.addCart(this.requestForCartAndOrder);

          if (!isSuccess) return;
          shopby.helper.cart.updateCartCount(true);
          const confirmOption = {
            message: '<strong>상품이 장바구니에 담겼습니다.</strong></br>바로 확인하시겠습니까?',
            iconType: 'cart',
          };
          const afterAdding = ({ state }) => {
            if (state === 'ok') {
              window.location.href = '/pages/order/cart.html';
            }
          };

          shopby.confirm(confirmOption, afterAdding);
        } catch (error) {
          errorHandler.cartAndOrder(error);
        }
      },

      async createOrder() {
        try {
          this.option.validate();

          const { data } = await shopby.api.order.postOrderSheets(this.requestForOrder);
          const orderPage = `/pages/order/order.html?ordersheetno=${data.orderSheetNo}`;
          if (shopby.logined()) {
            window.location.replace(orderPage);
          } else {
            shopby.goLogin(orderPage);
          }
        } catch (error) {
          const unauthenticatedErrorCodes = ['O3336', 'O3338'];
          if (unauthenticatedErrorCodes.includes(error.code)) return;
          errorHandler.cartAndOrder(error);
        }
      },

      addWish() {
        shopby.logined() ? this.toggleLiked() : util.confirmGoToLogin();
      },
      async toggleLiked() {
        const requestBody = { productNos: [productNo] };
        const { data } = await shopby.api.product.postProfileLikeProducts({ requestBody });
        const isLiked = data[0].result;
        this.renderLiked(isLiked);
      },

      openShareLayer() {
        $('.ly_share').show();
      },
    },

    // 상품상세 & 정보제공고시
    detail: {
      $detail: $container.find('#detail'),
      initiate(detailData) {
        this.render(detailData);
        this.bindEvents();
      },
      render(detailData) {
        //todo showsDetailInfo 옵션 이미지 확인
        this.$detail.render(detailData);
        displayHelper.slickRelatedProducts();
        displayHelper.showMoreDetailBtn();
      },
      bindEvents() {
        $('.sb_optionImageItem').on('click', this.onClickImageArea.bind(this));
        $('.btn_more_detail').on('click', this.onClickMoreDetail.bind(this));
      },
      async onClickImageArea(event) {
        event.preventDefault();
        const $target = $(event.currentTarget);

        const title = '자세히 보기';
        const imageObjectList = await this.fetchOptionImages($target);

        shopby.popup('slide-images', { imageObjectList, title });
      },
      async fetchOptionImages($target) {
        const optionNo = $target.data('optionNo');
        const value = $target.find('.sb_p_optionName').text();

        const request = {
          pathVariable: {
            productNo,
            optionNo,
          },
        };
        const { data } = await shopby.api.product.getProductsProductNoOptionsOptionNoImages(request);
        return data.map(image => ({
          ...image,
          value,
        }));
      },
      onClickMoreDetail({ currentTarget }) {
        $('.detail_explain_box').css('height', '100%');
        $(currentTarget).hide();
      },
    },

    //기본정보 ( 기본정보, 배송/교환/반품 정보)
    basic: {
      $basic: $container.find('#basic'),
      initiate(basicData) {
        this.render(basicData);
        this.bindEvents(basicData.remoteDeliveryAreaFees);
      },
      render(basicData) {
        const { deliveryGuide, exchangeGuide, afterServiceGuide, refundGuide } = basicData;
        const hasGuide = deliveryGuide || exchangeGuide || afterServiceGuide || refundGuide ? true : false;
        this.$basic.render({ ...basicData, hasGuide });
      },
      bindEvents(remoteDeliveryAreaFees) {
        $('#basic')
          .on('click', '.openblock_header', this.onClickBasicInfo.bind(this))
          .on('click', '#additionalDeliveryFee', () =>
            displayHelper.onClickAdditionalDeliveryFee(remoteDeliveryAreaFees),
          );
      },
      onClickBasicInfo({ currentTarget }) {
        if ($(currentTarget).hasClass('arrow_down')) {
          $(currentTarget).siblings('.openblock_content').removeClass('hidden');
          $(currentTarget).removeClass('arrow_down').addClass('arrow_up');
        } else {
          $(currentTarget).siblings('.openblock_content').addClass('hidden');
          $(currentTarget).removeClass('arrow_up').addClass('arrow_down');
        }
      },
    },

    review: {
      $review: $container.find('#review'),
      reviews: [],
      reviewPage: {},
      reviewable: false,
      reviewableProducts: [],
      reviewCommentsInfo: {}, // {reviewNo: { page:1 -> 리뷰더보기 누를 경우 1씩 증가, content: [리뷰 데이터 (페이지 증가 시 데이터 추가)]}}
      photoReviews: {},
      photoReviewParam: {},
      MAX_PHOTO_REVIEW_SIZE: 3,
      initiate(data) {
        this.reviewPage = new shopby.readMore(this.appendReviews.bind(this), '#btnReviewsMore', 5);
        this.reviewable = data.reviewable;
        this.reviewableProducts = data.item;
        this.render(data);
        this.bindEvents();
      },
      render(data) {
        $(this.$review.find('#reviewTit')).text(data.config.name);
        this.renderReviews(data);
      },
      async renderReviews(reviews, onlyPhotos, selectedOrder) {
        if (!reviews) {
          const results = await this.fetchReviewDefaultData(onlyPhotos, selectedOrder);
          reviews = generateData.review(...results, null, onlyPhotos);
          this.reviewable = reviews.reviewable;
          this.reviewableProducts = reviews.item;
        } else {
          this.reviewableProducts = reviews.item;
          this.$review.find('#writeReview-wrap').render({ reviewable: reviews.reviewable });
        }
        this.$review.find('#reviewList').render(reviews);
        this.reviewPage.render(reviews.totalCount);
        this.renderTabCount(reviews);
        this.$review.find('#reviewsViewType').render({ onlyPhotos });
        if (reviews.photoReviews) {
          this.$review.find('#photoReviews').render(reviews.photoReviews);
          this.$review.find('#sortReviews').render(reviews.photoReviews);
        }
        this.reviews = reviews.items;
        this.photoReviews = reviews.photoReviews;
        this.setReviewCommentsInfo(reviews.items);
      },
      async renderTabCount(reviews) {
        const { data: inquiries } = await shopby.product.view.inquiry.fetchInquires();
        shopby.product.view.renderTabInfo(reviews, inquiries);
      },
      renderComment(commentData, $reviewComment) {
        this.$review.find('#moreComments').remove();
        $reviewComment.find('#reviewComments').render(commentData);
      },
      setReviewCommentsInfo(reviews) {
        const FIRST_PAGE = 1;
        this.reviewCommentsInfo = Object.assign(
          {},
          ...reviews.map(({ reviewNo }) => ({ [reviewNo]: { page: FIRST_PAGE, contents: [] } })),
        );
      },

      async appendReviews() {
        const results = await this.fetchReviewDefaultData();
        const reviews = generateData.review(...results, null);
        if (reviews.totalCount === 0) return;
        this.reviewPage.render(reviews.totalCount);
        const compiled = Handlebars.compile($('#reviewListTemplate').html());
        const appendHtml = $(compiled({ ...reviews })).find('li');
        $('#reviewList ul').append(appendHtml);
      },
      fetchReviews(onlyPhotos, selectedOrder) {
        const request = this.getRequestForReview(onlyPhotos, selectedOrder);
        return shopby.api.display.getProductsProductNoProductReviews(request);
      },
      fetchReviewableInfo() {
        if (shopby.logined()) {
          return shopby.api.display.getProfileOrderOptionsProductReviewable({
            queryString: { hasTotalCount: true, productNo },
          });
        } else {
          const guestReviewableInfo = {
            data: {
              totalCount: 0,
              items: [],
            },
          };
          return new Promise(resolve => resolve(guestReviewableInfo));
        }
      },
      fetchReviewsConfigurations() {
        return shopby.api.display.getProductReviewsConfigurations();
      },
      fetchPhotoReviews() {
        this.photoReviewParam = {
          pathVariable: { productNo },
          queryString: { hasTotalCount: true, pageNumber: 1, pageSize: this.MAX_PHOTO_REVIEW_SIZE },
        };
        return shopby.api.display.getProductsProductNoPhotoReviews(this.photoReviewParam);
      },
      async fetchReviewDefaultData(onlyPhotos, selectedOrder) {
        const fetchData = await Promise.all([
          this.fetchReviewableInfo(),
          this.fetchProductsProductNoReviewableOptions(),
          this.fetchReviews(onlyPhotos, selectedOrder),
          this.fetchReviewsConfigurations(),
          this.fetchPhotoReviews(),
        ]);
        return fetchData.map(({ data }) => data);
      },
      async postReviewRecommend(request) {
        await shopby.api.display.postProductsProductNoProductReviewsReviewNoRecommend(request);
      },
      async deleteReviewRecommend(request) {
        await shopby.api.display.deleteProductsProductNoProductReviewsReviewNoRecommend(request);
      },
      getReview(reviewNo) {
        return shopby.api.display.getProductsProductNoProductReviewsReviewNo({
          pathVariable: { productNo, reviewNo },
        });
      },
      async changeReviewRecommendStatus(reviewNo, isRecommend, $target) {
        const request = {
          pathVariable: {
            productNo,
            reviewNo,
          },
        };
        isRecommend ? await this.postReviewRecommend(request) : await this.deleteReviewRecommend(request);
        const { data } = await this.getReview(reviewNo);
        $target.find('.recommendCnt').text(data.recommendCnt);
      },
      generateCommentData(contents, totalCount) {
        const hasMoreCommentsBtn = totalCount - contents.length > 0;
        return {
          hasMoreCommentsBtn,
          contents: contents.map(content => ({
            ydmt: this.removeSecondFromYdmt(content.registerYmdt),
            ...content,
          })),
        };
      },
      async fetchReviewComments(reviewNo) {
        const COMMENT_PAGE_SIZE = 20;
        const { page, contents } = this.reviewCommentsInfo[reviewNo];
        const request = {
          pathVariable: {
            productNo,
            reviewNo,
          },
          queryString: {
            size: COMMENT_PAGE_SIZE,
            page,
            hasTotalCount: true,
          },
        };
        const { data } = await shopby.api.display.getProductsProductNoProductReviewsReviewNoComments(request);
        this.reviewCommentsInfo[reviewNo].contents.push(...data.contents);
        return this.generateCommentData(contents, data.totalCount);
      },
      async fetchProductsProductNoReviewableOptions() {
        if (!shopby.logined()) {
          const reviewableOptions = {
            data: {
              reviewable: false,
              item: [],
            },
          };
          return new Promise(resolve => resolve(reviewableOptions));
        }

        const request = {
          pathVariable: {
            productNo,
          },
        };
        return await shopby.api.display.getProductsProductNoReviewableOptions(request);
      },
      bindEvents() {
        this.$review
          .on('click', '#reviewsViewType', this.events.onClickFilterReviewsByViewType.bind(this))
          .on('click', '#writeReview', this.events.onClickWriteReview.bind(this))
          .on('change', '#sortReviews', this.events.onClickSortReviews.bind(this))
          .on('click', '#reviewList', this.events.onClickReviewList.bind(this))
          .on('click', '#attachImage', this.events.viewAttahments.bind(this))
          .on('click', '#reviewThumbs', this.events.onClickReviewThumbs.bind(this));
      },
      events: {
        onClickFilterReviewsByViewType({ target }) {
          $(target).toggleClass('on');
          const onlyPhotos = $(target).hasClass('on');
          this.reviewPage.pageNumber = 1;
          this.renderReviews('', onlyPhotos);
        },
        async onClickWriteReview() {
          const { data } = await this.fetchProductsProductNoReviewableOptions();
          if (data.item[0].nonReviewableProduct === true) {
            shopby.alert({ message: '선택하신 상품은 후기를 작성하실 수 없습니다.' });
            return;
          }
          const option = helper.review.generateReviewOptionForUpdatingLayer(
            this.reviewableProducts[0],
            true,
            this.reviewableProducts.length > 1,
            true,
          );
          helper.review.openReviewLayer.apply(this, [option]);
        },
        async onClickSortReviews(event) {
          const $target = $(event.target).find('option:selected');
          const orderBy = $target.data('order-by');
          const orderDirection = $target.data('order-direction');
          const selectedOrder = { orderBy, orderDirection };
          this.reviewPage.pageNumber = 1;
          await this.renderReviews(null, null, selectedOrder);

          const sortBtnArr = this.$review.find('#sortReviews').children();
          for (let i = 0; i < sortBtnArr.length; i = i + 1) {
            if (sortBtnArr[i].dataset.orderBy === orderBy && sortBtnArr[i].dataset.orderDirection === orderDirection) {
              sortBtnArr[i].selected = true;
              break;
            }
          }
        },
        onClickReviewList(event) {
          event.stopPropagation();
          event.preventDefault();
          const $target = $(event.target);
          const actionType = $target.data('action-type') || $target.parents().data('action-type');
          const reviewNo = $target.closest('li').data('review-no');
          const givenAccumulation = $target.closest('li').data('given-accumulation');
          switch (actionType) {
            case 'viewMoreReviews':
              $target.closest('li').toggleClass('on').find($target).toggleClass('on');
              $target.toggleClass('on');
              break;
            case 'modifyReview':
              this.modifyReview(reviewNo);
              break;
            case 'deleteReview':
              this.deleteReview(reviewNo, givenAccumulation);
              break;
            case 'reviewRecommend':
              this.recommendReview(reviewNo, event, $target);
              break;
            case 'reviewComment':
              this.showComment(reviewNo, $target);
              break;
            case 'moreComments':
              this.showMoreComments(reviewNo, $target);
              break;
            default:
              break;
          }
        },

        async viewAttahments({ target }) {
          const result = await this.fetchReviews();
          const { items } = result.data;

          const attachImages = items
            .find(({ reviewNo }) => reviewNo === $(target).closest('li').data('review-no'))
            .fileUrls.map(fileUrl => ({
              imageUrl: fileUrl,
              originName: '',
            }));

          shopby.popup('slide-images', {
            title: '첨부파일',
            imageObjectList: attachImages,
            clickedImageIndex: $(target.closest('.uploadFile-item')).data('index'),
          });
        },
        onClickReviewThumbs({ target }) {
          const $target = $(target);
          const reviewNo = $target.closest('button').data('review-no');
          const actionType = $target.data('action-type') || $target.parents().data('action-type');
          switch (actionType) {
            case 'photoReviews':
              $target.closest('.reviews_list_con').toggleClass('on').find('.txt_more').toggle();
              break;
            case 'photoReviewDetail':
              this.openPhotoReviewDetailPopup(reviewNo);
              break;
            case 'morePhotoReviews':
              this.openPhotoReviewsPopup(reviewNo);
              break;
            default:
              break;
          }
        },
      },
      resetCommentsPageInfo(reviewNo) {
        this.reviewCommentsInfo[reviewNo].page = 1;
        this.reviewCommentsInfo[reviewNo].contents = [];
      },
      removeSecondFromYdmt(ydmt) {
        const SECONDS_LENGTH = 3;
        return ydmt.substring(0, ydmt.length - SECONDS_LENGTH);
      },
      modifyReview(selectedReviewNo) {
        const review = this.reviews.find(({ reviewNo }) => reviewNo === selectedReviewNo);
        const option = helper.review.generateReviewOptionForUpdatingLayer(review, true);
        helper.review.openReviewLayer.apply(this, [option]);
      },
      deleteReview(reviewNo, givenAccumulation) {
        const deleteReview = async ({ state }) => {
          if (state !== 'ok') return;

          const pathVariable = {
            productNo,
            reviewNo,
          };

          await shopby.api.display.deleteProductsProductNoProductReviewsReviewNo({ pathVariable });
          shopby.alert('삭제되었습니다.', () => this.renderReviews());
        };
        if (givenAccumulation === 'Y') {
          shopby.confirm(
            { message: '삭제 시 재작성이 불가하며, 지급된 적립금이 차감됩니다. 삭제하시겠습니까?' },
            deleteReview,
          );
        } else {
          shopby.confirm({ message: '삭제 시 재작성이 불가합니다. 상품후기를 삭제하시겠습니까?' }, deleteReview);
        }
      },
      toggleElement($target) {
        $target.toggleClass('on');
      },
      isCheckedElement($target) {
        return $target.hasClass('on');
      },
      recommendReview(reviewNo, event, $target) {
        if (!shopby.logined()) {
          event.preventDefault();
          shopby.alert({ message: '로그인 후 이용할 수 있습니다.' });
          return;
        }
        const $targetParents = $target.closest('#reviewRecommendParents');
        this.toggleElement($targetParents);
        const isRecommend = this.isCheckedElement($targetParents);
        $targetParents.closest('label').find('input').attr('checked', isRecommend);
        this.changeReviewRecommendStatus(reviewNo, isRecommend, $targetParents);
      },
      async showComment(reviewNo, $target) {
        this.toggleElement($target);
        const $targetReview = $target.closest('li');
        const checked = this.isCheckedElement($target);
        $target.closest('label').find('input').attr('checked', checked);
        if (checked) {
          this.resetCommentsPageInfo(reviewNo);
          const commentData = await this.fetchReviewComments(reviewNo);
          this.renderComment(commentData, $targetReview);
        } else {
          $targetReview.find('#reviewComments').hide();
          this.$review.find('#moreComments').remove();
        }
      },
      async showMoreComments(reviewNo, $target) {
        const $targetReview = $target.closest('li');
        this.reviewCommentsInfo[reviewNo].page += 1;
        const commentData = await this.fetchReviewComments(reviewNo);
        this.renderComment(commentData, $targetReview);
      },
      openPhotoReviewDetailPopup(reviewNo) {
        const popupCallback = () => {
          const onlyPhotos = this.$review.find('#filterReviewsByViewType').hasClass('on');
          this.renderReviews('', onlyPhotos);
        };
        this.photoReviewParam.queryString.pageSize = 9999;

        shopby.popup(
          'photo-review-detail',
          {
            productNo,
            reviewNo,
            hasCloseBtn: true,
            type: 'photoReviews',
            parameter: this.photoReviewParam,
            productReviewConfig: { name: '상세 후기' },
            onlyDisplayedReviews: true,
            totalPage: this.photoReviews.totalCount,
          },
          popupCallback.bind(this),
        );
      },
      async openPhotoReviewsPopup() {
        shopby.popup('photo-reviews', { productNo });
      },
      getRequestForReview(hasAttachmentFile = false, selectedOrder) {
        const orderBy = (selectedOrder && selectedOrder.orderBy) || 'BEST_REVIEW';
        const orderDirection = (selectedOrder && selectedOrder.orderDirection) || 'DESC';
        return {
          pathVariable: {
            productNo,
          },
          queryString: {
            productNo,
            pageNumber: (this.reviewPage && this.reviewPage.pageNumber) || 1,
            pageSize: (this.reviewPage && this.reviewPage.pageSize) || 5,
            hasTotalCount: true,
            'order.by': orderBy,
            'order.direction': orderDirection,
            hasAttachmentFile: hasAttachmentFile ? hasAttachmentFile : '',
          },
        };
      },
    },

    inquiry: {
      $inquiry: $container.find('#inquiry'),
      inquiryPage: null,
      initiate(data) {
        this.inquiryPage = new shopby.readMore(this.appendInquiries.bind(this), '#btnInquiriesMore', 5);
        this.render(data);
        this.bindEvents();
      },
      fetchInquires() {
        return shopby.api.display.getProductsProductNoInquires(this.requestForInquiry);
      },
      render(data) {
        this.inquiryPage.render(data.totalCount);

        $(this.$inquiry.find('#inquiryTit')).text(data.config.name);
        this.$inquiry.data('guestPostingUsed', data.config.guestPostingUsed);
        this.renderInquiries(data);
      },
      async renderInquiries(inquiries) {
        if (!inquiries) {
          const { data } = await this.fetchInquires();
          inquiries = {
            totalCount: data.totalCount,
            items: data.items,
          };
        }
        this.renderTabCount(inquiries);
        this.inquiryPage.render(inquiries.totalCount);
        this.$inquiry.find('.inquiryTotalCount').text(inquiries.totalCount);
        this.$inquiry.find('#inquiries').render(inquiries);
      },
      async renderTabCount(inquiries) {
        const { data: reviews } = await shopby.product.view.review.fetchReviews();
        shopby.product.view.renderTabInfo(reviews, inquiries);
      },
      bindEvents() {
        this.$inquiry.on('click', '#inquiryContainer', this.events.onClickInquiryTable.bind(this));
      },
      events: {
        onClickInquiryTable(event) {
          event.preventDefault();
          const $target = $(event.target);
          const actionType = $target.data('action-type') || $target.parents().data('action-type');
          if (!actionType) return;

          const inquiryNo = $target.closest('li').data('inquiry-no');
          switch (actionType) {
            case 'viewMore':
              this.viewMore($target);
              break;
            case 'writeInquiry':
              this.writeInquiry();
              break;
            case 'modifyInquiry':
              this.modifyInquiry($target);
              break;
            case 'deleteInquiry':
              this.deleteInquiry(inquiryNo);
              break;
            default:
              break;
          }
        },
      },
      viewMore($target) {
        const { secreted, myInquiry } = $target.closest('li').data();

        if (secreted && !myInquiry) {
          shopby.alert('비밀글 조회 권한이 없습니다');
          return;
        }
        $target.closest('li').toggleClass('on').find($target).toggleClass('on');
        $target.closest('li').find('.answer').toggle();
      },
      afterUpdatingInquiry({ state }) {
        state === 'ok' && this.renderInquiries();
      },
      writeInquiry() {
        const guestPostingUsed = this.$inquiry.data('guestPostingUsed');

        if (!guestPostingUsed && !shopby.logined()) {
          util.confirmGoToLogin();
        } else {
          const option = helper.inquiry.generateInquiryOptionForUpdatingLayer();
          shopby.popup('product-inquiry', option, this.afterUpdatingInquiry.bind(this));
        }
      },
      modifyInquiry($target) {
        const openModifyingLayer = ({ state }) => {
          const data = $target.closest('li').data();
          const option = helper.inquiry.generateInquiryOptionForUpdatingLayer(data);

          if (state !== 'ok') return;

          shopby.popup('product-inquiry', option, this.afterUpdatingInquiry.bind(this));
        };

        shopby.confirm({ message: '해당 상품문의를 수정하시겠습니까?' }, openModifyingLayer);
      },
      deleteInquiry(inquiryNo) {
        const deleteInquiry = async ({ state }) => {
          if (state !== 'ok') return;

          await shopby.api.display.deleteProductsInquiresInquiryNo({ pathVariable: { inquiryNo } });
          this.renderInquiries();
        };

        shopby.confirm({ message: '해당 상품문의를 삭제하시겠습니까?' }, deleteInquiry);
      },
      async appendInquiries() {
        const result = await this.fetchInquires();
        const { items, totalCount } = result.data;
        if (totalCount === 0) return;

        this.inquiryPage.render(totalCount);
        const compiled = Handlebars.compile($('#inquiriesTemplate').html());
        const appendHtml = $(compiled({ items })).find('li');
        $('#inquiries ul').append(appendHtml);
      },

      get requestForInquiry() {
        const START_YMD = '1000-01-01';
        const END_YMD = '9999-12-30';
        return {
          pathVariable: {
            productNo,
          },
          queryString: {
            productNo,
            pageNumber: (this.inquiryPage && this.inquiryPage.pageNumber) || 1,
            pageSize: (this.inquiryPage && this.inquiryPage.pageSize) || 5,
            hasTotalCount: true,
            isMyInquiries: false,
            endYmd: END_YMD,
            startYmd: START_YMD,
          },
        };
      },
    },
  };

  const generateData = {
    summary(product, options, coupons) {
      const { status, price, baseInfo, deliveryFee, reservationData, limitations } = product;
      const { contentsIfPausing, additionDiscountAmt, immediateDiscountAmt, salePrice: originPrice } = price;
      const totalDiscount = additionDiscountAmt + immediateDiscountAmt;
      const salePrice = originPrice - totalDiscount;
      const shouldShowContentsIfPausing = status.saleStatusType === 'STOP' && contentsIfPausing !== '';
      const { getCouponRateAndPrice, getDeliveryLabels, checkUnablePurchasing } = helper.product;
      const { couponRate, priceWithCoupon } = getCouponRateAndPrice(price);
      const deliveryLabels = getDeliveryLabels.apply(helper.product, [product.deliveryFee]);
      const isUnablePurchasing = checkUnablePurchasing(product, options.flatOptions);
      const { naverPayHandling } = product.limitations;

      return {
        ...price,
        ...baseInfo,
        ...deliveryFee,
        options,
        reservationData,
        shouldShowContentsIfPausing,
        totalDiscount,
        couponRate,
        priceWithCoupon,
        originPrice,
        salePrice,
        deliveryFeeLabel: (deliveryLabels && deliveryLabels.deliveryFeeLabel) || '',
        deliveryLabel: (deliveryLabels && deliveryLabels.deliveryLabel) || '',
        conditionLabel: (deliveryLabels && deliveryLabels.conditionLabel) || '',
        isUnablePurchasing,
        liked: product.liked,
        naverPayHandling,
        hasCoupon: coupons.length > 0,
        limitations,
        useLimitations:
          limitations.minBuyCnt > 0 ||
          limitations.maxBuyTimeCnt > 0 ||
          limitations.maxBuyPersonCnt > 0 ||
          limitations.maxBuyPeriodCnt > 0,
        useLimitationsComma:
          limitations.minBuyCnt > 0 &&
          (limitations.maxBuyTimeCnt > 0 || limitations.maxBuyPersonCnt > 0 || limitations.maxBuyPeriodCnt > 0),
      };
    },
    detail(product, images, option) {
      const { baseInfo } = product;
      const dutyInfo = JSON.parse(baseInfo.dutyInfo);
      const { showsDetailInfo, showsDutyInfo, optionImages, mapDutyInfoContents } = helper.product;
      return {
        ...baseInfo,
        dutyInfoContents: mapDutyInfoContents(dutyInfo.contents),
        showsDetailInfo: showsDetailInfo(baseInfo),
        showsDutyInfo: showsDutyInfo(dutyInfo),
        optionImages: optionImages(images, option.flatOptions),
      };
    },
    basic(product) {
      const { baseInfo, deliveryGuide, exchangeGuide, afterServiceGuide, refundGuide, deliveryFee } = product;
      const { getDeliveryLabels } = helper.product;
      const deliveryLabels = getDeliveryLabels.apply(helper.product, [product.deliveryFee]);

      return {
        ...baseInfo,
        deliveryGuide,
        exchangeGuide,
        afterServiceGuide,
        refundGuide,
        remoteDeliveryAreaFees: deliveryFee && deliveryFee.remoteDeliveryAreaFees,
        deliveryFeeLabel: deliveryLabels && deliveryLabels.deliveryFeeLabel,
        deliveryLabel: deliveryLabels && deliveryLabels.deliveryLabel,
        conditionLabel: deliveryLabels && deliveryLabels.conditionLabel,
      };
    },
    review(
      reviewableInfo,
      reviewableOptions,
      reviews,
      reviewsConfigurations,
      photoReviews,
      config,
      onlyPhotos = false,
    ) {
      photoReviews.contents = photoReviews.contents.map(contents => ({ ...contents, url: contents.urls[0] }));
      return {
        ...reviews,
        photoReviews: { ...reviewsConfigurations, ...photoReviews },
        reviewable: reviewableOptions.reviewable,
        item: reviewableInfo.items,
        onlyPhotos,
        config,
        isLogin: shopby.logined(),
      };
    },
    inquiry({ items, totalCount }, config) {
      return {
        items,
        totalCount,
        config,
      };
    },
  };

  const helper = {
    product: {
      getCouponRateAndPrice(priceInfo) {
        const { salePrice, couponDiscountAmt, immediateDiscountAmt } = priceInfo;

        const coupon = couponDiscountAmt || 0;
        const price = salePrice || 0;
        const immediateDiscount = immediateDiscountAmt || 0;
        const couponRate = !couponDiscountAmt ? 0 : ((coupon / (price - immediateDiscount)) * 100).toFixed(0);

        return {
          priceWithCoupon: salePrice - (couponDiscountAmt + immediateDiscountAmt),
          couponRate,
        };
      },
      getDeliveryLabels(deliveryFee) {
        if (!deliveryFee) return null;
        return {
          deliveryFeeLabel: this.getDeliveryFeeLabel(deliveryFee),
          deliveryLabel: this.getDeliveryLabel(deliveryFee),
          conditionLabel: this.getDeliveryConditionLabel(deliveryFee),
        };
      },
      getDeliveryFeeLabel({ deliveryConditionType, deliveryAmt }) {
        const isFree = deliveryConditionType === 'FREE';
        return isFree ? '무료' : `${toCurrencyString(deliveryAmt)}원`;
      },
      getDeliveryLabel({ deliveryType, deliveryPrePayment }) {
        const DELIVERY_TYPE_LABEL = deliveryType === 'PARCEL_DELIVERY' ? '택배/등기/소포' : '직접배송';
        const PAYMENT_TYPE_LABEL = deliveryPrePayment ? '선결제' : '착불';
        return `${DELIVERY_TYPE_LABEL} / ${PAYMENT_TYPE_LABEL}`;
      },
      getDeliveryConditionLabel({ perOrderCnt, aboveDeliveryAmt, deliveryConditionType }) {
        switch (deliveryConditionType) {
          case 'QUANTITY_PROPOSITIONAL_FEE':
            return `(${perOrderCnt}개마다 부과)`;
          case 'CONDITIONAL':
            return `(${toCurrencyString(aboveDeliveryAmt)}원 이상 구매 시 무료)`;
          default:
            return '';
        }
      },
      checkUnablePurchasing({ status, limitations }, options) {
        const { saleStatusType, soldout } = status;

        // 판매종료, 판매정지, 판매금지, 판매대기
        if (['FINISHED', 'STOP', 'PROHIBITION', 'READY'].includes(saleStatusType)) {
          return true;
        }

        // 품절 (예약판매 재고, 일반 판매재고)
        if (soldout) {
          return true;
        }

        if (limitations.memberOnly && !shopby.logined()) {
          return true;
        }

        return !(options && options.length > 0);
      },
      showsDetailInfo({ optionImageViewable, content, contentHeader, contentFooter }) {
        return (
          optionImageViewable || [content, contentHeader, contentFooter].some(content => content && content.length > 0)
        );
      },
      showsDutyInfo({ contents }) {
        return contents.length > 0;
      },
      optionImages(images, flatOptions) {
        return images.map(image => {
          const { value } = flatOptions.find(({ optionNo }) => optionNo === image.optionNo);
          return {
            ...image,
            value,
          };
        });
      },
      mapDutyInfoContents(contents) {
        let isKcCertifications = false;

        const mappingDutyInfo = contents.map(content => {
          const [key, value] = Object.entries(content).flat();

          if (key === 'KC 인증정보') {
            isKcCertifications = true;
          }

          return { key, value };
        });

        return { mappingDutyInfo, isKcCertifications };
      },
    },
    review: {
      forRegistrationMode(productOption) {
        const option = shopby.utils.pickObjectByKeys(productOption, [
          'orderedOption',
          'optionNo',
          'orderOptionNo',
          'orderStatusType',
          'optionUsed',
          'optionName',
          'optionValue',
        ]);
        return {
          options: [{ ...option }],
        };
      },
      forModificationMode(productOption) {
        const { orderedOption, ...rest } = productOption;
        return {
          myProductReview: {
            ...rest,
          },
          options: [{ ...orderedOption }],
        };
      },
      generateReviewOptionForUpdatingLayer(
        productOption,
        notSelectProduct = false,
        needsSelectProductBtn = false,
        registration = false,
      ) {
        const { imageUrl: imageUrls, productName, productNo } = productOption;

        const extraOption = registration
          ? this.forRegistrationMode(productOption)
          : this.forModificationMode(productOption);

        return {
          productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig,
          product: {
            imageUrls,
            productName,
            productNo,
          },
          notSelectProduct,
          needsSelectProductBtn,
          ...extraOption,
          isProductViewPage: true,
        };
      },
      openReviewLayer(option) {
        const callback = ({ state }) => state === 'ok' && this.renderReviews();
        shopby.popup('product-review', option, callback.bind(this));
      },
    },
    inquiry: {
      generateInquiryOptionForUpdatingLayer(additionalData) {
        const mode = additionalData ? 'modification' : 'registration';
        return {
          mode,
          ...$container.data('productInfo'),
          ...additionalData,
        };
      },
    },
  };

  const util = {
    actionType(event) {
      const target = event.target || event;
      return $(target).data('action-type') || $(target).parents().data('action-type');
    },
    alertFailMsg(error) {
      const message = error.message || error.result.message || error;
      shopby.alert({ message, iconType: 'fail' });
    },
    confirmGoToLogin() {
      const confirmOption = { message: '로그인 후 이용할 수 있습니다.' };
      const callback = ({ state }) => state === 'ok' && shopby.goLogin(location.href);

      shopby.confirm(confirmOption, callback);
    },
  };

  const displayHelper = {
    slickMainImages(imageUrls) {
      const $main = $container.find('.item_photo_big');

      $main.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        fade: true,
        infinite: true,
        dots: true,
      });

      imageUrls.forEach(url => {
        $main.slick('slickAdd', `<span class="img_photo_big"><a><img src="${url}"/></a></span>`);
      });

      //todo : 이미지 영역 사이즈 리사이즈
    },

    slickRelatedProducts() {
      $container
        .find('.item_swipe_type ul.slider-wrap')
        .on('init', function () {})
        .slick({
          arrows: false,
          draggable: true,
          autoplay: true,
          infinite: true,
          slidesToShow: 2,
          slidesToScroll: 1,
        })
        .on('beforeChange', function () {});
    },

    fadeOutLikeMessage(liked, init) {
      if (init) return;

      const text = liked ? '찜 리스트에 추가' : '찜 리스트에서 제거';
      const messageHtml = `<p>상품이 <strong>${text}</strong>되었습니다.</p>`;
      const $wrapper = $($container.find('.like-message-wrapper'));

      $wrapper.fadeIn();
      $container.find('.add_wish_box').html(messageHtml).removeClass('hidden');
      $wrapper.fadeOut();
    },

    optionSelector(selectedDepthIndex, selectedOptionIndex) {
      $container.find('.chosen-select').each(function (selectIdx) {
        if (selectIdx === selectedDepthIndex) {
          $('option', this).each(function (optionIdx) {
            $(this).prop('selected', optionIdx === selectedOptionIndex + 1);
          });
        }
      });
    },

    onClickAdditionalDeliveryFee(remoteDeliveryAreaFees) {
      shopby.popup('additional-delivery-fee', { remoteDeliveryAreaFees });
    },

    toggleRelatedProducts(viewable, data) {
      if (viewable) {
        $container.find('#relatedProducts').render({ relatedProducts: data });
        this.slickRelatedProducts();
      } else {
        $container.find('#relatedProductsTit').hide().siblings().hide();
      }
    },

    isUnablePurchasing(viewable) {
      if (viewable) return;
      $container.find('.item_choice_list, .item_add_option_box').hide();
    },

    showMoreDetailBtn() {
      const $detailArea = $('.detail_explain_box');
      if ($detailArea.height() > 500) {
        $detailArea.css('height', '500px');
        $('.btn_more_detail').show();
      }
    },
  };

  //todo 동작하지 않음..
  const errorHandler = {
    cartAndOrder(error) {
      const ERROR_CODE = {
        NO_EXHIBITION: 'PPVE0019',
        NO_MINOR_1: 'PPVE0003',
        NO_MINOR_2: 'ODSH0002',
        SOLDOUT_OPTION: 'PPVE0011',
      };
      if (error && error.code === ERROR_CODE.NO_EXHIBITION) {
        shopby.goHome();
        return;
      }
      if ((error && error.code === ERROR_CODE.NO_MINOR_1) || (error && error.code === ERROR_CODE.NO_MINOR_2)) {
        const message = '해당 상품은 성인전용 상품입니다. 성인인증 후 상품을 구매하시겠습니까?';
        const callback = ({ state }) => (state === 'ok' ? shopby.goAdultCertification() : shopby.goHome());
        shopby.confirm({ message }, callback);
        return;
      }
      if (error.code === ERROR_CODE.SOLDOUT_OPTION) {
        shopby.alert('재고가 부족합니다. 수량을 조정해주세요.');
        throw error;
      }
      if (error && error.code) {
        const message = error.message || error.result.message;
        shopby.alert({ message }, () => history.go(0));
      } else {
        util.alertFailMsg(error);
      }
    },
  };

  shopby.start.initiate(shopby.product.view.initiate.bind(shopby.product.view));
});

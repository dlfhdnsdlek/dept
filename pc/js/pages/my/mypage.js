/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Haekyu Cho
 * @since 2021-06-25
 */
$(() => {
  shopby.mypage = {
    start: 0,
    pageSize: 4,
    reveiwableProducts: 0,
    initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      this._fetchApis().then(responses => {
        if (responses.some(response => response && response.error)) {
          // @fixme: /malls 도 401로 떨어져서 그냥 에러남.. 망함..
          shopby.alert('인증 정보가 만료되었습니다.', shopby.goLogin);
        } else {
          this.render(responses);
        }
      });
    },

    render(responses) {
      const [
        summary,
        summaryAmount,
        grade,
        progressInquiry,
        answeredInquiry,
        progressProductInquiry,
        answeredProductInquiry,
        possibleProductReview,
        myProductReview,
        orderSummary,
        likeProduct,
      ] = responses;

      shopby.my.summary.init('#myPageSummary', summary, summaryAmount, likeProduct.totalCount, grade);
      this.reveiwableProducts = possibleProductReview.totalCount;

      $('#myOrderLastHalfYear').render(orderSummary);
      $('#myBoardSummary').render({
        inquirySummary: this._getInquirySummaryData(progressInquiry, answeredInquiry),
        productInquirySummary: this._getProductInquirySummaryData(progressProductInquiry, answeredProductInquiry),
        productReviewSummary: this._getProductReviewSummary(possibleProductReview, myProductReview),
      });

      this._renderRecentProducts(summary.memberName);
    },

    async _fetchApis() {
      const result = await Promise.all([
        shopby.api.member.getProfileSummary(), // FIXME: API Deprecated
        shopby.api.order.getProfileOrdersSummaryAmount({
          queryString: {
            orderStatusType: 'BUY_CONFIRM',
            startYmd: shopby.date.lastHalfYear(),
            endYmd: shopby.date.today(),
          },
        }),
        shopby.api.member.getProfileGrade(),
        shopby.api.manage.getInquiries({
          queryString: {
            hasTotalCount: true,
            inquiryStatuses: 'ISSUED,IN_PROGRESS',
            startYmd: '2020-01-01',
          },
        }),
        shopby.api.manage.getInquiries({
          queryString: {
            hasTotalCount: true,
            inquiryStatuses: 'ANSWERED',
            startYmd: '2020-01-01',
          },
        }),
        shopby.api.display.getProfileProductInquiries({
          queryString: {
            answered: false,
            hasTotalCount: true,
            startYmd: '2020-01-01',
          },
        }),
        shopby.api.display.getProfileProductInquiries({
          queryString: {
            answered: true,
            hasTotalCount: true,
            startYmd: '2020-01-01',
          },
        }),
        shopby.api.display.getProfileOrderOptionsProductReviewable({
          queryString: {
            hasTotalCount: true,
            startDate: '2020-01-01',
          },
        }),
        shopby.api.display.getProfileProductReviews({
          queryString: {
            hasTotalCount: true,
            startYmd: '2020-01-01',
          },
        }),
        shopby.api.order.getProfileOrdersSummaryStatus({
          queryString: {
            startYmd: shopby.date.lastHalfYear(),
          },
        }),
        // summary 찜리스트 totalCount만 받아오기 위해 추가
        // 전체 카운트만 받아오는 것으로 pageNumber, pageSize는 추가하지 않음
        shopby.api.product.getProfileLikeProducts({
          queryString: {
            hasTotalCount: true,
          },
        }),
      ]);
      return result.map(({ data }) => data);
    },

    _renderRecentProducts(memberName) {
      const MAX_COUNT = 10;

      shopby.cache
        .getRecentProducts()
        .then(recentProducts => recentProducts.slice(0, MAX_COUNT))
        .then(recentProducts => {
          $('#myRecentProducts').render({
            memberName,
            recentProducts,
          });

          if (recentProducts.length > 2) this.bindFlicking();
        });
      this.bindEvents();
    },

    openProductReviewPopup() {
      if (this.reveiwableProducts === 0) {
        shopby.alert({ message: '후기를 남길 수 있는 상품이 없습니다.' });
        return;
      }

      shopby.popup(
        'product-review',
        { productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig },
        callback => {
          if (callback.state === 'ok') {
            location.reload();
          }
        },
      );
    },
    openInqueryPopup() {
      shopby.popup('inquiry', { type: 'registration' }, () => {
        location.reload();
      });
    },
    openInqueryPrdPopup() {
      shopby.popup('product-inquiry', null, () => {
        location.reload();
      });
    },
    bindEvents() {
      $('#writeReview').on('click', this.openProductReviewPopup.bind(this));
      $('#writeQuery').on('click', this.openInqueryPopup);
      $('#writeInqueryPrd').on('click', this.openInqueryPrdPopup);
    },
    bindFlicking() {
      const SLICK_OPTION = {
        draggable: true,
        autoplay: false,
        arrows: true,
        infinite: false,
        slidesToShow: 4,
        slidesToScroll: 4,
        speed: 100,
        touchThreshold: 8, // 민감도. 높을수록 민감해짐
      };
      $('#flicking').slick(SLICK_OPTION);
    },

    _getInquirySummaryData(progressResult, answeredResult) {
      const { inquiryConfig: config } = shopby.cache.getBoardsConfig();

      return {
        used: config.used,
        name: config.name,
        progressCnt: (progressResult && progressResult.totalCount) || 0,
        answeredCnt: (answeredResult && answeredResult.totalCount) || 0,
      };
    },

    _getProductInquirySummaryData(progressResult, answeredResult) {
      const { productInquiryConfig: config } = shopby.cache.getBoardsConfig();
      return {
        used: config.used,
        name: config.name,
        progressCnt: (progressResult && progressResult.totalCount) || 0,
        answeredCnt: (answeredResult && answeredResult.totalCount) || 0,
      };
    },

    _getProductReviewSummary(possibleProductReview, myProductReview) {
      const { productReviewConfig: config } = shopby.cache.getBoardsConfig();

      return {
        used: config.used,
        name: config.name,
        availableCnt: (possibleProductReview && possibleProductReview.totalCount) || 0,
        completedCnt: (myProductReview && myProductReview.totalCount) || 0,
      };
    },
  };

  shopby.start.initiate(shopby.mypage.initiate.bind(shopby.mypage));
});

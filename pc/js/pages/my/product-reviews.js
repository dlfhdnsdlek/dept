/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.9
 */

$(() => {
  shopby.my.productReviews = {
    page: shopby.pagination,
    productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig,
    possibleProductReviewList: null,
    backPageNumber: null,
    searchType: '',
    searchKeyword: '',

    initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      window.onpopstate = this.onPopState.bind(this);
      this.page = new shopby.pagination(this.onPagination.bind(this), '#productReviewsPagination', 20);

      Promise.all([
        this._getMyProductReviews(),
        this._getPossibleWriteProductReviews(),
        this._getReviewRewardNoticeText(),
      ]).then(() => {
        this.renderInit();
        this.bindEvents();
      });
    },

    renderInit() {
      $('#boardTitle').render({ productReviewConfig: this.productReviewConfig });
      $('#myLocation').render({ productReviewConfig: this.productReviewConfig });
      $('#btnWriteReviewableProduct').render({ totalCount: this.reviewableProducts.totalCount });
      $('#btnReviewRewardNotice-wrap').render({ reviewRewardNoticeText: this.reviewRewardNoticeText });
    },

    bindEvents() {
      $('#btnWriteReviewableProduct').on('click', this.openProductReviewPopup.bind(this));
      $('.btn_board_search').on('click', this.search.bind(this)).enterKeyup('#reviewKeyword');
      $('.btn-benefit-info').on('click', () => this.toggleBenefitModal(true));
      $('.btn-sidebar-modal').on('click', () => this.toggleBenefitModal(false));
      $('#btnReviewRewardNotice').on('click', () => this.toggleReviewRewardModal(true));
      $('#reviewRewardPopupCloseBtn').on('click', () => this.toggleReviewRewardModal(false));
    },

    toggleBenefitModal(isVisible) {
      const $modal = $('.sidebar-modal');
      isVisible ? $modal.addClass('on') : $modal.removeClass('on');
    },

    toggleReviewRewardModal(isVisible) {
      const $modal = $('#reviewRewardPopup');
      isVisible ? $modal.addClass('on') : $modal.removeClass('on');
    },

    onPopState() {
      this.backPageNumber = shopby.utils.getUrlParam('pageNumber');
      this.searchType = shopby.utils.getUrlParam('searchType');
      this.searchKeyword = shopby.utils.getUrlParam('searchKeyword');
      this._getMyProductReviews();
    },

    onPagination() {
      this.backPageNumber = null;
      this._getMyProductReviews();
    },

    openProductReviewPopup() {
      shopby.popup(
        'product-review',
        {
          productReviewConfig: this.productReviewConfig,
        },
        callback => {
          if (callback.state === 'ok') {
            this._getMyProductReviews();
          }
        },
      );
    },

    async search() {
      this.backPageNumber = null;
      this.page.pageNumber = 1;
      const $searchBox = $('.board_search_box');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.searchType = $searchBox.find('select[name="searchType"]').val();
      this.searchKeyword = $keyword.val();
      await this._getMyProductReviews();
      $keyword.val('');
    },

    async _getMyProductReviews() {
      const request = {
        queryString: {
          pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
          pageSize: this.page.pageSize,
          hasTotalCount: true,
          searchType: this.searchType,
          searchKeyword: this.searchKeyword,
          startYmd: '2020-01-01',
        },
      };
      const { data: myProductReviews } = await shopby.api.display.getProfileProductReviews(request);
      myProductReviews.items = myProductReviews.items.map(item => ({
        ...item,
        contentLine: item.content.includes('\n') ? 1 : 2,
      }));

      this._renderReviews(myProductReviews);
      if (this.backPageNumber) return;
      shopby.utils.pushState({
        pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
        searchKeyword: this.searchKeyword,
        searchType: this.searchType,
      });
    },

    _renderReviews(myProductReviews) {
      const { totalCount } = myProductReviews;
      this.page.render(totalCount);
      $('#productReviews').render({ myProductReviews: myProductReviews });
    },

    async _getPossibleWriteProductReviews() {
      const request = { queryString: { hasTotalCount: true } };
      const { data: reviewableProducts } = await shopby.api.display.getProfileOrderOptionsProductReviewable(request);
      this.reviewableProducts = reviewableProducts;
    },

    async _getReviewRewardNoticeText() {
      const {
        data: {
          expandedReviewConfig: { reviewRewardNoticeText },
        },
      } = await shopby.api.display.getProductReviewsConfigurations();

      this.reviewRewardNoticeText = reviewRewardNoticeText;
    },
  };

  shopby.start.initiate(shopby.my.productReviews.initiate.bind(shopby.my.productReviews));
});

/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.9
 */

$(() => {
  shopby.my.productReviews = {
    page: null,
    productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig,
    possibleProductReviewList: null,
    searchKeyword: '',
    initPageSize: 20,

    initiate() {
      this.page = new shopby.readMore(this.appendReviews.bind(this), '#btnMoreReviews');

      Promise.all([
        this._getMyProductReviews(),
        this._getPossibleWriteProductReviews(),
        this._getReviewRewardNoticeText(),
      ]).then(() => {
        this.renderInit();
        this.bindEvents();
        this.isOpenPopup();
        $('#contents').removeClass('invisible').addClass('visible');
      });
    },

    isOpenPopup() {
      const isWrite = shopby.utils.getUrlParam('write');
      if (isWrite === 'true') {
        $('#btnWriteReviewableProduct').click();
        shopby.utils.replaceState({ write: '' });
      }
    },

    renderInit() {
      $('#boardTitle').render({ productReviewConfig: this.productReviewConfig });
      $('#btnWriteReviewableProduct').render({ totalCount: this.reviewableProducts.totalCount });
      $('#btnReviewRewardNotice-wrap').render({ reviewRewardNoticeText: this.reviewRewardNoticeText });
    },

    bindEvents() {
      $('#btnWriteReviewableProduct').on('click', this.openProductReviewPopup.bind(this));
      $('.board_search_btn').on('click', this.search.bind(this)).enterKeyup('#reviewKeyword');
      $('.btn-benefit-info').on('click', () => this.toggleBenefitModal(true));
      $('.btn-modal-benefit-info').on('click', () => this.toggleBenefitModal(false));
      $('#btnReviewRewardNotice').on('click', () => this.toggleReviewRewardModal(true));
    },

    toggleBenefitModal(isVisible) {
      const $modal = $('.modal-benefit-info');
      isVisible ? $modal.addClass('on') : $modal.removeClass('on');
    },

    async appendReviews() {
      this.page.pageNumber =
        this.page.pageNumber === 2 ? this.initPageSize / 4 + this.page.pageNumber - 1 : this.page.pageNumber;
      const result = await this.fetchReviews(this.page.pageSize, this.page.pageNumber);
      const { items, totalCount } = result.data;
      if (totalCount === 0) return;

      this.page.render(totalCount);
      const compiled = Handlebars.compile($('#reviewsTemplate').html());
      const appendHtml = $(compiled({ items })).find('li');
      $('#productReviews ul').append(appendHtml);
    },

    async search() {
      this.page.pageNumber = 1;
      const $searchBox = $('.board_search');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.searchKeyword = $keyword.val();
      await this._getMyProductReviews();
      $keyword.val('');
    },

    openProductReviewPopup() {
      shopby.popup(
        'product-review',
        {
          productReviewConfig: this.productReviewConfig,
          writingReviewNoticeText: this.writingReviewNoticeText,
          accumulationRewardNoticeText: this.accumulationRewardNoticeText,
        },
        callback => {
          if (callback.state === 'ok') {
            this._getMyProductReviews();
          }
        },
      );
    },

    fetchReviews(pageSize, pageNumber = this.page.pageNumber) {
      const request = {
        queryString: {
          pageNumber,
          pageSize,
          hasTotalCount: true,
          searchKeyword: this.searchKeyword,
          searchType: 'ALL',
          startYmd: '2020-01-01',
        },
      };
      return shopby.api.display.getProfileProductReviews(request);
    },

    async _getMyProductReviews() {
      const { data: myProductReviews } = await this.fetchReviews(this.initPageSize, 1);
      myProductReviews.items = myProductReviews.items.map(item => ({
        ...item,
        contentLine: item.content.includes('\n') ? 1 : 2,
      }));
      this._renderReviews(myProductReviews);
    },

    _renderReviews(myProductReviews) {
      const { items, totalCount } = myProductReviews;
      this.page.render(totalCount);
      if (myProductReviews.totalCount < this.initPageSize) {
        $('.more_btn').hide();
      }
      $('#productReviews').render({ items });
    },

    async _getPossibleWriteProductReviews() {
      const request = { queryString: { hasTotalCount: true } };
      const { data: reviewableProducts } = await shopby.api.display.getProfileOrderOptionsProductReviewable(request);
      this.reviewableProducts = reviewableProducts;
    },

    async _getReviewRewardNoticeText() {
      const {
        data: {
          expandedReviewConfig: { reviewRewardNoticeText, writingReviewNoticeText, accumulationRewardNoticeText },
        },
      } = await shopby.api.display.getProductReviewsConfigurations();

      this.reviewRewardNoticeText = reviewRewardNoticeText;
      this.writingReviewNoticeText = writingReviewNoticeText;
      this.accumulationRewardNoticeText = accumulationRewardNoticeText;
    },
  };

  shopby.start.initiate(shopby.my.productReviews.initiate.bind(shopby.my.productReviews));
});

/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.8.24
 */

$(() => {
  shopby.my.productInquiries = {
    page: null,
    productInquiryConfig: shopby.cache.getBoardsConfig().productInquiryConfig,
    searchKeyword: '',
    initPageSize: 20,

    initiate() {
      this.page = new shopby.readMore(this.appendProductInquires.bind(this), '#btnMoreMyInquiries');
      this.renderInit();
      this._getMyProductInquiries();
      this.bindEvents();
      this.isOpenPopup();
    },

    isOpenPopup() {
      const isWrite = shopby.utils.getUrlParam('write');
      if (isWrite === 'true') {
        $('.btn_write').click();
        shopby.utils.replaceState({ write: '' });
      }
    },

    renderInit() {
      $('.page_top_area').render({ name: this.productInquiryConfig.name });
    },

    bindEvents() {
      $('.btn_write').on('click', this.openProductInquiryPopupWithRegistrationMode.bind(this));
      $('.board_search_btn').on('click', this.search.bind(this)).enterKeyup('#productInquiryKeyword');
    },

    openProductInquiryPopupWithRegistrationMode() {
      shopby.popup('product-inquiry', null, result => {
        if (result && result.state === 'ok') {
          this._getMyProductInquiries();
        }
      });
    },

    async _getMyProductInquiries() {
      const { data: myProductInquiries } = await this.fetchMyProductInquries(this.initPageSize, 1);
      this.renderInquiries(myProductInquiries);
    },

    async appendProductInquires() {
      this.page.pageNumber =
        this.page.pageNumber === 2 ? this.initPageSize / 4 + this.page.pageNumber - 1 : this.page.pageNumber;
      const { data: myProductInquiries } = await this.fetchMyProductInquries(this.page.pageSize, this.page.pageNumber);
      if (myProductInquiries.length === 0) return;

      const compiled = Handlebars.compile($('#myProductInquiriesTemplate').html());
      const appendHtml = $(compiled({ myProductInquiries: myProductInquiries.items })).find('li');
      $('#myProductInquiries').append(appendHtml);
      this.page.render(myProductInquiries.totalCount);
    },

    fetchMyProductInquries(pageSize, pageNumber = this.page.pageNumber) {
      const request = {
        queryString: {
          hasTotalCount: true,
          pageNumber,
          pageSize,
          searchKeyword: this.searchKeyword,
          searchType: 'ALL',
          startYmd: '2020-01-01',
        },
      };
      return shopby.api.display.getProfileProductInquiries(request);
    },

    renderInquiries(myProductInquiries) {
      this.page.render(myProductInquiries.totalCount);
      if (myProductInquiries.totalCount < this.initPageSize) {
        $('.more_btn').hide();
      }
      $('#myProductInquiries').render({
        myProductInquiries: myProductInquiries.items,
        pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
        pageSize: this.page.pageSize,
      });
    },

    async search() {
      this.page.pageNumber = 1;
      const $searchBox = $('.board_search');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.searchKeyword = $keyword.val();
      await this._getMyProductInquiries();
      $keyword.val('');
    },
  };

  shopby.start.initiate(shopby.my.productInquiries.initiate.bind(shopby.my.productInquiries));
});

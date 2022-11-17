$(() => {
  shopby.my.productInquiries = {
    page: shopby.pagination,
    productInquiryConfig: shopby.cache.getBoardsConfig().productInquiryConfig,
    backPageNumber: null,
    searchKeyword: '',
    searchType: '',

    initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      window.onpopstate = this.onPopState.bind(this);
      this.page = new shopby.pagination(this.onPagination.bind(this), '#myInquiryPagination', 20);
      this.renderInit();
      this._getMyProductInquiries();
      this.bindEvents();
    },

    renderInit() {
      $('#boardTitle').render({ productInquiryConfig: this.productInquiryConfig });
      $('#myLocation').render({ productInquiryConfig: this.productInquiryConfig });
    },

    bindEvents() {
      $('#btn_write').on('click', this.openProductInquiryPopupWithRegistrationMode.bind(this));
      $('.btn_board_search').on('click', this.search.bind(this)).enterKeyup('#productInquiryKeyword');
    },

    openProductInquiryPopupWithRegistrationMode() {
      shopby.popup('product-inquiry', null, result => {
        if (result && result.state === 'ok') {
          this._getMyProductInquiries();
        }
      });
    },
    async search() {
      this.backPageNumber = null;
      this.page.pageNumber = 1;
      const $searchBox = $('.board_search_box');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.searchType = $searchBox.find('select[name="searchType"]').val();
      this.searchKeyword = $keyword.val();
      await this._getMyProductInquiries();
      $keyword.val('');
    },

    async _getMyProductInquiries() {
      const request = {
        queryString: {
          hasTotalCount: true,
          pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
          pageSize: this.page.pageSize,
          searchKeyword: this.searchKeyword,
          searchType: this.searchType,
          startYmd: '2020-01-01',
        },
      };
      const { data: myProductInquiries } = await shopby.api.display.getProfileProductInquiries(request);
      this.renderProductInquiries(myProductInquiries);
      if (this.backPageNumber) return;
      shopby.utils.pushState({
        pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
        searchKeyword: this.searchKeyword,
        searchType: this.searchType,
      });
    },

    renderProductInquiries(myProductInquiries) {
      this.page.render(myProductInquiries.totalCount);
      $('#myProductInquiries').render({
        myProductInquiries: myProductInquiries.items,
        pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
        pageSize: this.page.pageSize,
      });
    },

    onPopState() {
      this.backPageNumber = shopby.utils.getUrlParam('pageNumber');
      this.searchKeyword = shopby.utils.getUrlParam('searchKeyword');
      this.searchType = shopby.utils.getUrlParam('searchType');
      this._getMyProductInquiries();
    },

    onPagination() {
      this.backPageNumber = null;
      this._getMyProductInquiries();
    },
  };

  shopby.start.initiate(shopby.my.productInquiries.initiate.bind(shopby.my.productInquiries));
});

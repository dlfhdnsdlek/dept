/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-12
 */

$(() => {
  shopby.my.inquires = {
    dateRange: null,
    page: null,
    keyword: '',
    searchType: 'ALL',
    inquiryConfig: shopby.cache.getBoardsConfig().inquiryConfig,
    inquiryList: null,

    async initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      this.page = new shopby.pagination(this.fetchInquires.bind(this), '#pagination', 20);
      this.render();
      await this.fetchInquires();
      this.bindEvents();
    },
    dataRangeCallback() {
      this.page.pageNumber = 1;
      this.fetchInquires();
    },
    async fetchInquires() {
      const { pageNumber, pageSize } = this.page;
      shopby.utils.pushState({ pageNumber });
      try {
        const queryString = {
          pageNumber,
          pageSize,
          hasTotalCount: true,
          keyword: this.keyword,
          searchType: this.searchType,
        };
        const { data } = await shopby.api.manage.getInquiries({ queryString });
        this.inquiryList = data;
        this.page.render(data.totalCount || 1);
        this.renderInquiryList();
      } catch (e) {
        console.error(e);
      }
    },
    render() {
      $('.inquiriesName').render({ name: this.inquiryConfig.name });
    },
    renderInquiryList() {
      const { pageNumber, pageSize } = this.page;
      const data = { ...this.inquiryList, pageNumber, pageSize };
      const $inquiries = $('#myInquiries');
      const compiled = Handlebars.compile($inquiries.html());
      $inquiries.next().remove();
      $inquiries.parent().append(compiled(data));
    },
    bindEvents() {
      $('.btn_board_search').on('click', this.searchKeyword.bind(this)).enterKeyup('#inquiryKeyword');
      $('#btn_write').on('click', this.openInquiryPopup.bind(this));
    },
    searchKeyword() {
      const $searchBox = $('.board_search_box');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.searchType = $searchBox.find('select[name="searchType"]').val();
      this.keyword = $keyword.val();
      this.fetchInquires();
      $keyword.val('');
    },
    openInquiryPopup() {
      shopby.popup('inquiry', { type: 'registration' }, data => {
        if (data && data.state === 'close') return;
        this.fetchInquires();
      });
    },
  };

  shopby.start.initiate(shopby.my.inquires.initiate.bind(shopby.my.inquires));
});

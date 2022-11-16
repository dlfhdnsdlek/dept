/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author hyeyeon-park
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
      this.maskingNameMap = this._maskingNameMap();
      this.page = new shopby.readMore(this.appendInquiries.bind(this), '#btnMoreMyInquiries', 20);
      this.render();
      await this.getInquiries();
      this.bindEvents();
      this.isOpenPopup();
    },

    isOpenPopup() {
      const isWrite = shopby.utils.getUrlParam('write');
      if (isWrite === 'true') {
        $('#btnWrite').click();
        shopby.utils.replaceState({ write: '' });
      }
    },

    dataRangeCallback() {
      this.page.pageNumber = 1;
      this.getInquiries();
    },

    async appendInquiries() {
      await this.fetchInquires();
      this.page.render(this.inquiryList.totalCount);

      const { pageNumber, pageSize } = this.page;
      const inquiriesData = { ...this.inquiryList, pageNumber, pageSize };
      const $inquiries = $('#myInquiries');
      const compiled = Handlebars.compile($inquiries.html());
      $inquiries.parent().append(compiled(inquiriesData));
    },

    async getInquiries() {
      await this.fetchInquires();
      this.page.render(this.inquiryList.totalCount);
      this.renderInquiryList();
    },
    _maskingNameMap() {
      const conditionMap = new Map();
      conditionMap.set('1', name => `${name}*`);
      conditionMap.set('2', name => `${name.substring(0, 1)}*`);
      conditionMap.set('3', (name, size) =>
        name
          .split('')
          .map((s, i) => (i === 0 || i === size - 1 ? s : '*'))
          .join(''),
      );
      return conditionMap;
    },
    maskingName(name) {
      const { length } = name;
      const mappingKey = length < 3 ? length : 3;
      const maskingNameMap = this.maskingNameMap.get(mappingKey.toString());
      return maskingNameMap(name, length);
    },
    async fetchInquires() {
      const { pageNumber, pageSize } = this.page;
      const queryString = {
        pageNumber,
        pageSize,
        hasTotalCount: true,
        keyword: this.keyword,
        searchType: this.searchType,
      };
      const { data } = await shopby.api.manage.getInquiries({ queryString });
      const { totalCount, items } = data;

      this.inquiryList = {
        totalCount,
        items: items
          ? items.map(item => ({
              ...item,
              issuerName: this.maskingName(item.issuerName),
            }))
          : null,
      };
    },
    render() {
      $('#inquiriesName').render({ name: this.inquiryConfig.name });
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
      $('.board_search_btn').on('click', this.searchKeyword.bind(this)).enterKeyup('#inquiryKeyword');
      $('#btnWrite').on('click', this.openInquiryPopup.bind(this));
    },
    searchKeyword() {
      this.page.pageNumber = 1;
      const $searchBox = $('.board_search');
      const $keyword = $searchBox.find('input[name=keyword]');
      this.keyword = $keyword.val();
      $('#myInquiries').next().remove();
      this.getInquiries();
      $keyword.val('');
    },
    openInquiryPopup() {
      shopby.popup('inquiry', { type: 'registration' }, data => {
        if (data && data.state === 'close') return;
        this.getInquiries();
      });
    },
  };

  shopby.start.initiate(shopby.my.inquires.initiate.bind(shopby.my.inquires));
});

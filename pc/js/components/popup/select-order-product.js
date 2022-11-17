/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.12
 */

(() => {
  class SelectOrderProduct {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#selectOrderProductPopupTemplate').html());
      this.$el = $(compiled(option));
      this.option = option;
      this.callback = callback;
      this.isFromProductViewPage = this.option.isProductViewPage;
      $parent.append(this.$el);
      if (!this.isFromProductViewPage) {
        this.dateRange = new shopby.dateRange(
          '#searchOrderProductDateRangePicker',
          this.searchOrderProduct.bind(this),
          { month: 3, label: '3개월' },
        );
      }
      this.page = new shopby.pagination(this.searchOrderProduct.bind(this), '#searchOrderProductPagination', 10, false);
      this.init();
    }

    init() {
      if (this.isFromProductViewPage) {
        this.fetchProductsWithPaging(this.otherOrderProductOptionsRequest);
        this.bindEvents();
        return;
      }
      this.initDataRange();
      this.searchOrderProduct();
      this.bindEvents();
    }

    initDataRange() {
      const $btnYear = $('button[name="datePeriodBtn"]:last');
      if ($btnYear.data('value') === 'year') {
        $btnYear.hide();
      }
      $('#searchDateRange').hide();
    }

    bindEvents() {
      this.$el
        .on('click', '#searchOrderProduct', this.searchOrderProduct.bind(this))
        .on('keyup', 'input[name="keyword"]', key => {
          if (key.code === 'Enter') {
            this.searchOrderProduct();
          }
        })
        .on('click', '.js_select_confirm', this.selectedData.bind(this));
    }

    selectedData() {
      const $selected = $('input[name="productNo[]"]:radio:checked');
      const closest = $selected.closest('tr');

      try {
        this.validation($selected);
        this.callback({
          state: 'ok',
          selectedProductNo: closest.data('productNo'),
          selectedProductOptions: {
            orderOptionNo: closest.data('orderOptionNo'),
            optionNo: closest.data('optionNo'),
            optionNameValue: closest.find('.option_name_value')[0].innerText,
            optionOrderStatus: closest.find('.order_status')[0].innerText,
          },
        });
        this.$el.remove();
      } catch (e) {
        shopby.alert(e.message);
      }
    }

    validation($selected) {
      if ($selected.length === 0) {
        throw new Error('주문상품을 선택해주세요.');
      }
    }

    searchOrderProduct() {
      const keyword = $('.ly_date_search_list input[name="keyword"]').val();
      const keywordType = $('select[name="keywordType"] option:selected').val();

      this.productName = '';
      this.orderNo = '';
      this[keywordType] = keyword;

      this.fetchProductsWithPaging(this.orderProductOptionsRequest);
    }

    async fetchProductsWithPaging(request) {
      const { data: reviewableProducts } = await shopby.api.display.getProfileOrderOptionsProductReviewable(request);
      this.render(reviewableProducts);
    }

    render(reviewableProducts) {
      const { totalCount, items } = reviewableProducts;
      if (this.isFromProductViewPage) {
        const otherOrderOptions = items.filter(item => item.orderOptionNo !== this.option.orderOptionNo);
        $('#searchResult').render({ isProductViewPage: this.isFromProductViewPage, products: otherOrderOptions });
      } else {
        $('#searchResult').render({ totalCount, products: items });
      }
      this.page.render(totalCount);
    }

    get orderProductOptionsRequest() {
      return {
        queryString: {
          pageNumber: this.page.pageNumber,
          pageSize: this.page.pageSize,
          hasTotalCount: true,
          startDate: this.dateRange.start,
          endDate: this.dateRange.end,
          productName: this.productName || '',
          orderNo: this.orderNo || '',
        },
      };
    }

    get otherOrderProductOptionsRequest() {
      return {
        queryString: {
          pageNumber: this.page.pageNumber,
          pageSize: this.page.pageSize,
          hasTotalCount: true,
          productNo: this.option.productNo,
        },
      };
    }
  }

  shopby.registerPopupConstructor('select-order-product', SelectOrderProduct);
})();

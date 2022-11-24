/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.8.20
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
          '',
          '',
          'month3',
        );
      }
      this.page = new shopby.readMore(this.appendOrderProducts.bind(this), '#btnMoreOrderProduct', 10);
      this.init();
    }

    init() {
      if (this.isFromProductViewPage) {
        this.fetchProductsWithPaging(this.otherOrderProductOptionsRequest);
        this.bindEvents();
        return;
      }
      this.bindEvents();
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

    selectedData({ currentTarget }) {
      const closest = $(currentTarget).closest('li');
      this.callback({
        state: 'ok',
        selectedProductNo: closest.data('productNo'),
        selectedProductOptions: {
          orderOptionNo: closest.data('orderOptionNo'),
          optionNo: closest.data('optionNo'),
          optionNameValue: closest.find('.option')[0].innerText,
          optionOrderStatus: closest.find('.order_status')[0].innerText,
        },
      });
      this.$el.remove();
    }

    async appendOrderProducts() {
      const { data: reviewableProducts } = await shopby.api.display.getProfileOrderOptionsProductReviewable(
        this.otherOrderProductOptionsRequest,
      );
      const { totalCount, items: products } = reviewableProducts;
      if (totalCount === 0) return;

      const compiled = Handlebars.compile($('#searchResultTemplate').html());
      const appendHtml = $(compiled({ products })).find('li');
      $('#searchResult ul').append(appendHtml);
      this.page.render(totalCount);
    }

    searchOrderProduct() {
      const keyword = $('.ly_date_search_list input[name="keyword"]').val();
      const keywordType = $('select[name="key"] option:selected').val();

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

/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author hyeyeon-park
 * @author Bomee Yoon
 * @since 2021.7.21
 */

(() => {
  class SelectProduct {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#selectProductPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);

      this.option = option;
      this.callback = callback;
      this.searchedProducts = [];
      this.page = new shopby.readMore(this.appendProducts.bind(this), '#btnMoreProduct', 20);
      this.bindEvents();
    }

    _renderSearchedProducts(products) {
      $('#searchedProducts').render({ products });
    }

    bindEvents() {
      this.$el
        .on('click', '#searchProduct', this.searchProducts.bind(this))
        .on('click', '.ly_btn_close', this.closePopup.bind(this))
        .on('click', '#selectProduct', this.selectProduct.bind(this));
    }

    get filterCondition() {
      const selectedFilterKey = $('#filterSelector option:selected').val();
      const keywords = this.$el.find('.search_text input[name="keyword"]').val().trim();
      const allowsOnlyNumber = selectedFilterKey === 'PRODUCT_NO' && isNaN(Number(keywords));

      if (allowsOnlyNumber) {
        throw new Error('숫자만 입력하세요.');
      }

      const FILTER_KEY = {
        KEYWORDS: 'filter.keywords', //todo 상품명
        PRODUCT_NO: 'filter.includeMallProductNo', //상품번호
      };

      return { [FILTER_KEY[selectedFilterKey]]: keywords };
    }

    get pageNumber() {
      return this.selectedCategoryNo === this.prevSelectedCategoryNo ? this.page.pageNumber : 1;
    }

    async searchProducts() {
      const { data } = await this.fetchProducts;
      this.searchedProducts = data.items;
      this._renderSearchedProducts(data.items);
      this.page.render(data.totalCount);
    }

    closePopup() {
      // shopby.alert('상품을 선택하세요.');
      this.$el.remove();
    }

    get fetchProducts() {
      const queryString = {
        pageNumber: this.page.pageNumber,
        pageSize: this.page.pageSize,
        ...this.filterCondition,
      };

      return shopby.api.product.getProductsSearch({ queryString });
    }

    async appendProducts() {
      const { data } = await this.fetchProducts;
      const { totalCount, items: products } = data;
      this.searchedProducts = data.items;
      if (totalCount === 0) return;

      const compiled = Handlebars.compile($('#searchedProductsTemplate').html());
      const appendHtml = $(compiled({ products })).find('li');
      $('#searchedProducts').append(appendHtml);
      this.page.render(totalCount);
    }

    selectProduct({ currentTarget }) {
      const selectedProductNo = $(currentTarget).closest('li').data('product-no');
      const selectedProduct = this.searchedProducts.find(({ productNo }) => productNo === selectedProductNo);
      this.callback({ state: 'ok', data: selectedProduct });
      this.$el.remove();
    }
  }
  shopby.registerPopupConstructor('select-product', SelectProduct);
})();

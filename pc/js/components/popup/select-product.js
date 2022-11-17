/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Bomee Yoon
 * @since 2021.7.21
 */

(() => {
  const MAX_CATEGORY_DEPTH = 5;
  const { multiLevelCategories: initCategories } = shopby.cache.getCategories();

  class SearchProduct {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#searchProductPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);

      this.option = option;
      this.callback = callback;

      this.prevSelectedCategoryNo = -1;
      this.categorySelectorData = createInitCategorySelectData();
      this.searchedProducts = [];

      this.page = new shopby.pagination(this._searchProducts.bind(this), '#searchProductPagination', 10);
      this.initiate();
    }
    initiate() {
      this.render();
      this.bindEvents();
    }
    render() {
      this._renderCategorySelector();
      this._renderSearchedProducts();
    }
    _renderCategorySelector() {
      $('#categorySelector').render(this.categorySelectorData);
    }
    _renderSearchedProducts(totalCount) {
      this.page.render(totalCount || 1);
      $('#totalCount').text(totalCount);
      $('#searchedProducts').render(this.searchedProducts);
    }
    bindEvents() {
      this.$el
        .on('change', 'select', this._onChangeSelect.bind(this))
        .on('click', 'button', this._onClickHandler.bind(this));
    }
    _onChangeSelect({ target }) {
      const data = $(target).data();
      const selectedDepth = Number(data.depth);
      const $option = $($(`#categorySelector${selectedDepth}Depth option:selected`));
      const categoryNo = Number($option.val());

      categoryNo > 0 && this._createNextDepthData(selectedDepth, categoryNo);
    }
    _onClickHandler({ target }) {
      const $target = $(target);
      const actionType = $target.data('actionType') || $target.parent().data('actionType');
      if (!actionType) return;

      switch (actionType) {
        case 'searchProduct':
          this._searchProducts();
          break;
        case 'positive':
          this._closePopupWithData();
          break;
        default:
          break;
      }
    }
    _createNextDepthData(selectedDepth, selectedCategoryNo) {
      this.categorySelectorData[selectedDepth - 1].selectedCategoryNo = selectedCategoryNo;
      createNextDepthData(initCategories, selectedDepth, 1, true, this.categorySelectorData);
      this._renderCategorySelector();
    }
    get selectedCategoryNo() {
      const categoryNo = this.categorySelectorData
        .map(({ selectedCategoryNo }) => selectedCategoryNo)
        .filter(categoryNo => categoryNo > 0)
        .pop();
      if (!categoryNo) {
        throw new Error('카테고리를 선택해주세요.');
      }
      return categoryNo;
    }
    get filterCondition() {
      const selectedFilterKey = $('#filterSelector option:selected').val();
      const keywords = this.$el.find('.ly_date_search_list input[name="keyword"]').val().trim();
      const allowsOnlyNumber = selectedFilterKey === 'PRODUCT_NO' && isNaN(Number(keywords));
      if (allowsOnlyNumber) {
        throw new Error('숫자만 입력하세요.');
      }

      const FILTER_KEY = {
        KEYWORDS: 'filter.keywords',
        PRODUCT_NO: 'filter.includeMallProductNo',
      };

      return { [FILTER_KEY[selectedFilterKey]]: keywords };
    }
    get pageNumber() {
      return this.selectedCategoryNo === this.prevSelectedCategoryNo ? this.page.pageNumber : 1;
    }
    async _searchProducts(event) {
      // @todo check api get/products/search 키워드와 상품번호는 있는데 상품명 조회항목이 없다
      event && event.preventDefault();
      try {
        const queryString = {
          categoryNos: this.selectedCategoryNo,
          pageNumber: this.pageNumber,
          pageSize: this.page.pageSize || 10,
          ...this.filterCondition,
        };

        const { data } = await shopby.api.product.getProductsSearch({ queryString });
        this.searchedProducts = data.items;
        this.prevSelectedCategoryNo = this.selectedCategoryNo;
        this._renderSearchedProducts(data.totalCount);
      } catch (error) {
        shopby.alert(error.message || error);
      }
    }
    _closePopupWithData() {
      const selectedProductNo = $('input:radio[name="productNo"]:checked').val();
      const selectedProduct = this.searchedProducts.find(({ productNo }) => productNo === Number(selectedProductNo));

      if (!selectedProduct) {
        shopby.alert('상품을 선택하세요.');
      } else {
        this.callback({ state: 'ok', data: selectedProduct });
        this.$el.remove();
      }
    }
  }
  const createNextDepthData = (data, selectedDepth, currentDepth, isSelectedPrevDepthOption, nextSelectOptions) => {
    const isLastDepth = currentDepth === MAX_CATEGORY_DEPTH;
    if (isLastDepth) return;

    const selectedCategoryNo = nextSelectOptions[currentDepth - 1].selectedCategoryNo;
    const nextDepthData = !isSelectedPrevDepthOption
      ? []
      : !data
      ? []
      : data.filter(({ categoryNo }) => categoryNo === selectedCategoryNo).flatMap(({ children }) => children);

    const isSelectedCurrentOption = isSelectedPrevDepthOption && selectedCategoryNo > 0;
    if (isSelectedCurrentOption) {
      nextSelectOptions[currentDepth].categories = nextDepthData;
    }

    if (selectedDepth < currentDepth) {
      nextSelectOptions[currentDepth - 1].selectedCategoryNo = 0;
    }

    createNextDepthData(nextDepthData, selectedDepth, currentDepth + 1, isSelectedCurrentOption, nextSelectOptions);
  };
  const createInitCategorySelectData = () => {
    const mapCategorySelectData = (_, index) => ({
      depth: index + 1,
      categories: index === 0 ? initCategories : [],
      selectedCategoryNo: 0,
    });

    return Array.from({ length: MAX_CATEGORY_DEPTH }, mapCategorySelectData);
  };
  shopby.registerPopupConstructor('select-product', SearchProduct);
})();

/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Bomee Yoon
 * @author Eunbi Kim
 * @since 2021-6-23
 */

$(() => {
  const { getUrlParam } = shopby.utils;
  const $searchBoxOrCategoryBoxArea = $('#searchBoxOrCategoryBoxArea');
  const $categorySelector = $('#categorySelector');
  const $selectedCategoryTit = $('#selectedCategoryTit');
  const sectionId = getUrlParam('sectionId');
  const keyword = getUrlParam('keyword');
  shopby.product.list = {
    async initiate() {
      await this.productList.initiate();
      if (sectionId || keyword) return;
      this.category.initiate();
    },

    getCurrentDepthCategories() {
      return this.productList.getCurrentDepthCategories.call(this.productList);
    },

    category: {
      data: {
        categories: [],
        selectedCategoryTit: '',
        selectedChildCategories: [],
      },
      initiate() {
        this.setData();
        this.render();
        this.bindEvents();
      },
      setData() {
        this.setCategoryData();
        this.setProductCount();
      },
      render() {
        const { categories, selectedCategoryTit, selectedChildCategories } = this.data;
        $categorySelector.render({ categories });
        $selectedCategoryTit.render({ selectedCategoryTit });
        $searchBoxOrCategoryBoxArea.render({ selectedChildCategories });
      },
      bindEvents() {
        $('.location_select').on('mouseenter mouseleave', this.events.toggle);
        this.events.hide.call(this);
      },

      events: {
        toggle() {
          $(this).find('.location_tit').toggleClass('active');
          $(this).find('ul').stop().slideToggle('fast');
        },
        hide() {
          !this.data.selectedChildCategories ||
            (!this.data.selectedChildCategories.length && $searchBoxOrCategoryBoxArea.hide());
        },
      },

      setCategoryData() {
        const name = 'categoryNo';
        const searchParams = new URLSearchParams(window.location.search);

        if (searchParams.has(name) && Boolean(searchParams.get(name))) {
          const { multiLevelCategories } = shopby.cache.getCategories();
          const categoryNo = Number(searchParams.get(name));
          const selectData = this._getSelectData(categoryNo, multiLevelCategories, [
            { children: multiLevelCategories },
          ]) || { category: null, parents: [] };

          const { parents, category } = selectData;
          this.data.categories = parents;
          this.data.selectedCategoryTit = category.label;
          this.data.selectedChildCategories = category.children;
        }
      },
      setProductCount() {
        const { selectedChildCategories } = this.data;
        const currentCategories = shopby.product.list.getCurrentDepthCategories();
        this.data.selectedChildCategories = selectedChildCategories.map(category => {
          const found =
            currentCategories && currentCategories.find(({ categoryNo }) => categoryNo === category.categoryNo);
          category.productCount = found ? found.count : 0;
          return category;
        });
      },

      _getSelectData(categoryNo, categoryList, parents) {
        const { length } = categoryList;
        const PARENTS_LAST_INDEX = parents.length - 1;

        for (let i = 0; i < length; i += 1) {
          const category = categoryList[i];
          const { label, categoryNo: no, children } = category;

          parents[PARENTS_LAST_INDEX].selectedLabel = label;

          if (categoryNo === no) {
            return { category, parents };
          }

          if (children && children.length > 0) {
            parents.push(category);
            const result = this._getSelectData(categoryNo, children, parents);

            if (result) {
              return result;
            }
          }

          if (i === length - 1) {
            parents.splice(PARENTS_LAST_INDEX, 1);
          }
        }
      },
    },
    productList: {
      page: shopby.pagination,
      $productList: $('#productList'),
      data: {
        productInfo: null,
        categories: shopby.cache.getCategories(),
        title: null,
        totalCount: 0,
        orderDirection: 'DESC',
        productList: [],
        sorting: {},
        searchWord: null,
        message: '진열중인 상품이 없습니다.',
        page: getUrlParam('page', 1),
        pageSize: getUrlParam('pageSize', 20),
        orderBy: getUrlParam('orderBy', 'sale_cnt'),
        brandNo: getUrlParam('brandNo'),
        keyword: getUrlParam('keyword'),
        keywordInResult: getUrlParam('keywordInResult'),
        listType: getUrlParam('type', 'gallery'),
        categoryNo: getUrlParam('categoryNo'),
      },
      async initiate() {
        this.page = new shopby.pagination(this.paginationCallback.bind(this), '#pagination', this.data.pageSize);
        await this.setData();
        this.render();
        this.bindEvents();
      },
      async setData() {
        const { keyword, keywordInResult } = this.data;
        this.data.searchWord = keywordInResult ? keywordInResult : keyword;
        !sectionId ? await this.fetchProductList() : await this.fetchMainSection();
        this.data.productList.forEach(
          product => (product.calculatedSalePrice = shopby.utils.getDisplayProductPrice(product)),
        );
        this.setSortingData();
      },
      render() {
        const { productList, searchWord, keyword, totalCount } = this.data;
        this.page.render(totalCount);
        $('#searchResult').render({ searchWord, keyword, totalCount });
        if (this.data.keyword !== '') {
          this.keywordRender();
        }
        if (sectionId) {
          this.sectionRender();
        }
        this.$productList.render({ productList, message: this.data.message });
        this.setPageSize();
      },
      bindEvents() {
        $('#productSorting').on('change', this.onChangeProductSorting.bind(this));
        this.$productList.on('click', '#wishBtn', this.onClickWishBtn.bind(this));
        $('.btn_goods_search').on('click', this.onClickKeywordInResultBtn.bind(this));
      },
      keywordRender() {
        this.data.message = '검색결과가 없습니다.';
        const searchBoxTemplate = this.getSearchBoxTemplate();
        $searchBoxOrCategoryBoxArea.html(searchBoxTemplate).attr('class', 'search_form_box');
        $categorySelector.hide();
        $selectedCategoryTit.hide();
      },
      sectionRender() {
        $selectedCategoryTit.render({ selectedCategoryTit: this.data.title });
        $categorySelector.hide();
        $searchBoxOrCategoryBoxArea.hide();
      },
      getCurrentDepthCategories() {
        const depth = Number(getUrlParam('depth')) || 1;
        const categoryNo = Number(getUrlParam('categoryNo'));
        const key = `depth${depth + 1}Categories`;
        return (
          this.data.productInfo[key] &&
          this.data.productInfo[key].filter(({ parentCategoryNo }) => parentCategoryNo === categoryNo)
        );
      },
      async fetchProductList() {
        const { direction, order } = this.mapSortingParams(this.data.orderBy);
        try {
          const queryString = {
            pageNumber: this.data.page,
            pageSize: this.data.pageSize,
            categoryNos: this.data.categoryNo,
            'order.direction': direction,
            'order.by': order,
            hasTotalCount: true,
            'filter.keywords': this.data.keyword,
            'filter.keywordInResult': this.data.keywordInResult,
            'filter.saleStatus': 'ALL_CONDITIONS',
            'filter.soldout': true,
            includeSummaryInfo: false,
          };
          const { data } = await shopby.api.product.getProductsSearch({ queryString });
          if (queryString['filter.keywords']) {
            shopby.setGlobalVariableBy('PRODUCT_SEARCH', data);
          } else {
            shopby.setGlobalVariableBy('PRODUCT_LIST', data);
          }

          this.data.totalCount = data.totalCount;
          this.data.productList = data.items;
          this.data.productInfo = data;
        } catch (e) {
          console.error(e);
        }
      },
      async fetchMainSection() {
        const orders = {
          sale_cnt: 'SALE',
          price_asc: 'LOW_PRICE',
          price_dsc: 'HIGH_PRICE',
          review: 'REVIEW',
          register: 'REGISTER',
        };

        try {
          const request = {
            pathVariable: {
              sectionsId: sectionId,
            },
            queryString: {
              pageNumber: this.data.page,
              pageSize: this.data.pageSize,
              by: orders[this.data.orderBy],
              hasTotalCount: true,
              'filter.keywords': this.data.keyword,
              'filter.keywordInResult': this.data.keywordInResult,
            },
          };
          const { data } = await shopby.api.display.getDisplaySectionsIdsSectionId({ ...request });
          shopby.setGlobalVariableBy('DISPLAY_SECTION', data);
          const { productTotalCount, products, label } = data;
          this.data.totalCount = productTotalCount;
          this.data.productList = products;
          this.data.title = label;
        } catch (e) {
          console.error(e);
        }
      },
      onChangeProductSorting({ target }) {
        const { name, value } = target;
        switch (name) {
          case 'pageSize':
            return shopby.utils.sendQueryString({ pageSize: value, page: 1 });
          case 'sort':
            return shopby.utils.sendQueryString({ orderBy: value });
          default:
            return;
        }
      },
      async onClickWishBtn(event) {
        event.preventDefault();
        const $button = $(event.currentTarget);
        const liked = $button.hasClass('on');
        const productNo = $button.closest('li').data('product-no');

        if (!shopby.logined()) {
          return shopby.confirmLogin();
        }
        try {
          const requestBody = { productNos: [productNo] };
          await shopby.api.product.postProfileLikeProducts({ requestBody });
          liked ? $button.removeClass('on') : $button.addClass('on');
        } catch (e) {
          console.error(e);
        }
      },
      onClickKeywordInResultBtn() {
        const keywordInResult = $('input[name=keywordInResult]').val();
        shopby.utils.sendQueryString({ keywordInResult });
      },
      mapSortingParams(paramKey) {
        switch (paramKey) {
          case 'sale_cnt':
            return { order: 'SALE_CNT', direction: 'DESC' };
          case 'price_asc':
            return { order: 'DISCOUNTED_PRICE', direction: 'ASC' };
          case 'price_dsc':
            return { order: 'DISCOUNTED_PRICE', direction: 'DESC' };
          case 'review':
            return { order: 'REVIEW', direction: 'DESC' };
          case 'register':
          default:
            return { order: 'RECENT_PRODUCT', direction: 'DESC' };
        }
      },
      setSortingData() {
        $(`input[value=${this.data.orderBy}]`).closest('li').find('label').addClass('on');
      },
      setPageSize() {
        $(`select[name=pageSize]`).val(this.data.pageSize).prop('selected', true);
      },
      async paginationCallback() {
        const { pageNumber } = this.page;
        this.data.page = pageNumber;
        shopby.utils.pushState({ page: pageNumber });
        await this.setData();
        this.render();
        this.bindEvents();
      },
      getSearchBoxTemplate() {
        const { keywordInResult } = this.data;
        return `
             <div class="goods_search_box">
               <div class="search_again_box">
                 <div class="keyword-div">
                  <input type="text" class="keyword_input" autocomplete="off"
                  value="${keywordInResult}" name="keywordInResult">
                 </div>
                 <button type="button" class="btn_goods_search"><em>검색</em></button>
               </div>
            </div>`;
      },
    },
  };
  shopby.start.initiate(shopby.product.list.initiate.bind(shopby.product.list));
});

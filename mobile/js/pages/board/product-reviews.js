$(() => {
  const $tabContainer = $('#p-tab');
  const $listContainer = $('#plus-review-list-container');
  const $sortSelecter = $('#p-sort-select');
  const $categorySelector = $('#p-category-select');
  const $searchTextDel = $('.c-search-text-del');
  const $searchKeyword = $('#search-keyword');
  const $searchToggleBtn = $('.magnet-btn');
  const $inputField = $('.insert-keyword');
  const $reviewPopupBtn = $('.underline-btn');
  const $searchForm = $('#search-form');

  const SELECT_BOARD_TYPE = {
    ALL: 'ALL',
    PHOTO: 'PHOTO',
    REVIEWED_PRODUCTS: 'REVIEWED_PRODUCTS',
  };
  const ALL_PHOTO_SORT_TYPE = {
    BEST_REVIEW: 'BEST_REVIEW',
    REGISTER_YMDT: 'REGISTER_YMDT',
    RATING: 'RATING',
    RECOMMEND: 'RECOMMEND',
  };
  const REVIEWED_PRODUCTS = {
    REVIEW_COUNT: 'REVIEW_COUNT',
    REGISTER_YMDT: 'REGISTER_YMDT',
    REVIEW_RATE: 'REVIEW_RATE',
  };
  const SORTING_ORDERING = {
    ASC: 'ASC',
    DESC: 'DESC',
  };

  shopby.board.productReviews = {
    productReviewConfig: {},
    logined: shopby.logined(),
    selectedBoardType: SELECT_BOARD_TYPE.ALL,
    sortingSortCriterionType: {
      allPhoto: ALL_PHOTO_SORT_TYPE.BEST_REVIEW,
      reviewedProducts: REVIEWED_PRODUCTS.REVIEW_COUNT,
    },
    sortingOrdering: SORTING_ORDERING.DESC,
    depth1DisplayCategoryNo: 0,
    searchkeyword: '',
    page: {
      pageSize: 1,
      pageNumber: 1,
      totalCount: 1,
    },
    categories: [],
    widgetList: [],
    isClickPagenation: false,
    isUseReviewRecommend: false,
    initiate() {
      this.getBoardTypeQuery();
      this.productReviewConfig = shopby.cache.getBoardsConfig().productReviewConfig;
      Promise.all([
        this.getPagenation(),
        this.getProductReviewsConfigurations(),
        this.checkCurrentTab(),
        this.getCategories(),
      ]).then(() => {
        this.renderInit();
        this.bindEvents();
        this.page.pageSize = this.widgetList.length;
      });
    },
    renderInit() {
      this.renderReviewBtn();
      this.renderTab();
      this.renderSortBtn();
      this.renderList();
      this.renderCategories();
      this.renderPagenation();
    },
    bindEvents() {
      const _this = this;
      $searchForm.submit(e => {
        _this.onClickSearch(e);
        $searchKeyword.val(_this.searchkeyword);
      });
      $searchKeyword.on('change', () => (_this.searchkeyword = $searchKeyword.val()));
      $tabContainer.on('click', 'button', this.onClickTab.bind(this));
      $sortSelecter.on('change', this.onClickSortSelect.bind(this));
      $categorySelector.on('change', this.onChangeCategory.bind(this));
      $searchTextDel.on('click', this.onClickDelSearchText.bind(this));
      $searchToggleBtn.on('click', this.onClickSearchField.bind(this));
      $reviewPopupBtn.on('click', this.onClickReviewPopup.bind(this));
    },
    async checkCurrentTab() {
      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        await this.getReviewsBoards();
      } else {
        await this.getReviewsBoardsReviewedProducts();
      }
    },
    resetCommon() {
      this.sortingSortCriterionType.allPhoto = ALL_PHOTO_SORT_TYPE.BEST_REVIEW;
      this.sortingSortCriterionType.reviewedProducts = REVIEWED_PRODUCTS.REVIEW_COUNT;
      this.renderSortBtn();
      this.page.pageNumber = 1;
    },
    resetMoveTab() {
      this.resetChangeCategory();
      this.depth1DisplayCategoryNo = 0;
      this.renderCategories();
    },
    resetChangeCategory() {
      this.resetSearch();
      this.renderPagenation();
    },
    resetSearch() {
      this.searchkeyword = '';
      $searchKeyword.val(this.searchkeyword);
    },
    renderList() {
      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        $listContainer.render({ allPhotoListItem: this.widgetList });
        $('.photo-display-popup-open').on('click', this.onClickLayerPopup.bind(this));
        return;
      }

      $listContainer.render({ reviewProductItem: this.widgetList });
      $('.photo-display-popup-open').on('click', this.onClickLayerPopup.bind(this));
    },
    renderTab() {
      const type = {
        all: SELECT_BOARD_TYPE.ALL,
        photo: SELECT_BOARD_TYPE.PHOTO,
        reviewedProducts: SELECT_BOARD_TYPE.REVIEWED_PRODUCTS,
      };
      const tabData = {
        type,
        nowType: this.selectedBoardType,
      };

      $tabContainer.render({ tabData });
    },
    renderSortBtn() {
      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        $sortSelecter.render({ sortBtnsData: this.getSortBtnAllPhotoData() });
        return;
      }

      $sortSelecter.render({ sortBtnsData: this.getSortBtnReviewedProductsData() });
    },
    renderCategories() {
      $categorySelector.render({ categories: this.categories });
    },
    renderPagenation() {
      this.page.render(this.page.totalCount);
    },
    renderReviewBtn() {
      if (this.logined) $reviewPopupBtn.css('display', 'inline-block');
    },
    async getProductReviewsConfigurations() {
      const { data } = await shopby.api.display.getProductReviewsConfigurations();
      this.isUseReviewRecommend = data.expandedReviewConfig.useReviewRecommend;
    },
    getBoardTypeQuery() {
      const boardTypeQuery = shopby.utils.getUrlParam('boardType');

      if (boardTypeQuery) this.selectedBoardType = shopby.utils.getUrlParam('boardType');
    },
    getPagenation() {
      const page = new shopby.readMore(this.onClickPagination.bind(this), '#pagination');
      this.page = page;
    },
    get reviewBoardsRequest() {
      return {
        queryString: {
          'sorting.sortCriterion': this.sortingSortCriterionType.allPhoto,
          'sorting.ordering': this.sortingOrdering,
          depth1DisplayCategoryNo: this.depth1DisplayCategoryNo,
          keyword: this.searchkeyword,
          pageNumber: this.page.pageNumber,
          boardType: this.selectedBoardType,
        },
      };
    },
    get reviewReviewedProductsRequest() {
      return {
        queryString: {
          'sorting.sortCriterion': this.sortingSortCriterionType.reviewedProducts,
          'sorting.ordering': this.sortingOrdering,
          depth1DisplayCategoryNo: this.depth1DisplayCategoryNo,
          keyword: this.searchkeyword,
          pageNumber: this.page.pageNumber,
        },
      };
    },
    getProductReviewsRequest(productNo) {
      return {
        pathVariable: { productNo },
        queryString: {
          'order.by': 'BEST_REVIEW',
          pageNumber: 1,
          //상품리뷰순 상세보기팝업을 불러올 시 pageSize필드값에 따라 리스폰되는 데이터 개수가 달라짐
          //포토후기나 전체후기는 페이지별 리스폰 데이터 개수만큼 페이지 사이즈를 조절할 수 있지만
          //상품리뷰순은 그 상품의 리뷰들을 페이지 이동없이 한번에 보여줘야 하기 때문에
          //우선은 임의로 9999를 설정해둠
          pageSize: 9999,
          hasTotalCount: true,
        },
      };
    },
    async getReviewsBoards() {
      const { data } = await shopby.api.display.getReviewBoards(this.reviewBoardsRequest);
      this.setWidgetList(data);
    },
    async getCategories() {
      const {
        data: { flatCategories },
      } = await shopby.api.display.getCategories();

      this.categories = flatCategories;
    },
    async getReviewsBoardsReviewedProducts() {
      const { data } = await shopby.api.display.getReviewBoardsReviewedProducts(this.reviewReviewedProductsRequest);

      this.setWidgetList(data);
    },
    getSortBtnAllPhotoData() {
      const type = {
        bestReview: ALL_PHOTO_SORT_TYPE.BEST_REVIEW,
        registerYMDT: ALL_PHOTO_SORT_TYPE.REGISTER_YMDT,
        rating: ALL_PHOTO_SORT_TYPE.RATING,
        recommend: ALL_PHOTO_SORT_TYPE.RECOMMEND,
      };
      const data = {
        type,
        useRecommend: this.isUseReviewRecommend,
        nowType: this.sortingSortCriterionType.allPhoto,
        currentTab: 'allPhoto',
      };

      return data;
    },
    getSortBtnReviewedProductsData() {
      const type = {
        reviewCount: REVIEWED_PRODUCTS.REVIEW_COUNT,
        registerYMDT: REVIEWED_PRODUCTS.REGISTER_YMDT,
        reviewRate: REVIEWED_PRODUCTS.REVIEW_RATE,
      };
      const data = {
        type,
        nowType: this.sortingSortCriterionType.reviewedProducts,
        currentTab: 'reviewedProducts',
      };

      return data;
    },
    setWidgetList(data) {
      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        const mappingWidgetList = data.items.map(item => ({ ...item, type: this.selectedBoardType }));

        if (this.isClickPagenation) {
          this.widgetList = this.widgetList.concat(mappingWidgetList);
          this.isClickPagenation = false;
        } else {
          this.widgetList = mappingWidgetList;
        }
      } else {
        const newWidgetList = data.items.map(item => {
          return {
            ...item,
            mainImage: item.mainImage.includes('no_img') ? '' : item.mainImage,
            salePrice: item.salePrice.toLocaleString(),
            appliedImmediateDiscountPrice: item.appliedImmediateDiscountPrice.toLocaleString(),
          };
        });

        if (this.isClickPagenation) {
          this.widgetList = this.widgetList.concat(newWidgetList);
          this.isClickPagenation = false;
        } else {
          this.widgetList = newWidgetList;
        }
      }

      this.page.totalCount = data.totalCount;
    },
    onClickSearchField() {
      $searchToggleBtn.toggleClass('on');
      $inputField.attr('hidden', !$inputField.is(':hidden'));
    },
    onClickDelSearchText() {
      this.resetSearch();
      $searchKeyword.focus();
    },
    async onClickTab(event) {
      event.preventDefault();
      $(event.target).siblings().removeClass('on');
      $(event.target).addClass('on');

      this.selectedBoardType = event.target.dataset.type;
      this.resetCommon();
      this.resetMoveTab();
      await this.checkCurrentTab();
      this.renderList();
      this.renderPagenation();
    },
    async onClickSortSelect(event) {
      event.preventDefault();
      const sortingType = event.target.value;
      const orderType = $sortSelecter.find('option:selected').data('order');
      this.sortingOrdering = orderType ? orderType : 'DESC';
      this.page.pageNumber = 1;

      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        this.sortingSortCriterionType.allPhoto = sortingType;
        await this.getReviewsBoards();
      } else {
        this.sortingSortCriterionType.reviewedProducts = sortingType;
        await this.getReviewsBoardsReviewedProducts();
      }
      this.renderList();
      this.renderPagenation();
    },
    async onClickPagination() {
      this.isClickPagenation = true;
      await this.checkCurrentTab();
      this.renderList();
      this.renderPagenation();
    },
    async onChangeCategory() {
      this.page.pageNumber = 1;
      this.depth1DisplayCategoryNo = $categorySelector.children('option:selected').val();
      await this.checkCurrentTab();
      this.resetChangeCategory();
      this.renderList();
    },
    async onClickSearch(event) {
      event.preventDefault();
      this.page.pageNumber = 1;
      await this.checkCurrentTab();
      this.renderList();
      this.renderPagenation();
    },
    onClickReviewPopup() {
      shopby.popup(
        'product-review',
        {
          productReviewConfig: this.productReviewConfig,
        },
        callback => {
          if (callback.state === 'ok') {
            this._getMyProductReviews();
          }
        },
      );
    },
    onClickLayerPopup(event) {
      event.stopPropagation();
      const reviewNo = Number(event.currentTarget.dataset.reviewNo);
      const productNo = Number(event.currentTarget.dataset.productNo);
      const { type } = event.currentTarget.dataset;
      const isReviewedProducts = type === 'REVIEWED_PRODUCTS';
      const popupType = isReviewedProducts ? 'productReviews' : 'boards';
      const configCopy = { ...this.productReviewConfig };
      configCopy.name = '포토 상세';
      const widgetOrder = this.widgetList.findIndex(widget => widget.reviewNo === reviewNo);
      const currentPageNumber = Math.floor(widgetOrder / this.page.pageSize + 1);
      let parameter = isReviewedProducts ? this.getProductReviewsRequest(productNo) : this.reviewBoardsRequest;

      if (!isReviewedProducts) {
        parameter.queryString.pageSize = this.page.pageSize;
        parameter.queryString.pageNumber = currentPageNumber;
      }

      //타입B
      shopby.popup('photo-review-detail', {
        reviewNo,
        productNo,
        hasCloseBtn: true,
        type: popupType,
        parameter,
        productReviewConfig: configCopy,
      });
    },
  };

  shopby.start.initiate(shopby.board.productReviews.initiate.bind(shopby.board.productReviews));
});

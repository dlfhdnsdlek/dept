$(() => {
  const $listContainer = $('#plus-review-list-container');
  const $tabContainer = $('#p-tab');
  const $searchBox = $('#p-search');
  const $sortBtnsContainer = $('#p-sort-btns');
  const $searchBtn = $('#p-magnet');

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
    categories: [],
    widgetList: [],
    isUseReviewRecommend: false,
    page: {},
    async initiate() {
      this.getBoardTypeQuery();
      this.page = new shopby.pagination(this.onClickPagination.bind(this), '#pagination');
      this.productReviewConfig = shopby.cache.getBoardsConfig().productReviewConfig;
      Promise.all([this.checkCurrentTab(), this.getProductReviewsConfigurations(), this.getCategories()]).then(() => {
        this.page.pageSize = this.widgetList.length;
        this.renderInit();
        this.bindEvents();
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
      $searchBtn.on('click', this.onClickSearch.bind(this));
      $tabContainer.on('click', 'button', this.onClickTab.bind(this));
      $sortBtnsContainer.on('click', 'button', this.onClickSortBtn.bind(this));
      $searchBox.on('change', 'select', this.onChangeCategory.bind(this));
      $searchBox.on('click', 'button', this.onClickSearch.bind(this));
      $('.p-write-review').on('click', this.onClickReviewPopup.bind(this));
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
      $('#search-category').val(this.searchkeyword);
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
        $sortBtnsContainer.render({ sortBtnsData: this.getSortBtnAllPhotoData() });
        return;
      }

      $sortBtnsContainer.render({ sortBtnsData: this.getSortBtnReviewedProductsData() });
    },
    renderCategories() {
      $searchBox.render({ categories: this.categories });
    },
    renderPagenation() {
      this.page.render(this.page.totalCount);
    },
    renderReviewBtn() {
      if (this.logined) $('.p-write-review').css('display', 'block');
    },
    async getProductReviewsConfigurations() {
      const { data } = await shopby.api.display.getProductReviewsConfigurations();
      this.isUseReviewRecommend = data.expandedReviewConfig.useReviewRecommend;
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
        nowType: this.sortingSortCriterionType.allPhoto,
        useRecommend: this.isUseReviewRecommend,
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
    getBoardTypeQuery() {
      this.selectedBoardType = shopby.utils.getUrlParam('boardType')
        ? shopby.utils.getUrlParam('boardType')
        : this.selectedBoardType;
    },
    setWidgetList(data) {
      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        this.widgetList = data.items.map(item => ({ ...item, type: this.selectedBoardType }));
      } else {
        this.widgetList = data.items.map(item => {
          return {
            ...item,
            mainImage: item.mainImage.includes('no_img') ? '' : item.mainImage,
            salePrice: item.salePrice.toLocaleString(),
            appliedImmediateDiscountPrice: item.appliedImmediateDiscountPrice.toLocaleString(),
          };
        });
      }
      this.page.totalCount = data.totalCount;
    },
    async onClickTab(event) {
      event.preventDefault();
      $(event.target).siblings().removeClass('on');
      $(event.target).addClass('on');
      this.selectedBoardType = event.target.dataset.type;
      this.resetCommon();
      this.resetMoveTab();
      await this.checkCurrentTab();
      this.page.pageSize = this.widgetList.length;
      this.renderList();
      this.renderPagenation();
    },
    async onClickSortBtn(event) {
      event.preventDefault();
      $(event.target).siblings().removeClass('on');
      $(event.target).addClass('on');

      const sortingType = event.target.dataset.type;
      this.sortingOrdering = event.target.dataset.order ? event.target.dataset.order : 'DESC';
      this.page.pageNumber = 1;
      this.renderPagenation();

      if (this.selectedBoardType !== SELECT_BOARD_TYPE.REVIEWED_PRODUCTS) {
        this.sortingSortCriterionType.allPhoto = sortingType;
        await this.getReviewsBoards();
      } else {
        this.sortingSortCriterionType.reviewedProducts = sortingType;
        await this.getReviewsBoardsReviewedProducts();
      }
      this.renderList();
    },
    async onClickPagination() {
      await this.checkCurrentTab();
      this.renderList();
      this.renderPagenation();
    },
    async onChangeCategory() {
      this.depth1DisplayCategoryNo = $('#p-sort-select option:selected').val();
      this.page.pageNumber = 1;
      await this.checkCurrentTab();
      this.page.pageSize = this.widgetList.length;
      this.resetChangeCategory();
      this.renderList();
    },
    async onClickSearch(event) {
      event.preventDefault();
      this.searchkeyword = $('#search-category').val();
      this.page.pageNumber = 1;
      await this.checkCurrentTab();
      this.page.pageSize = this.widgetList.length;
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
      const parameter = isReviewedProducts ? this.getProductReviewsRequest(productNo) : this.reviewBoardsRequest;

      shopby.popup('photo-review-detail', {
        reviewNo,
        productNo,
        hasCloseBtn: true,
        type: popupType,
        parameter,
        totalPage: this.page.totalPage,
      });
    },
  };

  shopby.start.initiate(shopby.board.productReviews.initiate.bind(shopby.board.productReviews));
});

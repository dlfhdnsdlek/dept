/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author JongKeun Kim
 * @since 2021.7.13
 */

$(() => {
  shopby.mileages = {
    initiate() {
      this.setDefaultState();
      this.my.initiate();
      this.search.initiate();

      window.onpopstate = this.onPopState.bind(this);
    },
    get pageNumber() {
      return shopby.utils.getUrlParam('pageNumber') || '1';
    },
    setDefaultState() {
      const pageNumberEmpty = !shopby.utils.getUrlParam('pageNumber');

      if (pageNumberEmpty) {
        shopby.utils.replaceState({
          pageNumber: 1,
        });
      }
    },
    pushState(pageNumber) {
      shopby.utils.pushState({ pageNumber });
      this.changedState();
    },
    changedState() {
      this.search.search();
    },
    onPopState() {
      this.content.renderTab();
      this.search.setCurrentPage();
      this.search.search();
    },

    /**
     * @my :  마이페이지 공통 로직
     */
    my: {
      initiate() {
        shopby.my.menu.init('#myPageLeftMenu');
        this.summary.initiate().catch(console.error);
      },

      summary: {
        async initiate() {
          const [summary, summaryAmount, likeProduct] = await this._getData();
          this.render(summary, summaryAmount, likeProduct.totalCount);
        },
        async _getData() {
          return Promise.all([
            shopby.api.member.getProfileSummary(),
            shopby.api.order.getProfileOrdersSummaryAmount({
              queryString: {
                orderStatusType: 'BUY_CONFIRM',
                startYmd: shopby.date.lastHalfYear(),
                endYmd: shopby.date.today(),
              },
            }),
            // summary 찜리스트 totalCount만 받아오기 위해 추가
            // 전체 카운트만 받아오는 것으로 pageNumber, pageSize는 추가하지 않음
            shopby.api.product.getProfileLikeProducts({
              queryString: {
                hasTotalCount: true,
              },
            }),
          ]).then(res => res.map(({ data }) => data));
        },
        render(summary, summaryAmount, totalCount) {
          shopby.my.summary.init('#myPageSummary', summary, summaryAmount, totalCount);
        },
      },
    },

    search: {
      dateRange: null,
      pagination: null,
      initiate() {
        this.renderComponents();
        this.setCurrentPage();
        this.search();
      },
      renderComponents() {
        this.renderSearchForm();
        this.renderPagination();
      },
      renderSearchForm() {
        this.dateRange = new shopby.dateRange('#searchDateRange', this.search.bind(this));
      },
      renderPagination() {
        this.pagination = new shopby.pagination(this.changePagination.bind(this), '#pagination', 10);
      },
      changePagination() {
        const { pageNumber } = this.pagination;
        shopby.mileages.pushState(pageNumber);
      },
      search() {
        this.fetchMileages().then(data => {
          const { totalCount } = data;
          shopby.mileages.content.render(data);
          this.pagination.render(totalCount);
        });
      },
      async fetchMileages() {
        const { pageSize } = this.pagination;
        const { start, end } = this.dateRange;
        const pageNumber = shopby.mileages.pageNumber;

        const request = {
          queryString: {
            pageNumber,
            pageSize,
            orderStatusType: 'BUY_CONFIRM',
            startYmd: start,
            endYmd: end,
          },
        };

        return shopby.api.manage.getProfileAccumulations(request).then(({ data }) => data);
      },
      setCurrentPage() {
        this.pagination.pageNumber = shopby.mileages.pageNumber;
      },
    },

    content: {
      render(data) {
        const { items } = data;
        const title = shopby.cache.getMall().accumulationConfig.accumulationName;
        const res = this.getMileages(items);
        const mileages = res.map(mileage => ({
          ...mileage,
          isNoExpirationDate: this.isNoExpirationDate(mileage.expireYmdt),
        }));
        this.renderMileages(mileages);
        this.renderTitle(title);
      },
      get operatorEnum() {
        return {
          GIVE_AVAILABLE: '+',
          GIVE_CANCELED: '-',
          SUBTRACTION_USED: '-',
          SUBTRACTION_CANCELED: '+',
        };
      },
      getMileages(items) {
        const {
          accumulationConfig: { accumulationUnit },
        } = shopby.cache.getMall();

        return items.map(items => ({
          ...items,
          accumulationUnit, // admin config unit : string
          operator: this.operatorEnum[items.accumulationStatus], // '+'|'-'
        }));
      },
      renderMileages(data) {
        const $mileages = $('#mileages');
        const compiled = Handlebars.compile($mileages.html());
        $mileages.next().remove();
        $mileages.parent().append(compiled(data));
      },
      renderTitle(data) {
        $('[data-attach="title"]').text(data);
      },
      isNoExpirationDate(expireYmdt) {
        return expireYmdt && expireYmdt.split('-')[0] === '9999';
      },
    },
  };

  shopby.start.initiate(shopby.mileages.initiate.bind(shopby.mileages));
});

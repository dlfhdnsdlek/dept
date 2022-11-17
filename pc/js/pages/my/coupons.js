/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author JongKeun Kim
 * @since 2021.7.8
 */

$(() => {
  shopby.coupons = {
    coupons: null,
    initiate() {
      this.setDefaultState();
      this.my.initiate();
      this.add.initiate();
      this.search.initiate();
      this.content.initiate();

      window.onpopstate = this.onPopState.bind(this);
    },
    get usable() {
      return shopby.utils.getUrlParam('usable') || 'true';
    },
    get pageNumber() {
      return shopby.utils.getUrlParam('pageNumber') || '1';
    },
    setDefaultState() {
      const usableEmpty = !shopby.utils.getUrlParam('usable');
      const pageNumberEmpty = !shopby.utils.getUrlParam('pageNumber');

      if (usableEmpty && pageNumberEmpty) {
        shopby.utils.replaceState({
          usable: true,
          pageNumber: 1,
        });
      }
    },
    pushState(usable, pageNumber) {
      shopby.utils.pushState({ usable, pageNumber });
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
        render(summary, summaryAmount, likeTotalCount) {
          shopby.my.summary.init('#myPageSummary', summary, summaryAmount, likeTotalCount);
        },
      },
    },

    add: {
      initiate() {
        this._bindEvents();
      },
      _bindEvents() {
        $('#addCoupon').on('click', this.openAddCouponPopup);
      },
      openAddCouponPopup(event) {
        event.preventDefault();
        shopby.popup('add-coupon', null, ({ state }) => {
          if (state !== 'ok') return;
          shopby.alert('쿠폰이 발급되었습니다.');
          // if shopby.coupons.usable : 사용가능 쿠폰 탭이 아니라면 데이터 갱신 불필요.
          if (shopby.coupons.usable === 'true') shopby.coupons.search.search.call(shopby.coupons.search);
        });
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
        const usable = shopby.coupons.usable;
        const { pageNumber } = this.pagination;
        shopby.coupons.pushState(usable, pageNumber);
      },
      search() {
        this.fetchCoupons().then(({ items, totalCount }) => {
          shopby.coupons.content.render(items);
          this.pagination.render(totalCount);
        });
      },
      async fetchCoupons() {
        const { pageSize } = this.pagination;
        const { start, end } = this.dateRange;
        const usable = shopby.coupons.usable;
        const pageNumber = shopby.coupons.pageNumber;

        const request = {
          queryString: {
            pageNumber,
            pageSize,
            startYmd: start,
            endYmd: end,
            usable,
          },
        };
        return await shopby.api.promotion.getCoupons(request).then(({ data }) => data);
      },
      setCurrentPage() {
        this.pagination.pageNumber = shopby.coupons.pageNumber;
      },
    },

    content: {
      initiate() {
        this.renderTab();
        this._bindEvents();
      },
      _bindEvents() {
        $('#couponTabMenu').on('click', 'a', this.onClickTab.bind(this));
        $('#contents')
          .on('click', '[data-id="couponDetailToggle"]', this.couponDetailToggle)
          .on('click', '[data-id="couponDetailHide"]', this.couponDetailHide);
      },
      getTabClassName(usable) {
        const defaultClassName = 'router-link-active';
        const activeClassName = 'router-link-active router-link-exact-active on';

        const active = usable.toString() === (shopby.coupons.usable || 'true');
        return active ? activeClassName : defaultClassName;
      },
      renderTab() {
        const template = `
          <li class="${this.getTabClassName(true)}">
            <a href="/pages/my/coupons.html?usable=true">사용가능</a>
          </li>
          <li class="${this.getTabClassName(false)}">
            <a href="/pages/my/coupons.html?usable=false">사용완료/사용불가</a>
          </li>
        `;
        document.getElementById('couponTabMenu').innerHTML = template;
      },
      onClickTab(event) {
        event.preventDefault();

        // silent route change
        const queryString = event.currentTarget.getAttribute('href').split('?')[1];
        this.changeLocationSearch(queryString);

        this.renderTab();
      },
      getFormattedProducts(couponTargets, totalCount) {
        const overMaxCount = couponTargets.length < totalCount;
        const overMaxCountLabel = overMaxCount ? ' 외 다수' : '';

        return `${couponTargets.join('/')}${overMaxCountLabel}`;
      },
      async couponDetailToggle(event) {
        event.preventDefault();

        const { couponNo, couponTargetType, couponIssueNo } = event.currentTarget.dataset;
        const $detail = $(`#detail${couponNo}`);
        if ($detail.has(`#detail${couponIssueNo}`).length > 0) {
          $(`#detail${couponNo} *`).remove();
          return;
        }
        const request = {
          pathVariable: { couponNo },
          queryString: { pageNumber: 1, pageSize: 50 },
        };

        const { data } = await shopby.api.promotion.getCouponNoTargets(request);
        const { data: excludeTargets } = await shopby.api.promotion.getCouponNoExcludeTargets(request);

        const couponTargets = data.items.map(({ targetName }) => targetName);
        const couponExcludeTargets = excludeTargets.items.map(({ targetName }) => targetName);
        const availableProducts =
          couponTargetType === 'PRODUCT'
            ? shopby.coupons.content.getFormattedProducts(couponTargets, data.totalCount)
            : null;
        const availableCategories = couponTargetType === 'CATEGORY' ? couponTargets : null;
        const unusableProduct =
          couponExcludeTargets.length > 0
            ? shopby.coupons.content.getFormattedProducts(couponExcludeTargets, excludeTargets.totalCount)
            : null;

        const handlebarTemplate = $(`#coupon-detail`).html();
        const template = Handlebars.compile(handlebarTemplate);
        const html = template({
          ...shopby.coupons.coupons.find(coupon => coupon.couponNo === Number(couponNo)),
          availableProducts,
          availableCategories,
          unusableProduct,
        });
        $detail.append(html);
      },
      couponDetailHide(event) {
        event.preventDefault();

        $(event.currentTarget).parents('[data-id="couponDetailContent"]').remove();
      },
      changeLocationSearch(queryString) {
        const searchParams = new URLSearchParams(queryString);
        const usable = searchParams.get('usable');
        const pageNumber = shopby.coupons.pageNumber;

        shopby.coupons.pushState(usable, pageNumber);
      },
      getPlatform(platforms) {
        const nameMap = {
          PC: 'PC웹',
          MOBILE_WEB: '모바일웹',
          MOBILE_APP: '어플리케이션',
        };

        return platforms.map(platform => nameMap[platform]).join(' / ');
      },
      getRenderData(data) {
        return data.map(coupon => {
          const {
            issueYmdt,
            useEndYmdt,
            usablePlatforms,
            couponType,
            skipsAccumulation,
            cartCouponUsable,
            productCouponUsable,
          } = coupon;
          // coupon date
          const usedYmd = dayjs(issueYmdt).format('YYYY-MM-DD');
          const endUnixTime = dayjs(useEndYmdt).valueOf();
          const nowUnixTime = Date.now();
          const expiration = endUnixTime >= nowUnixTime;

          // coupon platform
          const platform = this.getPlatform(usablePlatforms);

          const limitCouponTypeLabel = couponType === 'PRODUCT' ? '주문' : '상품';
          const isLimit = skipsAccumulation || !cartCouponUsable || !productCouponUsable;
          return {
            ...coupon,
            limitCouponTypeLabel,
            usedYmd,
            expiration,
            platform,
            isLimit,
          };
        });
      },
      render(data) {
        shopby.coupons.coupons = this.getRenderData(data);
        const response = {
          coupons: shopby.coupons.coupons,
          isUseAble: shopby.coupons.usable === 'true' ? true : false,
        };

        const $coupons = $('#coupons');
        const compiled = Handlebars.compile($coupons.html());

        $coupons.next().remove();
        $coupons.parent().append(compiled(response));
      },
    },
  };

  shopby.start.initiate(shopby.coupons.initiate.bind(shopby.coupons));
});

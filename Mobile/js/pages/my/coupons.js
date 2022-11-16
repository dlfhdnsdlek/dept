/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author hyeyeon-park
 * @author JongKeun Kim
 * @since 2021.7.8
 */

$(() => {
  shopby.coupons = {
    coupons: null,
    initiate() {
      this.setDefaultState();
      this.add.initiate();
      this.search.initiate();
      this.content.initiate();

      window.onpopstate = this.onPopState.bind(this);
    },
    get usable() {
      const _usable = shopby.utils.getUrlParam('usable');
      return _usable ? _usable : 'true';
    },
    setDefaultState() {
      const usableEmpty = !shopby.utils.getUrlParam('usable');

      if (usableEmpty) {
        shopby.utils.replaceState({
          usable: true,
        });
      }
    },
    pushState(usable) {
      shopby.utils.pushState({ usable });
      this.changedState();
    },
    changedState() {
      this.search.search();
    },
    onPopState() {
      this.content.renderTab();
      this.search.search();
    },

    add: {
      initiate() {
        this._bindEvents();
      },
      _bindEvents() {
        $('#addCoupon').on('click', this.openAddCouponPopup.bind(this));
      },
      async openAddCouponPopup(event) {
        event.preventDefault();
        const $couponNumber = $('#couponNumber');
        const value = $('#couponNumber').val();
        const validate = () => {
          if (!value) {
            shopby.alert('쿠폰 번호를 입력해주세요.', () => {
              $couponNumber.focus();
            });
          }
          return !!value;
        };
        const isValid = validate();
        if (isValid) {
          await this.addCouponCode(value);
          shopby.alert('쿠폰이 발급되었습니다.', () => {
            if (shopby.coupons.usable === 'true') shopby.coupons.search.search.call(shopby.coupons.search);
          });
        }
      },
      async addCouponCode(promotionCode) {
        const request = {
          pathVariable: {
            promotionCode,
          },
        };

        const { status } = await shopby.api.promotion.postCouponsRegisterCodePromotionCode(request);
        if (status !== 204) return;
      },
    },

    search: {
      dateRange: null,
      pagination: null,
      initiate() {
        this.renderPagination();
        this.search();
      },
      renderPagination() {
        this.pagination = new shopby.readMore(this.appendCoupons.bind(this), '#btnMoreCoupons', 5);
      },
      search() {
        this.pagination.pageNumber = 1;
        this.fetchCoupons().then(({ items, totalCount }) => {
          shopby.coupons.content.render(items);
          this.pagination.render(totalCount);
        });
      },
      appendCoupons() {
        this.fetchCoupons().then(({ items, totalCount }) => {
          shopby.coupons.content.appendCoupons(items);
          this.pagination.render(totalCount);
        });
      },
      async fetchCoupons() {
        const { pageSize } = this.pagination;
        const usable = shopby.coupons.usable;
        const pageNumber = this.pagination.pageNumber;

        const request = {
          queryString: {
            pageNumber,
            pageSize,
            usable,
          },
        };
        return await shopby.api.promotion.getCoupons(request).then(({ data }) => data);
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
        const defaultClassName = 'tab_btn';
        const activeClassName = 'tab_btn active';

        const active = usable.toString() === (shopby.coupons.usable ? shopby.coupons.usable : 'true');
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
      async couponDetailToggle(event) {
        event.preventDefault();

        const { couponNo, couponTargetType, couponIssueNo } = event.currentTarget.dataset;
        const $detail = $(`#detail${couponNo}`);
        if ($detail.has(`#detail${couponIssueNo}`).length > 0) {
          $detail.toggle();
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

        $(event.currentTarget).parents('[data-id="couponDetailContent"]').hide();
      },
      changeLocationSearch(queryString) {
        const searchParams = new URLSearchParams(queryString);
        const usable = searchParams.get('usable');

        shopby.coupons.pushState(usable);
      },
      getPlatform(platforms) {
        const nameMap = {
          PC: 'PC웹',
          MOBILE_WEB: '모바일웹',
          MOBILE_APP: '어플리케이션',
        };

        return platforms.map(platform => nameMap[platform]).join(' / ');
      },
      getFormattedProducts(couponTargets, totalCount) {
        const overMaxCount = couponTargets.length < totalCount;
        const overMaxCountLabel = overMaxCount ? ' 외 다수' : '';

        return `${couponTargets.join('/')}${overMaxCountLabel}`;
      },
      getRenderData(data) {
        return data.map(coupon => {
          const {
            issueYmdt,
            useEndYmdt,
            usablePlatforms,
            couponType,
            used,
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
          const unusableReason = used ? '사용완료' : !used && !expiration ? '기간만료' : null;
          return {
            ...coupon,
            limitCouponTypeLabel,
            usedYmd,
            expiration,
            platform,
            unusableReason,
            isLimit,
          };
        });
      },
      render(data) {
        shopby.coupons.coupons = this.getRenderData(data);

        const $coupons = $('#coupons');
        const compiled = Handlebars.compile($coupons.html());
        $coupons.find('li').remove();
        $coupons.next().remove();
        $coupons.parent().append(compiled(shopby.coupons.coupons));
      },

      appendCoupons(data) {
        shopby.coupons.coupons = this.getRenderData(data);
        const $coupons = $('#coupons');
        const compiled = Handlebars.compile($coupons.html());
        $coupons
          .parent()
          .find('ul.coupon_bx')
          .append($(compiled(shopby.coupons.coupons)).find('li'));
      },
    },
  };

  shopby.start.initiate(shopby.coupons.initiate.bind(shopby.coupons));
});

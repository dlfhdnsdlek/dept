/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author JongKeun Kim
 * @since 2021.7.14
 */

/**
 * @LogicGuide
 *
 * 쿠폰은 두가지 종류가 있다.
 * [기획 용어] : [API 프로퍼티 키네임]
 * 상품 쿠폰 : productCoupon
 * 주문 쿠폰 : cartCoupon
 *
 * # 상품 쿠폰
 * - 상품 쿠폰은 한 상품에 하나의 상품 쿠폰을 지닐 수 있다.
 * - 다만 복수 상품 구매할 시 동일한 상품 쿠폰을 사용할 수 없다.
 * - 때문에 클라이언트단에서 동일한 상품 쿠폰을 유저가 선택할 수 없도록 제어한다.
 * - 주문 쿠폰과 교차 선택 불가능한 상품 쿠폰이 존재한다.
 *
 * # 주문 쿠폰
 * - 주문 쿠폰은 주문 당 단 한개 지닐 수 있다.
 * - 상품 쿠폰과 교차 선택 불가능한 주문 쿠폰이 존재한다.
 *
 * @ClassMemberGuide
 *
 * @ApplyCoupon : 코어 로직.
 * @UsableProductCouponGuideHandler : 복수 상품 구매할 시 동일한 상품 쿠폰을 사용할 수 없다. 이를 DOM 을
 *   제어하여 사용 불가 쿠폰을 disabled 처리하여 가이드함.
 * @RadioElementReadOnlyHandler : RadioElementReadOnlyHandler 의 부모. radio input
 *   의 disabled 처리
 *
 *
 * @OtherInformation
 *
 * - orderSheetNo 는 주문서의 unique id 이다. 바닥 페이지와 쿼리스트링을 통해 공유한다.
 * - orderSheetNo 를 통해 상품 쿠폰/주문 쿠폰 데이터를 받아온다.
 * - 바닥 페이지와 ApplyCoupon 은 상품 쿠폰 번호, 주문 쿠폰 번호를 서로 공유한다.
 * - 선택된 쿠폰에 대한 할인 금액 계산은 클라이언트롤이 아니다. API 를 통해 계산한다.
 * - 금액 계산을 할때마다 콘텐츠를 contentUpdate 를 통해 리렌더링 한다. 총 할인 금액 뿐 아니라 쿠폰 별 재 계산된
 *   할인금액을 렌더해야 하기때문
 */

(() => {
  // 팝업 외부에서 state 에 접근 불허. state 는 private 클래스 맴버 변수
  const state = Symbol('private');

  class ApplyCoupon {
    /**
     * @param couponState: {
        choiceCoupon: {
          productCoupons: { productNo: number , couponIssueNo: number }[]
          cartCouponIssueNo: null|number
        },
        productCouponOnly: boolean
        cartCouponOnly: boolean
        canUsedAccumulation: boolean
      },
     */
    constructor($popupsArea, couponState, callback) {
      this.$popupsArea = $popupsArea; // 리렌더시 ApplyCoupon 에서 사용
      this.$el = $popupsArea; // public. registerPopupConstructor 에서 사용
      this.callback = callback;
      this.compiledTemplate = Handlebars.compile($('#applyCouponTemplate').html());

      this[state] = couponState;

      this.skipsAccumulationCouponIssueNos = [];
      this.productCount = 0;

      this.handler = {
        usableCouponGuide: null,
      };

      this.initiate();
    }

    get orderSheetNo() {
      return shopby.utils.getUrlParam('ordersheetno');
    }

    get choicedProductCouponIssueNos() {
      return this[state].choiceCoupon.productCoupons.flatMap(({ couponIssueNo }) => couponIssueNo);
    }

    get canUsedAccumulation() {
      return !this.choicedProductCouponIssueNos
        .concat([this[state].choiceCoupon.cartCouponIssueNo])
        .filter(Boolean)
        .some(couponIssueNo => this.skipsAccumulationCouponIssueNos.includes(couponIssueNo));
    }

    async initiate() {
      await this.setDefaultChoiceCoupon();
      await this.contentUpdate();
      this.couponContentScroll();
    }

    async setDefaultChoiceCoupon() {
      await this.setDefaultChoiceProductCoupon();
      // 주문 쿠폰은 디폴트가 쿠폰 미사용
    }

    async contentUpdate() {
      const fetchedData = await this.fetchCalculatedCouponAmount();
      const data = this.getRenderData(fetchedData);
      this.productCount = data.products.length;
      this.renderTemplate(data);
      this._bindEvents();
      this.selectChoicedCoupon();
    }

    async setDefaultChoiceProductCoupon() {
      const useDiscountOptimization = !this[state].choiceCoupon.productCoupons.length && !this[state].cartCouponOnly;

      this[state].choiceCoupon.productCoupons = useDiscountOptimization
        ? await this.getOptimizedChoiceCoupon()
        : this[state].choiceCoupon.productCoupons;
    }

    async getOptimizedChoiceCoupon() {
      const data = await this.fetchCoupons();
      return data.products.reduce((optimizedChoiceProductCoupon, { productNo, productCoupons }) => {
        //상품쿠폰이 없는 경우 빈배열 : 쿠폰미적용
        if (productCoupons && productCoupons.length <= 0) return optimizedChoiceProductCoupon;

        let couponIssueNo = null;

        //첫상품에는 첫번째 쿠폰
        if (optimizedChoiceProductCoupon.length === 0) {
          couponIssueNo = productCoupons[0].couponIssueNo;
        }

        //각 상품마다 할인가 높은 상품쿠폰 고르기(할인가 높은 순으로 정렬되어 있는 상태)
        for (const productCoupon of productCoupons) {
          const isBeforeSelectedProductCoupon = optimizedChoiceProductCoupon.find(
            coupon => coupon.couponIssueNo === productCoupon.couponIssueNo,
          );

          //이전 상품에 선택된 쿠폰이 아닌 경우
          if (!isBeforeSelectedProductCoupon) {
            couponIssueNo = productCoupon.couponIssueNo;
            break;
          }
        }

        //각 상품에 적용된 할인가 높은 쿠폰 리스트
        if (couponIssueNo) {
          optimizedChoiceProductCoupon.push({
            productNo,
            couponIssueNo,
          });
        }
        return optimizedChoiceProductCoupon;
      }, []);
    }

    selectChoicedCoupon() {
      this.selectChoicedProductCoupon();
      this.selectChoicedCartCoupon();
    }

    selectChoicedProductCoupon() {
      const { choiceCoupon } = this[state];
      const choicedProductCoupons = choiceCoupon.productCoupons
        .map(({ productNo, couponIssueNo }) => ({
          $els: this.$el.find(`input[type="radio"][data-product-no="${productNo}"]`),
          couponIssueNo,
        }))
        .flatMap(({ $els, couponIssueNo }) => $els.filter((_, $el) => Number($el.value) === couponIssueNo))
        .map($el => {
          $el.attr('checked', '');
          return $el;
        });

      if (choicedProductCoupons.some($el => $el.data('cartCouponUsable') === false)) {
        this[state].productCouponOnly = true;
      } else {
        this[state].productCouponOnly = false;
      }

      this.sameProductCouponReadonlyAttach();
      this.totalCouponAmtHidden();
      this.couponContentScroll();
    }

    selectChoicedCartCoupon() {
      const couponIssueNo = this[state].choiceCoupon.cartCouponIssueNo;
      const choicedCartCoupon = this.$el
        .find('input[type="radio"][name="cartCoupon"]')
        .filter((_, $el) => Number($el.value) === couponIssueNo)
        .attr('checked', '');

      if (choicedCartCoupon.data('productCouponUsable') === false) {
        this[state].cartCouponOnly = true;
      } else {
        this[state].cartCouponOnly = false;
      }
    }

    fetchCoupons() {
      const request = {
        pathVariable: {
          orderSheetNo: this.orderSheetNo,
        },
      };
      return shopby.api.order.getOrderSheetsOrderSheetNoCoupons(request).then(({ data }) => data);
    }

    getRenderData({ products, cartCoupons, productCouponDiscountAmt, cartCouponDiscountAmt, cartAmt }) {
      return {
        products: products.map(product => ({
          ...product,
          productCoupons: this.getMappingCoupons(product.productCoupons),
        })),
        cartCoupons: this.getMappingCoupons(cartCoupons),
        productCouponDiscountAmt,
        cartCouponDiscountAmt,
        totalDiscountAmt: productCouponDiscountAmt + cartCouponDiscountAmt,
        productCouponDiscountedBuyAmt: cartAmt - productCouponDiscountAmt,
      };
    }

    getMappingCoupons(coupons) {
      const {
        accumulationConfig: { excludingReservePayCoupon },
      } = shopby.cache.getMall();

      return coupons
        .map(coupon => {
          const {
            couponIssueNo,
            couponName,
            discountRate,
            couponDiscountAmt,
            minSalePrice,
            skipsAccumulation,
            cartCouponUsable,
            productCouponUsable,
          } = coupon;
          const hasLimit =
            !cartCouponUsable || !productCouponUsable || (skipsAccumulation && !excludingReservePayCoupon);
          return {
            ...coupon,
            couponIssueNo,
            couponName,
            discountRate,
            couponDiscountAmt,
            minSalePrice,
            skipsAccumulation,
            excludingReservePayCoupon,
            hasLimit,
            cartCouponUsable,
            productCouponUsable,
          };
        })
        .sort((prev, next) => {
          // 등록 순 (2nd order)
          const x = prev.couponIssueNo;
          const y = next.couponIssueNo;
          return x > y ? 1 : x < y ? -1 : 0;
        })
        .sort((prev, next) => {
          // 높은 할인가 순 (1nd order)
          const x = prev.couponDiscountAmt;
          const y = next.couponDiscountAmt;
          return x < y ? 1 : x > y ? -1 : 0;
        });
    }

    renderTemplate(data) {
      const innerScrollBox = document.getElementById('innerScrollBox');
      const prevInnerScrollYPosition = innerScrollBox ? innerScrollBox.scrollTop : undefined;
      const isRerender = prevInnerScrollYPosition !== undefined;

      this.$el = $(this.compiledTemplate(data));

      if (isRerender) {
        this.$popupsArea.find('#applyCoupon').replaceWith(this.$el);
        $('#innerScrollBox').scrollTop(prevInnerScrollYPosition);
      } else {
        this.$popupsArea.append(this.$el);
      }

      this.initHandler();
      this.totalCouponAmtHidden();
    }

    initHandler() {
      const el = document.getElementById('applyCoupon');
      this.handler.usableCouponGuide = new UsableProductCouponGuideHandler(el);
    }

    _bindEvents() {
      this.$el
        // ui event
        .on('click', '[data-action="toggleOnClass"]', this.toggleContent.bind(this))
        .on('click', '[data-action="closeTooltip"]', this.closeTooltip.bind(this))

        // form event
        .on('click', 'input[type=radio][data-type="product"]', this.tryChoiceProductCoupon.bind(this))
        .on('click', 'input[type=radio][data-type="cart"]', this.tryChoiceCartCoupon.bind(this))
        .on('click', 'button[data-action="submit"]', this.onSubmit.bind(this))
        .on('click', 'button[data-action="cancel"]', this.onCancel.bind(this));
    }

    totalCouponAmtHidden() {
      const scrollBox = document.querySelector('.scroll_box');
      const scrollBoxStyle = window.getComputedStyle(scrollBox);
      const maxHeightValue = scrollBoxStyle.getPropertyValue('max-height');
      const maxHeightNum = Number(maxHeightValue.slice(0, maxHeightValue.length - 2));

      if ($('.scroll_box').innerHeight() < maxHeightNum) {
        $('.total_coupon_amount').hide();
      }
    }

    couponContentScroll() {
      $('.scroll_box').on('scroll', function () {
        const $totalCouponAmount = $('.total_coupon_amount');
        const $scrollTop = $('.scroll_box').scrollTop();
        const $innderHeight = $('.scroll_box').innerHeight();
        const $scrollHeight = $('.scroll_box')[0].scrollHeight;

        if ($scrollTop + $innderHeight >= $scrollHeight) {
          $totalCouponAmount.hide();
        } else {
          $totalCouponAmount.show();
        }
      });
    }

    toggleContent(event) {
      event.currentTarget.classList.toggle('on');
      this.totalCouponAmtHidden();
    }

    closeTooltip(event) {
      event.preventDefault();

      const closeTarget = $(event.currentTarget).parent().parent().prev();
      closeTarget.removeClass('on');
    }

    tryChoiceProductCoupon(event) {
      event.preventDefault();

      const couponIssueNo =
        event.currentTarget.value === 'default' ? event.currentTarget.value : Number(event.currentTarget.value);
      if (this.choicedProductCouponIssueNos.includes(couponIssueNo)) return;

      const { skipsAccumulation, productNo, cartCouponUsable } = event.currentTarget.dataset;
      const coupon = { productNo, couponIssueNo };

      const checkUsableCartCoupon = () => {
        if (this[state].cartCouponOnly || cartCouponUsable === 'false') {
          this.productCouponUsageRestrictionHandler(coupon, true);
        } else {
          this[state].productCouponOnly = false;
          this.setChoiceProductCoupon(coupon);
        }
      };

      if (skipsAccumulation === 'true') {
        const confirmCallback = ({ state }) => {
          if (state !== 'ok') return;
          checkUsableCartCoupon();
        };
        this.couponCanUsedAccumulationHandler(couponIssueNo, confirmCallback);
      } else {
        checkUsableCartCoupon();
      }
    }

    tryChoiceCartCoupon(event) {
      event.preventDefault();

      if (event.currentTarget.value === 'default') {
        this.resetCartCoupon(true);
        return;
      }

      const couponIssueNo = Number(event.currentTarget.value);
      if (this[state].choiceCoupon.cartCouponIssueNo === couponIssueNo) return;

      const { skipsAccumulation, productCouponUsable } = event.currentTarget.dataset;

      const checkUsableProductCoupon = () => {
        if (this[state].productCouponOnly || productCouponUsable === 'false') {
          this.cartCouponUsageRestrictionHandler(couponIssueNo, true);
        } else {
          this[state].cartCouponOnly = false;
          this.setChoiceCartCoupon(couponIssueNo);
        }
      };

      if (skipsAccumulation === 'true') {
        const confirmCallback = ({ state }) => {
          if (state !== 'ok') return;
          checkUsableProductCoupon();
        };
        this.couponCanUsedAccumulationHandler(couponIssueNo, confirmCallback);
      } else {
        checkUsableProductCoupon();
      }
    }

    couponCanUsedAccumulationHandler(couponIssueNo, confirmCallback) {
      const next = result => {
        confirmCallback(result);
        if (result.state === 'ok') this.skipsAccumulationCouponIssueNos.push(couponIssueNo);
      };

      shopby.confirm(
        { message: '해당 쿠폰을 사용할 경우, 적립금 적립이 불가합니다.</br>쿠폰을 적용하시겠습니까?' },
        next,
      );
    }

    productCouponUsageRestrictionHandler(coupon, onlyUse = false) {
      shopby.confirm(
        {
          message:
            '해당 쿠폰을 사용할 경우, 현재 선택되어 있는 주문 쿠폰 중 일부 또는 전체 쿠폰 사용이 불가할 수 있습니다. 쿠폰을 적용하시겠습니까?',
        },
        result => {
          if (result.state === 'ok') {
            this.resetCartCoupon();
            this.setChoiceProductCoupon(coupon);

            if (onlyUse) {
              this[state].prductCouponOnly = true;
              this[state].cartCouponOnly = false;
            }
          } else {
            this.resetProductCoupon();
          }
        },
      );
    }

    cartCouponUsageRestrictionHandler(couponIssueNo, onlyUse = false) {
      shopby.confirm(
        {
          message:
            '해당 쿠폰을 사용할 경우, 현재 선택되어 있는 상품 쿠폰 중 일부 또는 전체 쿠폰 사용이 불가할 수 있습니다. 쿠폰을 적용하시겠습니까?',
        },
        result => {
          if (result.state === 'ok') {
            this.resetProductCoupon();
            this.setChoiceCartCoupon(couponIssueNo);

            if (onlyUse) {
              this[state].cartCouponOnly = true;
              this[state].prductCouponOnly = false;
            }
          } else {
            this.resetCartCoupon();
          }
        },
      );
    }

    setChoiceProductCoupon(coupon) {
      const productNo = Number(coupon.productNo);
      const couponIssueNo = coupon.couponIssueNo;

      this[state].choiceCoupon.productCoupons = this[state].choiceCoupon.productCoupons.filter(
        coupon => coupon.productNo !== productNo,
      );

      if (coupon.couponIssueNo !== 'default') {
        this[state].choiceCoupon.productCoupons = this[state].choiceCoupon.productCoupons.concat({
          productNo,
          couponIssueNo,
        });
      }

      this.sameProductCouponReadonlyAttach();
      this.contentUpdate();
    }

    setChoiceCartCoupon(couponIssueNo) {
      this[state].choiceCoupon.cartCouponIssueNo = couponIssueNo;

      this.contentUpdate();
    }

    resetProductCoupon(rerender = false) {
      this[state].choiceCoupon.productCoupons = [];

      if (rerender) this.contentUpdate();
    }

    resetCartCoupon(rerender = false) {
      this[state].choiceCoupon.cartCouponIssueNo = null;
      document.getElementById('cartCouponDefault').setAttribute('checked', 'true');

      if (rerender) this.contentUpdate();
    }

    sameProductCouponReadonlyAttach() {
      const throwCase = this.productCount <= 1;
      if (throwCase) return;

      this.handler.usableCouponGuide.attach(this.choicedProductCouponIssueNos);
    }

    fetchCalculatedCouponAmount() {
      const { productCoupons } = this[state].choiceCoupon;

      const request = {
        pathVariable: {
          orderSheetNo: this.orderSheetNo,
        },
        requestBody: {
          productCoupons: productCoupons.length > 0 ? productCoupons : null,
          cartCouponIssueNo: this[state].choiceCoupon.cartCouponIssueNo,
        },
      };

      return shopby.api.order.postOrderSheetsOrderSheetNoCouponsCalculate(request).then(({ data }) => data);
    }

    getCalculatedDisplayAmt(data) {
      const { productCouponDiscountAmt, cartCouponDiscountAmt } = data;
      const calculatedAmt = productCouponDiscountAmt + cartCouponDiscountAmt;

      return [productCouponDiscountAmt, cartCouponDiscountAmt, calculatedAmt].map(shopby.utils.toCurrencyString);
    }

    onSubmit() {
      this.selfRemove();
      const data = {
        state: 'ok',
        data: {
          ...this[state],
          canUsedAccumulation: this.canUsedAccumulation,
        },
      };
      this.callback(data);
    }

    onCancel() {
      shopby.confirm({ message: '취소 시 선택한 쿠폰은 적용되지 않습니다. 취소하시겠습니까?' }, ({ state }) => {
        if (state !== 'ok') return;
        this.close();
      });
    }

    selfRemove() {
      this.$el.remove();
      document.body.classList.remove('popup-open');
    }
  }

  class RadioElementReadOnlyHandler {
    constructor(el) {
      this.el = el;
    }

    // CORE METHOD
    attach(couponIssueNos) {
      this.resetAllRadioElementReadonlyAttribute();

      const targets = this.getSameCouponElements(couponIssueNos);
      targets.forEach(el => {
        el.setAttribute('disabled', '');
      });
      return targets;
    }

    get radioElementNodeArray() {
      const els = this.el.querySelectorAll('input[type="radio"]');
      return Array.from(els); // Array.prototype.slice.call == Array.from
    }

    getSameCouponElements(couponIssueNos) {
      return this.radioElementNodeArray
        .filter(({ value }) => couponIssueNos.includes(Number(value)))
        .filter(el => !el.checked);
    }

    resetAllRadioElementReadonlyAttribute() {
      this.radioElementNodeArray.forEach(el => {
        el.removeAttribute('disabled');
      });
    }
  }

  class UsableProductCouponGuideHandler extends RadioElementReadOnlyHandler {
    constructor(el) {
      super(el);
      this.$el = $(el);
    }

    attach(couponIssueNos) {
      this.resetAllReason();
      const targets = super.attach(couponIssueNos);

      // 지금은 한가지 케이스밖에 없어서 인터페이스 안빼고 여기다 넣음
      const reason = {
        code: 'other-product-used', // 나중에 reason 늘어날 경우 염두해둠
        text: '(사용 불가 : 다른 상품 적용)',
      };
      this.attachReason(targets, reason);
    }

    attachReason(targets, { text }) {
      $(targets).parents('li').find('[data-attach="readonlyReason"]').text(text);
    }

    resetAllReason() {
      $('[data-attach="readonlyReason"]').text('');
    }
  }

  shopby.registerPopupConstructor('apply-coupon', ApplyCoupon);
})();

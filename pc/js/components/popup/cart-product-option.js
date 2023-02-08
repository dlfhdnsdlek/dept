/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Bomee Yoon
 * @since 2021.7.11
 */

(() => {
  class CartProductOption {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.callback = callback;

      this.productNo = Number(option.productNo);

      this.init();
    }

    async init() {
      const [product, option] = await this.fetchData();
      this.optionUsed = option.type !== 'DEFAULT';
      this.productOption = shopby.helper.option(option, product && product.reservationData);
      this.render(product);
    }

    async fetchData() {
      try {
        const pathVariable = { productNo: this.productNo };
        const result = await Promise.all([
          shopby.api.product.getProductsProductNo({ pathVariable }),
          shopby.api.product.getProductsProductNoOptions({ pathVariable }),
        ]);
        return result.map(({ data }) => data);
      } catch (error) {
        console.error(error);
      }
    }

    render(product) {
      this._renderTemplate(product);
      this._renderSelectOptions();
      this._renderTotalPrice();

      $('.item_add_option_box')
        .find('select[name="select-option"] option[data-disabled="disabled"]')
        .prop('disabled', true);

      this.bindEvents();
    }

    bindEvents() {
      this.$el
        .on('click', 'button,a', this._onClickContainer.bind(this))
        .on('blur', 'input', this._onBlurContainer.bind(this))
        .on('change', 'select', this._onChangeSelectOptions.bind(this))
        .on('change', 'input[name="orderCnt"]', this._onChangeOrderCount.bind(this))
        .on('click', '#btnToggleTextOptionMode', this._onClickTextOptionMode.bind(this));
    }

    _renderTemplate(product) {
      const $parent = this.$el;
      const compiled = Handlebars.compile($('#cartProductOptionPopupTemplate').html());
      this.$el = $(compiled(this._getProductData(product)));

      $parent.append(this.$el);
      $('#productImage').attr('src', product.baseInfo.imageUrls[0]);
    }

    _renderSelectOptions() {
      $('#selectOption')
        .empty()
        .render({
          selectType: this.productOption.selectType,
          options: this.productOption.options,
          textOptions: this.productOption && this.productOption.textOptions,
          optionUsed: this.optionUsed,
        });
      this._renderSelectedOptions();
    }

    _renderSelectedOptions() {
      $('#selectedOption')
        .empty()
        .render({
          selectedOptions: this.productOption && this.productOption.selectedOptions,
          showsTotalPriceWithSelectedOptionsArea:
            this.productOption && this.productOption.selectedOptions && this.productOption.selectedOptions.length > 0,
          textOptions: this.productOption && this.productOption.textOptions,
          optionUsed: this.optionUsed,
        });
      this._renderTotalPrice();
    }

    _renderTotalPrice() {
      $('#totalPrice').text(shopby.utils.toCurrencyString(this.productOption.totalPrice));
    }

    _onChangeSelectOptions({ target }) {
      const data = $(target).data();
      const selectedDepth = Number(data.depth);

      const $option = $($('.optionSelectors option:selected')[selectedDepth]);
      // @todo select 가 select 이 안 되는 ui 이슈가 있음.
      // 로직 상의 문제는 없음 && 공통 헬퍼이기 때문에 로직 먼저 적용시키고
      // ui 이슈는 다음 pr 에서 해결하기
      // $option.parent().find('.notice').prop('disabled', true);

      try {
        const selectedOptionIndex = Number($option.val());
        this.productOption.changeSelectOption(selectedDepth, selectedOptionIndex);
        this._renderSelectOptions();
        this._displaySelectOptions(selectedDepth, selectedOptionIndex);
      } catch (error) {
        shopby.alert(error);
      }
    }

    _onClickTextOptionMode({ currentTarget }) {
      const optionNo = $(currentTarget).siblings('#amountTextOption').data('option-no');
      const textInputNo = $(currentTarget).siblings('#amountTextOption').data('text-input-no');
      const { orderCnt } = this.productOption.selectedOptions.find(option => option.optionNo === optionNo);
      //수량별일때 : orderCnt 만큼 inputbox 뿌려주기
      //옵션별일때 : inputbox 1개만
      this.productOption.drawAmountTextOption(optionNo, textInputNo, orderCnt);
      this._renderSelectedOptions();
    }

    _onChangeOrderCount({ target }) {
      const $target = $(target);
      if (!$target.val()) return;

      const optionNo = Number($target.closest('tr').data('option-no'));
      this.productOption.changeOrderCount('custom', optionNo, Number($target.val()));
      this._renderSelectedOptions();
    }

    _onClickContainer(event) {
      event.preventDefault();
      const actionType = $(event.target).data('action-type') || $(event.target).parents().data('action-type');
      const optionNo = Number($(event.target).closest('tr').data('option-no'));

      switch (actionType) {
        case 'up':
        case 'down':
          this.productOption.changeOrderCount(actionType, optionNo);
          this._renderSelectedOptions();
          break;
        case 'createCart':
          this._createCart();
          break;
        case 'createOrder':
          this._createOrder();
          break;
        case 'deleteOption':
          this.productOption.deleteSelectedOption(optionNo);
          this._renderSelectedOptions();
          break;
        case 'downloadCoupon':
          this._openCouponLayer();
          break;
        default:
          break;
      }
    }

    _onBlurContainer({ target }) {
      const $target = $(target);
      const inputMatchingType = $target.data('option-matching-type');
      if (!inputMatchingType) return;

      const inputNo = Number($target.closest('dl').data('text-input-no'));
      const optionNo = Number($target.closest('dl').data('option-no'));
      this.productOption.changeTextOption(inputMatchingType, optionNo, inputNo, $target.val(), $target.data('index'));
      this._renderSelectedOptions();
    }

    // product start

    _getProductData(product) {
      const { status, price, deliveryFee, limitations } = product;
      const totalDiscount = price.additionalDiscountAmt + price.immediateDiscountAmt;
      const hasBenefit = totalDiscount + price.accumulationAmtWhenBuyConfirm > 0;
      const coupon = this._getCouponRateAndPrice(price);

      return {
        ...product,
        shouldShowContentsIfPausing: this._getShouldShowContentsIfPausing(status, price),
        isUndeliverable: !deliveryFee,
        price: {
          ...price,
          discountedPrice: shopby.utils.getDisplayProductPrice(price),
          hasDiscount: totalDiscount > 0,
          hasBenefit,
          totalDiscount,
          priceWithCoupon: coupon.priceWithCoupon,
          couponRate: coupon.couponRate,
        },
        deliveryFee: {
          ...deliveryFee,
          deliveryFeeLabel: this._getDeliveryFeeLabel(deliveryFee),
          conditionLabel: this._getDeliveryConditionLabel(deliveryFee),
          deliveryLabel: this._getDeliveryLabel(deliveryFee),
        },
        useLimitations:
          limitations.minBuyCnt > 0 ||
          limitations.maxBuyTimeCnt > 0 ||
          limitations.maxBuyPersonCnt > 0 ||
          limitations.maxBuyPeriodCnt > 0,
        limitations,
        useLimitationsComma:
          limitations.minBuyCnt > 0 &&
          (limitations.maxBuyTimeCnt > 0 || limitations.maxBuyPersonCnt > 0 || limitations.maxBuyPeriodCnt > 0),
      };
    }

    _getShouldShowContentsIfPausing(status, price) {
      const hasBeenStopped = status.saleStatusType === 'STOP';
      return hasBeenStopped && price.contentsIfPausing;
    }

    _getCouponRateAndPrice({ salePrice, couponDiscountAmt, immediateDiscountAmt }) {
      const priceWithCoupon = salePrice - (couponDiscountAmt + immediateDiscountAmt);
      const coupon = couponDiscountAmt || 0;
      const price = salePrice || 0;
      const immediateDiscount = immediateDiscountAmt || 0;
      const couponRate = !couponDiscountAmt ? 0 : ((coupon / (price - immediateDiscount)) * 100).toFixed(0);
      return {
        priceWithCoupon,
        couponRate,
      };
    }

    _getDeliveryFeeLabel({ deliveryConditionType, deliveryAmt }) {
      const isFree = deliveryConditionType === 'FREE';
      return isFree ? '무료' : `${shopby.utils.toCurrencyString(deliveryAmt)}원`;
    }

    _getDeliveryLabel({ deliveryType, deliveryPrePayment }) {
      const DELIVERY_TYPE_LABEL = deliveryType === 'PARCEL_DELIVERY' ? '택배/등기/소포' : '직접배송';
      const PAYMENT_TYPE_LABEL = deliveryPrePayment ? '선결제' : '착불';
      return `${DELIVERY_TYPE_LABEL} / ${PAYMENT_TYPE_LABEL}`;
    }

    _getDeliveryConditionLabel({ perOrderCnt, aboveDeliveryAmt, deliveryConditionType }) {
      switch (deliveryConditionType) {
        case 'QUANTITY_PROPOSITIONAL_FEE':
          return `(${perOrderCnt}개마다 부과)`;
        case 'CONDITIONAL':
          return `(${shopby.utils.toCurrencyString(aboveDeliveryAmt)}원 이상 구매 시 무료)`;
      }
    }

    // product end

    // option start

    _addSelectedOption(selectedOptionNo) {
      try {
        this.productOption.addSelectedOption(selectedOptionNo);
        this._renderSelectedOptions();
      } catch (error) {
        shopby.alert(error.message);
      }
    }

    _displaySelectOptions(selectedDepthIndex, selectedOptionIndex) {
      // @todo refactor select 값이 안 잡혀서 임시 처리
      $('.chosen-select').each(function (selectIdx) {
        if (selectIdx === selectedDepthIndex) {
          $('option', this).each(function (optionIdx) {
            $(this).prop('selected', optionIdx === selectedOptionIndex + 1);
          });
        }
      });
    }

    // option end

    // cart

    _getRequestBodyForCartOrOrder() {
      return shopby.helper.option.requestBodyForCartOrOrder(
        this.productNo,
        this.productOption.selectedOptions,
        this.productOption.textOptions,
      );
    }

    _createCart() {
      try {
        this.productOption.validate();
        this._addCart(this._getRequestBodyForCartOrOrder());
      } catch (error) {
        shopby.alert(error.message);
      }
    }

    async _addCart(requestBody) {
      try {
        await shopby.helper.cart.addCart(requestBody);
        const afterAdding = ({ state }) => {
          if (state === 'ok') {
            window.location.href = '/pages/order/cart.html';
          } else {
            this.$el.remove();
          }
        };
        shopby.confirm(
          {
            message:
              '<p style="text-align: center;"><strong>상품이 장바구니에 담겼습니다.</strong></br>바로 확인하시겠습니까?</p>',
            iconType: 'cart',
          },
          afterAdding,
        );
      } catch (error) {
        shopby.alert(error.message);
      }
    }

    // cart end

    // order

    _getRequestBodyForOrder() {
      return {
        requestBody: {
          cartNos: [0],
          products: this._getRequestBodyForCartOrOrder(),
          productCoupons: null,
          trackingKey: null,
          channelType: null,
        },
      };
    }

    async _createOrder() {
      try {
        this.productOption.validate();
        const { data } = await shopby.api.order.postOrderSheets(this._getRequestBodyForOrder());
        const orderPage = `/pages/order/order.html?ordersheetno=${data.orderSheetNo}`;

        shopby.logined() ? window.location.replace(orderPage) : shopby.goLogin(orderPage);
      } catch (error) {
        error && shopby.alert(error.message);
      }
    }

    _openCouponLayer() {
      if (shopby.logined()) {
        shopby.popup('download-coupon', { productNo: this.productNo });
      } else {
        shopby.alert('로그인 후 서비스를 이용하실 수 있습니다.');
      }
    }
  }

  shopby.registerPopupConstructor('cart-product-option', CartProductOption);
})();

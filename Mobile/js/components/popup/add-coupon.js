/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author JongKeun Kim
 * @since 2021.7.8
 */

(() => {
  class AddCoupon {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.callback = callback;
      this.render($parent, option);
      this.bindEvents();
    }

    render($parent, option) {
      const compiled = Handlebars.compile($('#addCouponPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
    }

    bindEvents() {
      this.$el.on('submit', '#form', this.onSubmit.bind(this));
    }

    onSubmit(event) {
      event.preventDefault();

      const input = event.target.elements['couponNumber'];
      const value = input.value;

      const validate = () => {
        if (!value) {
          return shopby.alert('쿠폰 번호를 입력해주세요.', () => {
            input.focus();
          });
        }
        return !!value;
      };

      const isValid = validate();
      if (isValid) this.addCouponCode(value);
    }

    async addCouponCode(promotionCode) {
      const request = {
        pathVariable: {
          promotionCode,
        },
      };

      const { status } = await shopby.api.promotion.postCouponsRegisterCodePromotionCode(request);
      if (status !== 204) return;
      this.$el.remove();
      this.callback({ state: 'ok' });
    }
  }

  shopby.registerPopupConstructor('add-coupon', AddCoupon);
})();

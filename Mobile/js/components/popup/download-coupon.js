/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author hyeyeon-park
 * @author Bomee Yoon
 * @since 2021.8.13
 */
(() => {
  class DownloadCoupon {
    constructor($parent, option) {
      const compiled = Handlebars.compile($('#downloadCouponPopupTemplate').html());
      this.$el = $(compiled(option));
      this.option = option;
      this.coupons = null;

      $parent.append(this.$el);
      this.initiate();
    }

    async initiate() {
      await this.fetchCoupons();
      this.bindEvents();
    }

    async fetchCoupons() {
      const queryString = { includesCartCoupon: true };
      const pathVariable = { productNo: this.option.productNo };
      const { data: coupons } = await shopby.api.promotion.getCouponsProductsProductNoIssuableCoupons({
        queryString,
        pathVariable,
      });

      $('#coupons').render({ coupons });
      this.coupons = coupons;
    }

    bindEvents() {
      this.$el
        .on('click', '.coupon_download_btn', this.onClickDownloadCouponBtn.bind(this))
        .on('click', '#btnAllCouponDown', this.onClickDownloadAllCouponsBtn.bind(this))
        .on('click', '.btn_coupon_info', this.onClickCouponInfoBtn.bind(this))
        .on('click', '.btn_coupon_infor_layer', this.onClickCloseNoticeLayerBtn.bind(this));
    }

    onClickDownloadCouponBtn({ target }) {
      const couponNo = $(target).closest('li').data('coupon-no');

      this.downloadCoupon(couponNo);
    }

    onClickDownloadAllCouponsBtn() {
      try {
        this.downloadAllCoupons();
      } catch (e) {
        shopby.alert(e.message);
      }
    }

    onClickCouponInfoBtn(event) {
      const couponNo = $(event.target).closest('li').data('coupon-no');
      const targetCoupon = this.coupons.find(coupon => coupon.couponNo === couponNo);
      const { dateInfo, issueConstraint, useConstraint } = targetCoupon;
      const issueDaysOfWeek = JSON.parse(dateInfo.issueDaysOfWeek);

      $('.coupon_infor_layer_dim').render({ couponNo, dateInfo, issueDaysOfWeek, issueConstraint, useConstraint });
      $('.coupon_infor_layer_dim').addClass('on');
    }

    onClickCloseNoticeLayerBtn(event) {
      $(event.target).closest('.coupon_infor_layer_dim').removeClass('on');
    }

    async downloadCoupon(couponNo) {
      await shopby.api.promotion.postCouponsCouponNoDownload({ pathVariable: { couponNo } });
      shopby.alert('쿠폰이 발급되었습니다.', () => {
        $(`#download${couponNo}`).hide();
        $(`#downloaded${couponNo}`).show();
      });
    }

    async downloadAllCoupons() {
      const unDownloadableLength = this.coupons.filter(coupon => !coupon.downloadable).length;

      //모두 발급받은 경우
      if (unDownloadableLength === this.coupons.length) {
        shopby.alert('발급 가능한 쿠폰이 없습니다.', this.close.bind(this));
        return;
      }

      const { data } = await shopby.api.promotion.postCouponsProductsProductNoDownload({
        pathVariable: { productNo: this.option.productNo },
        requestBody: { includesCartCoupon: true },
      });

      if (data.issuedCoupons.length === 0) {
        shopby.alert('발급 가능한 쿠폰이 없습니다.', this.close.bind(this));
        return;
      }

      shopby.alert('쿠폰이 발급되었습니다.', this.close.bind(this));
    }
  }

  shopby.registerPopupConstructor('download-coupon', DownloadCoupon);
})();

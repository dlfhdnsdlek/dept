/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Bomee Yoon
 * @since 2021.7.5
 */
(() => {
  class DownloadCoupon {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#downloadCouponPopupTemplate').html());
      this.$el = $(compiled(option));

      this.option = option;
      this.callback = callback;

      $parent.append(this.$el);

      this.displayDownloadedCoupons = this.displayHandler();
      this.fetchCoupons();
      this.bindEvents();
    }
    async fetchCoupons() {
      try {
        const queryString = { includesCartCoupon: true };
        const pathVariable = { productNo: this.option.productNo };
        const { data: coupons } = await shopby.api.promotion.getCouponsProductsProductNoIssuableCoupons({
          queryString,
          pathVariable,
        });

        this.render(coupons);
      } catch (error) {
        console.error(error);
      }
    }
    render(coupons) {
      $('#couponCount').text(`${coupons.length}`);
      $('#coupons').renderTemplateWithRawHtml({ coupons }, coupons.map(getTemplate).join(''));
    }
    bindEvents() {
      this.$el
        .on('click', '.downloadCouponBtns', this.onClickDownloadCouponBtn.bind(this))
        .on('click', '#downloadAllCouponsBtn', this.onClickDownloadAllCouponsBtn.bind(this))
        .on('click', '.btnDownloadCouponInfor', this.onClickCouponInfoBtn)
        .on('click', '.coupon_infor_layer', this.onClickCloseNoticeLayerBtn.bind(this));
    }
    onClickDownloadCouponBtn(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const couponNo = $(event.target).closest('tr').data('coupon-no');

      this.downloadCoupon(couponNo);
    }
    onClickDownloadAllCouponsBtn(event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      this.downloadAllCoupons();
    }
    onClickCouponInfoBtn(event) {
      event.preventDefault();
      $(event.target).toggleClass('on');
    }
    onClickCloseNoticeLayerBtn(event) {
      event.preventDefault();
      $(event.target).closest('.coupon_infor_layer').siblings('.btnDownloadCouponInfor').removeClass('on');
    }
    async downloadCoupon(couponNo) {
      await shopby.api.promotion.postCouponsCouponNoDownload({ pathVariable: { couponNo } });

      const afterAlert = async () => {
        await this.fetchCoupons();
        this.displayDownloadedCoupons(couponNo);
      };

      shopby.alert('쿠폰이 발급되었습니다.', afterAlert.bind(this));
    }
    async downloadAllCoupons() {
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
    displayHandler() {
      const downloadedCouponNos = [];
      return couponNo => {
        downloadedCouponNos.push(couponNo);
        downloadedCouponNos.map(no => {
          $(`#download${no}`).hide();
          $(`#downloaded${no}`).show();
        });
      };
    }
  }

  const { toCurrencyString } = shopby.utils;

  const getPriceHtml = (discountAmt, discountRate) => {
    if (discountAmt) {
      return `<b>${toCurrencyString(discountAmt)}원</b>`;
    }
    if (discountRate) {
      return `<b>${discountRate}%</b>`;
    }
    return '';
  };

  const getDiscountHtml = (maxDiscountAmt, minSalePrice) => {
    let discountHtml = '';
    if (maxDiscountAmt) {
      discountHtml += `<div>- 최대 ${toCurrencyString(maxDiscountAmt)}원 할인</div>`;
    }
    if (minSalePrice) {
      discountHtml += `<div>- ${minSalePrice}원 이상 구매 시 사용가능</div>`;
    }
    return discountHtml;
  };

  const getCouponHtml = couponNo => {
    const download = `
            <span id="download${couponNo}" class="btn_gray_list btn_coupon_down">
                  <a href="#" class="btn_gray_small downloadCouponBtns"><em>쿠폰 다운로드</em></a>
            </span>`.trim();
    const downloaded = `<span style="display: none" id="downloaded${couponNo}" class="coupon_issue">발급 완료</span>`.trim();
    return download.concat(downloaded);
  };

  const getUseDate = (useDays, useEndYmdt) => {
    if (useDays === -1) return useEndYmdt;
    if (useDays === 0) return '발급일 당일 사용 가능';
    if (useDays === 31) return '발급일 당월 말일 까지 사용 가능';
    else return `발급일 +${useDays}일 까지 사용 가능`;
  };

  const getUsePlatformTypes = usablePlatformTypes => {
    return usablePlatformTypes.map(type => {
      return type === 'MOBILE_WEB' ? '모바일웹' : 'PC웹';
    });
  };

  const getTemplate = coupon => {
    const { couponName, couponNo, discountInfo, useConstraint, couponType } = coupon;
    const { discountAmt, discountRate } = discountInfo;
    const { maxDiscountAmt, minSalePrice, usablePlatformTypes, useDays, useEndYmdt } = useConstraint;

    return `
    <tr data-coupon-no="${couponNo}">
      <td>
          <strong>${couponName}</strong>
      </td>
      <td class="td_left">
          <strong class="coupon_price">
              ${getPriceHtml(discountAmt, discountRate)}
              ${couponType === 'PRODUCT' ? '상품 할인' : '주문 할인'}
          </strong>
          <span class="text_info">
              ${getDiscountHtml(maxDiscountAmt, minSalePrice)}
          </span>
      </td>
      <td>
          <div class="btn_down_box">
              ${getCouponHtml(couponNo)}
              <div class="coupon_infor">
                  <a href="#" class="btnDownloadCouponInfor">쿠폰 안내</a>
                  <div class="coupon_infor_layer">
                      <div class="coupon_infor_layer_top">
                          <p>쿠폰 이용안내</p>
                          <a class="btn_coupon_infor_layer closeNoticeLayerBtn" href="#" ><img src="/assets/img/mypage/icon-layer-close.png" alt="닫기"></a>
                      </div>
                      <div class="coupon_infor_layer_cont">
                          <ul>
                              <li>
                                  <dl>
                                      <dt>· 사용기간 :</dt>
                                      <dd>${getUseDate(useDays, useEndYmdt)}</dd>
                                  </dl>
                              </li>
                              <li>
                                  <dl>
                                      <dt>· 사용플랫폼 :</dt>
                                      <dd>${getUsePlatformTypes(usablePlatformTypes)}</dd>
                                  </dl>
                              </li>
                          </ul>
                          <p>* 본 이벤트는 예고 없이 변경되거나, 조기 종료될 수 있습니다.</p>
                      </div>
                  </div>
              </div>
          </div>
      </td>
  </tr>
  `.trim();
  };

  shopby.registerPopupConstructor('download-coupon', DownloadCoupon);
})();

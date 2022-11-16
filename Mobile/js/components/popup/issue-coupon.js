/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Bomee Yoon
 * @since 2021.7.5
 */
(() => {
  class IssueCoupon {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;
      this.displayIssuedCoupons = this.displayHandler();
      this.fetchCoupons();
    }
    async fetchCoupons() {
      try {
        const { data: coupons } = await shopby.api.promotion.getCouponsIssuable({
          queryString: {
            productNo: this.option.productNo,
            includesCartCoupon: true,
          },
        });

        this.render(coupons);
        this.bindEvents();
      } catch (error) {
        console.error(error);
      }
    }
    render(coupons) {
      $('#couponCount').text(`${coupons.length}`);
      $('#coupons').renderTemplateWithRawHtml({ coupons }, coupons.map(getTemplate).join(''));
    }
    bindEvents() {
      $('.issueCouponButtons').on('click', this.onClickIssueCouponButton.bind(this));
      $('#issueAllCouponsButton').on('click', this.onClickIssueAllCouponsButton.bind(this));
    }
    onClickIssueCouponButton(event) {
      event.preventDefault();
      const couponNo = $(event.target).closest('tr').data('coupon-no');

      this.issueCoupon(couponNo);
    }
    onClickIssueAllCouponsButton(event) {
      event.preventDefault();

      try {
        this.issueAllCoupons();
      } catch (error) {
        shopby.alert(error.message);
      }
    }
    async issueCoupon(couponNo) {
      try {
        await shopby.api.promotion.postCouponsCouponNoDownload({ pathVariable: { couponNo } });
        shopby.alert('쿠폰이 발급되었습니다.', async () => {
          await this.fetchCoupons();
          this.displayIssuedCoupons(couponNo);
        });
      } catch (error) {
        shopby.alert(error.message);
      }
    }
    async issueAllCoupons() {
      const { data } = await shopby.api.promotion.postCouponsProductsProductNoDownload({
        pathVariable: { productNo: this.option.productNo },
      });

      if (data.issuedCoupons.length === 0) {
        throw new Error('발급 가능한 쿠폰이 없습니다.');
      }

      shopby.alert('쿠폰이 발급되었습니다.', this.close);
    }
    displayHandler() {
      const issuedCouponNos = [];
      return couponNo => {
        issuedCouponNos.push(couponNo);
        issuedCouponNos.map(no => {
          $(`#issue${no}`).hide();
          $(`#issued${no}`).show();
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

  const getIssueBtnHtml = (issuePerPersonLimit, canIssue, couponNo) => {
    const issue = `
            <span id="issue${couponNo}" class="btn_gray_list btn_coupon_down">
                  <a href="#" class="btn_gray_small issueCouponButtons" ><em>쿠폰 다운로드</em></a>
            </span>`.trim();
    const issued = `<span style="display: none" id="issued${couponNo}" class="coupon_issue">발급 완료</span>`.trim();

    if (issuePerPersonLimit) {
      return canIssue ? issue : issued;
    }
    return issue.concat(issued);
  };

  const getCouponHtml = (issueConstraint, myIssuedCnt, downloadable, couponNo) => {
    const { issuePerPersonLimit, issuePerPersonLimitCnt } = issueConstraint;
    return `
    ${getIssueBtnHtml(issuePerPersonLimit, myIssuedCnt > issuePerPersonLimitCnt, couponNo)}
    ${downloadable ? '' : '<span class="coupon_issue wrong">발급 불가</span>'}
    `.trim();
  };

  const getTemplate = coupon => {
    const { couponName, couponNo, discountInfo, useConstraint, issueConstraint, couponStatus, downloadable } = coupon;
    const { discountAmt, discountRate, couponType } = discountInfo;
    const { maxDiscountAmt, minSalePrice, usablePlatformTypes } = useConstraint;
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
              <!--{{#if discountInfo.useOtherCoupon}}- 중복 사용가능<br>{{/if}}
              {{#if discountInfo.skippedAccumulationAmt}}- 적립금 지급 불가<br>{{/if}}
              {{#if discountInfo.freeDelivery}}- 배송비 무료{{/if}}-->
          </span>
      </td>
      <td>
          <div class="btn_down_box">
              ${getCouponHtml(issueConstraint, couponStatus.myIssuedCnt, downloadable, couponNo)}
              <div class="coupon_infor">
                  <a href="#" class="btnDownloadCouponInfor">쿠폰 안내</a>
                  <div class="coupon_infor_layer">
                      <div class="coupon_infor_layer_top">
                          <p>쿠폰 이용안내</p>
                          <a class="btn_coupon_infor_layer" href="#"><img src="/assets/img/icon/btn_layer_close.png" alt="닫기"></a>
                      </div>
                      <div class="coupon_infor_layer_cont">
                          <ul>
                              <li>
                                  <dl>
                                      <dt>· 사용기간 :</dt>
                                      <dd>발급일 당일 사용 가능</dd>
                                  </dl>
                              </li>
                              <li>
                                  <dl>
                                      <dt>· 사용플랫폼 :</dt>
                                      <dd>${usablePlatformTypes}웹</dd>
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

  shopby.registerPopupConstructor('download-coupon', IssueCoupon);
})();

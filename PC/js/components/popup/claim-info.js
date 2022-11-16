/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-20
 */

(() => {
  class ClaimInfo {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#claimInfoTemplate').html());
      this.$el = $(compiled(this.option));
      this.$parent = $parent;
      this.option = option;
      this.callback = callback;
      this.claimInfo = null;

      this.initiate();
    }
    async initiate() {
      await this.fetchClaimResult();
      this.render();
    }
    async fetchClaimResult() {
      try {
        const pathVariable = {
          claimNo: this.option,
        };
        const { data } = shopby.logined()
          ? await shopby.api.claim.getProfileClaimsClaimNoResult({ pathVariable })
          : await shopby.api.claim.getGuestClaimsClaimNoResult({ pathVariable });
        this.claimInfo = data;
        this.claimInfo.reasonType = this.getClaimReasonType(data);
      } catch (e) {
        console.error(e);
      }
    }
    render() {
      const actionType = { CANCEL: '취소', EXCHANGE: '교환', RETURN: '반품' }[this.claimInfo.claimType];
      const title = `${actionType} 상세 정보`;
      this.$parent.append(this.$el);
      $('#claimInfoTitle').text(title);
      $('#claimInfoContents').render(this.claimInfo);
    }
    getClaimReasonType({ claimReasonType }) {
      return {
        CHANGE_MIND: '단순변심(색상,사이즈 등)',
        WRONG_PRODUCT_DETAIL: '상품상세 정보와 다름',
        DELAY_DELIVERY: '판매자 배송 지연',
        DEFECTIVE_PRODUCT: '상품불량/파손',
        WRONG_DELIVERY: '배송누락/오배송',
        OTHERS_BUYER: '기타(구매자 귀책)',
        OTHERS_SELLER: '기타(판매자 귀책)',
        OUT_OF_STOCK: '상품 품절/재고 없음',
        CANCEL_BEFORE_PAY: '입금전 주문 취소',
      }[claimReasonType];
    }
  }
  shopby.registerPopupConstructor('claim-info', ClaimInfo);
})();

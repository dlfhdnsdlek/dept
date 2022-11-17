/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.5
 */

$(() => {
  shopby.member.releaseDormant = {
    async initiate() {
      try {
        const dormancyInfo = await shopby.api.member.getProfileDormancy();
        this.render(dormancyInfo.data);
        this.bindEvents();
      } catch (error) {
        history.back();
      }
    },
    render({ signUpDateTime, dormantDateTime, lastLoginDateTime }) {
      $('#dormantDateInfo').render({
        joinDate: this._formatDate(signUpDateTime),
        dormantDate: this._formatDate(dormantDateTime),
        lastLoginDate: this._formatDate(lastLoginDateTime),
      });
    },
    bindEvents() {
      $('#btnPrevStep').on('click', this.cancelReleaseDormant);
      $('#btnNextStep').on('click', this.confirmReleaseDormant.bind(this));
    },
    renderDormantComplete() {
      $('.member_cont').hide();
      shopby.utils.changeBreadcrumb('휴면해제 완료');
      shopby.localStorage.removeItem(shopby.cache.key.member.dormant);
      $('#completeDormantRelease').render();
      $('#btnConfirm').on('click', shopby.goHome);
    },
    cancelReleaseDormant() {
      shopby.cache.removeAccessToken();
      shopby.localStorage.removeItem(shopby.cache.key.member.dormant);
      shopby.goLogin();
    },
    async confirmReleaseDormant() {
      await shopby.api.member.putProfileDormancy({ requestBody: { authType: 'NONE' } });
      this.renderDormantComplete();
    },

    _formatDate(date) {
      return dayjs(date).format('YYYY년 MM월 DD일');
    },
  };

  shopby.start.initiate(shopby.member.releaseDormant.initiate.bind(shopby.member.releaseDormant));
});

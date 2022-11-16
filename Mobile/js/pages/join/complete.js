/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6.29
 *
 */

$(() => {
  shopby.member.join = {
    initiate() {
      shopby.setGlobalVariableBy('MEMBER_JOIN_COMPLETE');

      this.render();
      this.bindEvents();
    },
    render() {
      $('#joinMemberId').render({ memberId: shopby.utils.getUrlParam('memberId') });
    },
    bindEvents() {
      $('#btnHome').on('click', shopby.goHome);
      $('#btnLogin').on('click', shopby.goLogin);
    },
  };

  shopby.start.initiate(shopby.member.join.initiate.bind(shopby.member.join));
});

/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6.23
 *
 */

$(() => {
  shopby.member.joinMethod = {
    initiate() {
      this.render();
      this.bindEvents();
    },
    render() {
      $('#openIdMethod').render({ providers: this.providers });
    },
    get providers() {
      const mallInfo = shopby.cache.getMall();
      return mallInfo.openIdJoinConfig.providers
        .sort((a, b) => b.charCodeAt(0) - a.charCodeAt(0))
        .map(provider => ({
          provider,
          url: `/assets/img/etc/pc_${provider}_join.png`,
          title: `${provider} 아이디 회원가입`,
        }));
    },
    bindEvents() {
      $('.btn_login_sns').on('click', shopby.helper.login.openIdLogin.bind(shopby.helper.login));
    },
  };

  shopby.start.initiate(shopby.member.joinMethod.initiate.bind(shopby.member.joinMethod));
});

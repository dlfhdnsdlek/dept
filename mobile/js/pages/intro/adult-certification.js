/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  window.shopKcpCallback = function (result) {
    if (result) {
      shopby.alert('본인 인증에 성공하였습니다.', shopby.goHome);
    } else {
      shopby.alert('본인 인증에 실패하였습니다.');
    }
  };

  shopby.intro.adultCertification = {
    async initiate() {
      await this.render();
      this.bindEvents();
    },
    async render() {
      const memberInfo = shopby.logined() ? await shopby.api.member.getProfile() : null;
      const memberName = memberInfo && memberInfo.data.memberName ? memberInfo.data.memberName : '';

      $('#contents').render({
        memberName,
        providers: this.providers,
      });
    },
    get providers() {
      const mallInfo = shopby.cache.getMall();
      return mallInfo.openIdJoinConfig.providers
        .sort((a, b) => b.charCodeAt(0) - a.charCodeAt(0))
        .map(provider => ({ provider, url: `/assets/img/etc/pc_${provider}.png`, title: `${provider} 아이디 로그인` }));
    },
    bindEvents() {
      $('.btn_exit').on('click', shopby.goHome);
      $('.btnCertificationByMobile').on('click', shopby.helper.member.openKcpCallback);

      $('button[name="member-login-btn"]').on('click', this.memberLogin.bind(this)).enterKeyup('#password');
      $('#loginBox').on('click', 'button', this.movePage);
      $('.btn_login_sns').on('click', shopby.helper.login.openIdLogin.bind(shopby.helper.login));
    },
    async memberLogin() {
      const memberId = $('#memberId').val().trim();
      const password = $('#password').val().trim();

      try {
        this._validateLoginForm();
      } catch (e) {
        shopby.alert(e.message);
      }

      try {
        const loginResult = await shopby.api.auth.postOauthToken({ requestBody: { memberId, password } });
        this._processAfterLogin(loginResult.data);
      } catch (error) {
        const selector =
          shopby.platform === 'PC' ? '.member_login_box .js_caution_msg1' : '.login_box .js_caution_msg1';
        $(selector).show();
      }
    },
    movePage(event) {
      const $el = $(event.target);
      let type = $el.data('action');
      if (!type) {
        type = $el.parents('button').data('action');
      }

      const pages = {
        joinMethod: '/pages/join/method.html',
        findId: '/pages/find-id/find-id.html',
        findPwd: '/pages/find-password/find-password.html',
      };
      location.href = pages[type];
    },

    _validateLoginForm() {
      if (!$('#memberId').val()) {
        $('#memberId').focus();
        throw new Error('아이디를 입력해주세요.');
      }

      if (!$('#password').val()) {
        $('#password').focus();
        throw new Error('비밀번호를 입력해주세요.');
      }
    },
    _processAfterLogin(result) {
      shopby.cache.setAccessToken(result.accessToken, result.expireIn);

      if (result.dormantMemberResponse !== null) {
        shopby.confirm({ message: '휴면해제가 필요합니다.' }, function (e) {
          if (e.state === 'ok') {
            location.replace('/pages/login/dormant.html');
          }
        });
        return;
      }
      if (result.daysFromLastPasswordChange > 90) {
        location.replace('/pages/login/change-password.html');
      }

      shopby.helper.login.goNextUrl();
    },
  };

  shopby.start.initiate(shopby.intro.adultCertification.initiate.bind(shopby.intro.adultCertification));
});

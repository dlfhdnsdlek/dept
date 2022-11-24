/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  const shopKcpCallback = function (result) {
    if (result) {
      shopby.alert('본인 인증에 성공하였습니다.', () => {
        shopby.goHome();
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
      });
    } else {
      shopby.alert('본인 인증에 실패하였습니다.');
      shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
    }
  };
  const kcpProfile = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.kcpAuth);
  kcpProfile && shopKcpCallback(kcpProfile);

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
        .map(provider => ({
          provider,
          url: `/assets/img/etc/txt_mo_${provider}.png`,
          title: `${provider} 아이디 로그인`,
        }));
    },
    bindEvents() {
      $('.teenager_out').on('click', shopby.goHome);
      $('button[name="member-login-btn"]').on('click', this.memberLogin.bind(this)).enterKeyup('#password');
      $('.btnLoginSns').on('click', shopby.helper.login.openIdLogin.bind(shopby.helper.login));
      const btnAuthKCP = document.getElementById('btnAuthKCP')
      btnAuthKCP.href = shopby.helper.member.getKcpCallbackUrl()
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

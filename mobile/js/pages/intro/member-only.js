/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  const $memberId = $('#memberId');
  const $password = $('#password');
  const $saveId = $('#saveId');

  shopby.intro.memberOnly = {
    initiate() {
      this.render();
      this.setData();
      this.bindEvents();
    },
    setData() {
      const savedMemberId = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.saveMemberId);
      $saveId.prop('checked', !!savedMemberId);
      $memberId.val(savedMemberId);
    },
    render() {
      $('#openIdMethod').render({ providers: this.providers });
    },
    get providers() {
      const mallInfo = shopby.cache.getMall();
      return mallInfo.openIdJoinConfig.providers
        .sort((a, b) => b.charCodeAt(0) - a.charCodeAt(0))
        .map(provider => ({ provider, url: `/assets/img/etc/pc_${provider}.png`, title: `${provider} 아이디 로그인` }));
    },
    bindEvents() {
      $('button[name="member-login-btn"]').on('click', this.memberLogin.bind(this)).enterKeyup($password);
      $('.btn_login_box').on('click', 'button', this.movePage);
      $('.btn_login_sns').on('click', shopby.helper.login.openIdLogin.bind(shopby.helper.login));
    },
    async memberLogin() {
      const memberId = $memberId.val().trim();
      const password = $password.val().trim();
      const checked = $saveId.is(':checked');

      try {
        this._validateLoginForm();
      } catch (e) {
        shopby.alert(e.message);
      }

      try {
        const loginResult = await shopby.api.auth.postOauthToken({ requestBody: { memberId, password } });
        this._processAfterLogin(loginResult.data, memberId, checked);
      } catch (error) {
        const selector =
          shopby.platform === 'PC' ? '.member_login_box .js_caution_msg1' : '.login_box .js_caution_msg1';
        $(selector).show();
      }
    },
    movePage(event) {
      const type = event.target.dataset.action;
      const pages = {
        joinMethod: '/pages/join/method.html',
        findId: '/pages/find-id/find-id.html',
        findPwd: '/pages/find-password/find-password.html',
      };
      location.href = pages[type];
    },

    _validateLoginForm() {
      if (!$memberId.val()) {
        $memberId.focus();
        throw new Error('아이디를 입력해주세요.');
      }

      if (!$password.val()) {
        $password.focus();
        throw new Error('비밀번호를 입력해주세요.');
      }
    },
    _processAfterLogin(result, memberId, isRemember) {
      shopby.cache.setAccessToken(result.accessToken, result.expireIn);
      if (isRemember) {
        shopby.localStorage.setItem(shopby.cache.key.member.saveMemberId, memberId);
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.saveMemberId);
      }

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

      shopby.goHome();
    },
  };

  shopby.start.initiate(shopby.intro.memberOnly.initiate.bind(shopby.intro.memberOnly));
});

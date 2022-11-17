/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6
 *
 */

$(() => {
  const $memberId = $('#memberId');
  const $password = $('#password');
  const $saveId = $('#saveId');

  shopby.member.login = {
    initiate() {
      if (shopby.logined()) {
        shopby.goHome();
      }
      this.setData();
      this.render();
      this.bindEvents();
      this.captcha = this.captcha || shopby.helper.captcha();
    },
    setData() {
      const savedMemberId = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.saveMemberId);
      $saveId.prop('checked', !!savedMemberId);
      $memberId.val(savedMemberId);
    },
    render() {
      const param = shopby.utils.getUrlParam('next-url');
      $('#openIdMethod').render({ providers: this.providers });
      $('#nonMemberOrder').render({ orderSheetNo: param ? param.includes('ordersheetno') : null });
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
      $('[data-action="oauth"]').on('click', shopby.helper.login.openIdLogin.bind(shopby.helper.login));
      $('#btnFindOrdersWithGuest').on('click', this.guestLogin.bind(this)).enterKeyup('#guestPassword');
      $('#guestOrder').on('click', this.guestOrder);
    },
    async memberLogin() {
      const memberId = $memberId.val().trim();
      const password = $password.val().trim();
      const checked = $saveId.is(':checked');

      try {
        this._validateLoginForm();
      } catch (e) {
        shopby.alert(e.message);
        return;
      }

      try {
        (await this.captcha) && this.captcha.submitCode();
        const loginResult = await shopby.api.auth.postOauthToken({ requestBody: { memberId, password } });
        this._processAfterLogin(loginResult.data, memberId, checked);
        this.captcha && this.captcha.reset();
      } catch (error) {
        const selector =
          shopby.platform === 'PC' ? '.member_login_box .js_caution_msg1' : '.login_box .js_caution_msg1';
        $(selector).show();
        if (error.code === 'M0305' || error.code === 'CP9001') {
          this.captcha && this.captcha.retry(error.key);
          this.captcha && this.captcha.errorHandler(error);
        }
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
    async guestLogin() {
      const orderNo = $('#guestOrderNo').val().trim();
      const orderPw = $('#guestPassword').val().trim();

      if (!orderNo) {
        shopby.alert('주문번호를 입력해주세요.');
        return;
      }

      if (!orderPw) {
        shopby.alert('비밀번호를 입력해주세요.');
        return;
      }

      const request = {
        pathVariable: { orderNo },
        requestBody: { password: orderPw, orderRequestType: 'ALL' },
      };
      const { data } = await shopby.api.order.postGuestOrdersOrderNo(request);
      shopby.cache.setGuestToken(data.guestToken);
      location.href = `/pages/my/order.html?orderNo=${orderNo}`;
    },

    guestOrder() {
      location.href = shopby.utils.getUrlParam('next-url');
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
      shopby.cache.removeAccessToken();
      shopby.cache.setAccessToken(result.accessToken, result.expireIn);
      if (isRemember) {
        shopby.localStorage.setItem(shopby.cache.key.member.saveMemberId, memberId);
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.saveMemberId);
      }

      if (result.dormantMemberResponse !== null) {
        shopby.confirm({ message: '휴면해제가 필요합니다.' }, function (e) {
          if (e.state === 'ok') {
            shopby.localStorage.setItem(shopby.cache.key.member.dormant, true);
            location.replace('/pages/login/dormant.html');
          }
        });
        return;
      }
      if (result.daysFromLastPasswordChange > 90) {
        location.replace('/pages/login/change-password.html');
      }
      shopby.localStorage.removeItem(shopby.cache.key.member.dormant);
      shopby.helper.login.goNextUrl();
    },
  };

  shopby.start.initiate(shopby.member.login.initiate.bind(shopby.member.login));
});

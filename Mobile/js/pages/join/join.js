/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6.23
 *
 */

$(() => {
  shopby.member.join = {
    smsTimer: null,
    emailTimer: null,
    joinTermsAgreements: shopby.utils.getUrlParam('terms'),
    kcpAuthInfo: shopby.localStorage.getItemWithExpire(shopby.cache.key.member.kcpAuth),
    emailCaptcha: shopby.helper.captcha('captcha'),
    smsCaptcha: shopby.helper.captcha('captcha'),
    countryCode: shopby.cache.getMall() ? shopby.cache.getMall().mall.countryCode : 'KR',
    initiate() {
      const {
        mallJoinConfig: { authenticationTimeType, authenticationType },
      } = shopby.cache.getMall();
      const isAuthPhoneConfig =
        authenticationTimeType === 'JOIN_TIME' && authenticationType === 'AUTHENTICATION_BY_PHONE';
      const mustKcpAuth = !this.kcpAuthInfo && isAuthPhoneConfig;
      if (mustKcpAuth) {
        history.back();
      }
      const initTimer = authType =>
        new shopby.helper.timer(
          this._onTimerTicked(authType),
          this._onTimerEnded(authType),
          this._onTimeCleared(authType),
        );
      this.smsTimer = initTimer('sms');
      this.emailTimer = initTimer('email');

      this.render();
      this.bindEvents();
    },
    render() {
      if (!this.joinTermsAgreements) {
        shopby.alert(
          { message: '잘못된 경로로 접근하였습니다.<br>약관동의 후 정보입력해주시기 바랍니다.' },
          () => (location.href = '/pages/join/agreement.html'),
        );
      }
      $('#memberRegister').render(this.getData());
    },
    getData() {
      const {
        mallJoinConfig: { authenticationTimeType, authenticationType },
      } = shopby.cache.getMall();
      const needsAuthType = {
        needsMobileAuth: authenticationType === 'AUTHENTICATION_BY_PHONE',
        needsEmailAuth: authenticationType === 'AUTHENTICATION_BY_EMAIL',
        needsSmsAuth: authenticationType === 'SMS_AUTHENTICATION',
      };
      const authType = authenticationTimeType === 'JOIN_TIME' ? needsAuthType : {};
      const dayFormatter = type => (this.kcpAuthInfo ? Number(dayjs(this.kcpAuthInfo.birthday).format(type)) : 0);

      return {
        kcpAuth: this.kcpAuthInfo,
        memberJoinConfig: shopby.config.member.joinConfig,
        selectOptions: {
          yearList: shopby.helper.member.last120YearsAgo,
          monthList: shopby.helper.member.monthList,
          dayList: shopby.helper.member.dayList,
        },
        ...authType,
        year: dayFormatter('YYYY'),
        month: dayFormatter('M'),
        day: dayFormatter('D'),
      };
    },
    bindEvents() {
      const onBlurNext = fn => setTimeout(fn, 0);
      $('#memberRegisterForm')
        .on('keyup', 'input', this.changeValidInput.bind(this))
        .on('blur', 'input', this.blurValidInput.bind(this))
        .on('change', 'select', shopby.helper.member.changeSelectedBirth)
        .on('click', 'button[name="sendAuth"]', event => {
          onBlurNext(this.sendAuthentication.bind(this, event));
        })
        .on('click', 'button[name="confirmAuth"]', this.confirmAuthentication.bind(this));
      $('#btnPostcode').on('click', this.findAddress.bind(this));
      $('.join_prev_btn').on('click', this.onClickPrevBtn.bind(this));
      $('#join_submit').on('click', this.joinMember.bind(this));
      $('input[name="memberId"]').focus();
    },
    changeValidInput({ key, target }) {
      const { pattern } = target.dataset;
      const _key = key || '';
      if (_key.includes('Arrow') || !pattern) return;

      const { value } = target;
      let validInput = value.replace(shopby.regex[pattern], '');

      if (pattern === 'userid') {
        const count = (value.match(shopby.regex.at) || []).length;
        validInput = count > 1 ? validInput.substring(0, value.length - 1) : validInput;
      }
      $(target).val(validInput);
    },
    async blurValidInput({ target }) {
      const $target = $(target);
      const $warnMessage = $target.closest('.input_wrap').find('.warning_message');
      const { name, value, dataset } = target;
      if (!value) return;
      const resultMessage = await this._validateForm(name, value, dataset.userInfo || null);
      shopby.regex.mobileNo.lastIndex = 0;
      const successValidation = resultMessage.includes('success') || resultMessage === '';
      const errorInput = $target.closest('.input_wrap').find('input');

      if (name.includes('email') && !resultMessage.includes('success')) {
        $warnMessage.hide();
        const id = $('#emailId');
        const domain = $('#emailDomain');
        if (!id.val() || !shopby.regex.emailId.test(id.val())) {
          id.focus();
        } else if (!domain.val() || !shopby.regex.emailId.test(domain.val())) {
          domain.focus();
        }
      }

      if (resultMessage.length > 0) {
        $warnMessage.text(shopby.message[resultMessage]).show();
      } else {
        $warnMessage.hide();
      }
      $warnMessage.data('usable', successValidation);

      if ($warnMessage.data('usable') === false) {
        errorInput.addClass('fail_valid');
      } else {
        errorInput.removeClass('fail_valid');
      }
    },
    async sendAuthentication({ target }) {
      const $target = $(target);
      const $warnMessage = $target.parents('.input_wrap').find('.warning_message');
      const authType = $target.data('authType');
      const currentAuth = shopby.helper.member.getCurrentAuth(authType);
      const { value, key, errorMessage } = currentAuth;
      const $invalidInput = $target.parents('.input_wrap').find(`input[name=${key}]`);

      if (value.length === 0 || value === '@') {
        $warnMessage.text(errorMessage).show();
        $invalidInput.addClass('fail_valid');
        shopby.alert(errorMessage);
        return;
      }
      if ($invalidInput.attr('class').includes('fail_valid')) {
        shopby.alert($warnMessage.text().split('.')[0]);
        //NOTE: 에러 메세지 중복으로 split 이용
        return;
      }

      const $sendButton = $(`.btn_send_${authType}`);
      if ($sendButton.text() === '재인증') {
        $(`.${authType}_box, .auth_${authType}`).find('input').val('');
        $(`input[name="${key}"], input[name="auth_${authType}"]`).attr('disabled', false);
        $sendButton.text('인증번호 발송');
        return;
      }
      const usable = $warnMessage.data('usable');
      if (!usable) return;

      const { data } = await shopby.api.auth.postAuthentications({
        requestBody: {
          memberName: $('input[name="memberName"]').val(),
          notiAccount: value,
          type: authType.toUpperCase(),
          usage: 'JOIN',
        },
      });
      shopby.alert(
        `인증번호가 발송되었습니다.<br>${authType.toUpperCase()}로 발송된 인증번호 입력하여 인증을 완료해 주세요.`,
        () => {
          $(`input[name="auth_${authType}"]`).focus();
          $target.hide();
        },
      );
      const targetTimer = authType === 'sms' ? this.smsTimer : this.emailTimer;
      targetTimer.start(data.remainTime);
      $(`.auth_${authType}`).show();
      $(`.auth_${authType} .warning_message`).hide();
    },

    async confirmAuthentication({ target }) {
      const authType = $(target).data('authType');
      const captcha = this[`${authType}Captcha`];
      const certificatedNumber = $(`input[name="auth_${authType}"]`).val().trim();

      if (authType === 'email') {
        this.emailCaptcha = this.emailCaptcha || shopby.helper.captcha('emailCaptcha');
      } else if (authType === 'sms') {
        this.smsCaptcha = this.smsCaptcha || shopby.helper.captcha('smsCaptcha');
      }

      try {
        const { value } = shopby.helper.member.getCurrentAuth(authType);
        await captcha.submitCode(true);
        await shopby.api.auth.getAuthentications({
          queryString: {
            notiAccount: value,
            type: authType.toUpperCase(),
            usage: 'JOIN',
            certificatedNumber,
          },
        });

        const targetTimer = authType === 'sms' ? this.smsTimer : this.emailTimer;
        targetTimer.clear();
        captcha.reset();
        $(`.btn_send_${authType}`).show();
      } catch (e) {
        console.error(e);
        if (certificatedNumber.length === 0) {
          shopby.alert('인증번호를 입력해주세요.');
        } else {
          $(`.auth_${authType} .warning_message`).text('올바른 인증번호가 아닙니다.').show();
          if (e.code === 'E0008' || e.code === 'CP9001') {
            captcha.retry();
            captcha.errorHandler(e);
          }
        }
      }
    },
    findAddress() {
      shopby.popup('find-address', {}, data => {
        if (data.state === 'close') return;
        $('#zipCd').val(data.zipCode);
        $('#address').val(data.address);
        $('#jibunAddress').val(data.jibunAddress);
        $('body').append('<div id="popups-area"></div>');
        shopby.alert('상세주소를 입력해주시기 바랍니다.', () => $('input[name="detailAddress"]').focus());
      });
    },
    onClickPrevBtn() {
      const params = new URLSearchParams();
      params.set('terms', this.joinTermsAgreements);
      location.replace(`/pages/join/agreement.html?${params.toString()}`);
    },
    async joinMember() {
      const inputWaringMessage = $('.input_wrap').find('.warning_message');
      const failValidInput = $('.fail_valid').siblings('.warning_message').html();
      const isValid = shopby.helper.member.checkValidInput(inputWaringMessage);
      try {
        if (!isValid) {
          shopby.alert(failValidInput);
          return;
        }
        shopby.helper.member.submitValidation();
        await shopby.api.member.postProfile({ requestBody: this.getMemberInfo() });
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
        const params = new URLSearchParams();

        params.set('memberId', $('input[name="memberId"]').val());
        location.replace(`/pages/join/complete.html?${params.toString()}`);
      } catch (error) {
        console.log(error);
        shopby.alert(error.message);
      }
    },

    _validateForm(type, value) {
      const { member } = shopby.helper;
      switch (type) {
        case 'memberId':
          return member.userIdValidation(value);
        case 'password':
          return member.passwordValidation(value);
        case 'passwordChk':
          return member.passwordChkValidation(value);
        case 'memberName':
          return member.nameValidation(value);
        case 'nickname':
          return member.nicknameValidation(value);
        case 'email':
          return member.emailValidation();
        case 'mobileNo':
        case 'telephoneNo':
          return member.mobileNoValidation(value);
        default:
          return '';
      }
    },
    getMemberInfo() {
      console.log(this.countryCode);

      const certificated = !!($('#authSMS').val() || $('#authEmail').val() || $('#ci').val());

      return {
        memberId: $('input[name="memberId"]').val(), //영문6자이상
        password: $('input[name="password"]').val(), //영문+숫자+특수문자
        memberName: $('input[name="memberName"]').val(), //이름
        nickname: $('input[name="nickname"]').val(), //닉네임
        email: shopby.helper.member.emailValue, //이메일
        directMailAgreed: $('input[id="directMailAgreed"]').is(':checked'), //메일 알림 동의 여부 boolean
        telephoneNo: $('input[name="telephoneNo"]').val(), //전화번호 예.023457890
        mobileNo: $('input[name="mobileNo"]').val(), //핸드폰번호 예.01012347890
        smsAgreed: $('input[id="smsAgreed"]').is(':checked'), //sms 알림 동의 여부 boolean
        pushNotificationAgreed: $('input[name="pushNotificationAgreed"]').is(':checked') || false, //푸시 알림 동의 여부 boolean
        zipCd: $('input[name="zipCd"]').val(), //우편번호
        address: $('input[name="address"]').val(), //도로명 주소
        detailAddress: $('input[name="detailAddress"]').val(), //도로명 상세주소
        jibunAddress: $('input[name="jibunAddress"]').val(), //지번 주소
        jibunDetailAddress: $('input[name="detailAddress"]').val(), //지번 상세주소
        sex: $('input[name="sex"]:checked').val(), //성별
        birthday: this._birthday, //생일 예.19981209
        countryCd: this.countryCode, //국적
        joinTermsAgreements: this.joinTermsAgreements.split(','), //약관동의 array
        recommenderId: $('input[name="recommenderId"]').val(), //추천인 아이디
        ci: $('input[name="ci"]').val(), //본인인증 후 가입시 필요한 식별 번호
        certificated, //인증확인 여부 boolean
      };
    },
    get _birthday() {
      const selectedYear = $('select[name="birthYear"]').val();
      const selectedMonth = $('select[name="birthMonth"]').val();
      const selectedDay = $('select[name="birthDay"]').val();
      const allSelected = selectedYear !== '0' && selectedMonth !== '0' && selectedDay !== '0';

      const unitDigit = num => (Number(num) < 10 ? `0${num}` : `${num}`);
      return allSelected ? `${selectedYear}${unitDigit(selectedMonth)}${unitDigit(selectedDay)}` : '';
    },
    _onTimerTicked(authType) {
      return time => {
        $(`.auth_${authType} .timer`).html(time);
        $(`.btn_confirm_${authType}`).css('display', 'inline');
      };
    },
    _onTimerEnded(authType) {
      return () => {
        $(`.auth_${authType} .timer`).html('시간초과');
        $(`.auth_${authType}`)
          .find('.warning_message')
          .text('유효시간이 초과되었습니다. 다시 [인증번호 발송] 클릭하여 발급된 인증번호를 입력해주세요.')
          .show();
        $(`.btn_send_${authType}`).show();
        $(`.btn_confirm_${authType}`).css('display', 'none');
      };
    },
    _onTimeCleared(authType) {
      return () => {
        if (authType === 'email') {
          $(`input[name="${authType}"]`).attr('disabled', true);
        } else if (authType === 'sms') {
          $(`input[name="mobileNo"]`).attr('disabled', true);
        }
        $(`.btn_send_${authType}`).text('재인증');
        $(`.auth_${authType} .timer`).html('');
        $(`.auth_${authType},.auth_${authType} .warning_message`).hide();
      };
    },
  };

  shopby.start.initiate(shopby.member.join.initiate.bind(shopby.member.join));
});

/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6.30
 *
 */

$(() => {
  shopby.my.modifyMember = {
    smsTimer: null,
    emailTimer: null,
    mallJoinConfig: shopby.cache.getMall().mallJoinConfig,
    agreements: null,
    captcha: shopby.helper.captcha(),
    emailCaptcha: shopby.helper.captcha('emailCaptcha'),
    smsCaptcha: shopby.helper.captcha('smsCaptcha'),
    async initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      await this.render();
      this.bindEvents();
    },
    async render() {
      shopby.my.menu.init('#myPageLeftMenu');
      $('#certifyPassword').render(await this.getMemberId());
      this.captcha = this.captcha || shopby.helper.captcha();
    },
    async getMemberId() {
      const profile = await shopby.api.member.getProfile();
      return { memberId: profile.data.memberId };
    },
    bindEvents() {
      $('#btnCertifyCancel').on('click', () => history.back());
      $('#btnPwCertify').on('click', this.certifyPassword.bind(this)).enterKeyup('#confirmPassword');
    },
    async certifyPassword() {
      const $password = $('#confirmPassword');
      const password = $password.val().trim();

      try {
        this._validatePassword(password);
      } catch (error) {
        shopby.alert({ message: '비밀번호를 정확하게 입력해주세요.' }, () => $password.focus());
        return;
      }
      const request = { requestBody: { password } };
      try {
        await this.captcha.submitCode(true);
        await shopby.api.member.postProfileCheckPassword(request);
        $('.my_page_password').hide();
        this.captcha.reset();
      } catch (e) {
        const isInvalidCode = e.code === 'M0306' || e.code === 'CP9001';
        if (isInvalidCode) {
          this.captcha.retry();
          this.captcha.errorHandler(e);
        }
        throw e;
      }
      const userInfo = await shopby.api.member.postProfileNonMasking(request);
      await this.initiateModifyForm(userInfo.data);
    },

    async initiateModifyForm(userInfo) {
      const initTimer = authType =>
        new shopby.helper.timer(
          this._onTimerTicked(authType),
          this._onTimerEnded(authType),
          this._onTimeCleared(authType),
        );
      this.smsTimer = initTimer('sms');
      this.emailTimer = initTimer('email');

      $('#modifyMember').render(await this.getFormData(userInfo));
      this.bindFormEvents();

      if (this.mallJoinConfig.authenticationType === 'AUTHENTICATION_BY_PHONE') {
        window.shopKcpCallback = async (result, key) => {
          if (!result) {
            shopby.alert('본인 인증에 실패하였습니다.');
            return;
          }

          const { data: checkCI } = await shopby.api.member.getProfileCiExists({ queryString: { ci: result.ci } });
          if (checkCI && checkCI.exist) {
            const messageType = checkCI.status === 'WITHDRAWN' ? 'kcpWithdrawn' : 'kcpExistMember';
            shopby.alert(shopby.message[messageType], shopby.goLogin);
          } else if (!checkCI || !checkCI.exist) {
            shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, result);
            this.authKey = key;
            this.updateKcpInfo(result);
          }
        };
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
      }
    },
    async getFormData(userInfo) {
      const { email, birthday, agreedTerms } = userInfo;
      const { mall, mallJoinConfig } = shopby.cache.getMall();

      const [emailId, emailDomain] = email ? email.split('@') : ['', ''];
      const dayFormatter = type => (birthday ? Number(dayjs(birthday).format(type)) : 0);
      const joinTermsAgreements = ['USE', 'PI_COLLECTION_AND_USE_REQUIRED'].concat(agreedTerms);
      this.agreements = await shopby.helper.member.getAgreements(null, null, joinTermsAgreements);

      return {
        mallJoinConfig,
        mallName: mall.mallName,
        memberJoinConfig: shopby.config.member.joinConfig,
        agreements: this.agreements,
        isAllChecked: this.agreements.every(({ checked }) => checked),
        selectOptions: {
          yearList: shopby.helper.member.last120YearsAgo,
          monthList: shopby.helper.member.monthList,
          dayList: shopby.helper.member.dayList,
        },
        userInfo: {
          ...userInfo,
          emailId,
          emailDomain,
          year: dayFormatter('YYYY'),
          month: dayFormatter('M'),
          day: dayFormatter('D'),
        },
      };
    },
    bindFormEvents() {
      // form
      $('#passwordChange').on('click', this.togglePasswordInput);
      $('#memberRegisterForm')
        .on('keyup', 'input', this.changeValidInput.bind(this))
        .on('blur', 'input', this.blurValidInput.bind(this))
        .on('change', 'select', shopby.helper.member.changeSelectedBirth)
        .on('click', '#mobileReAuth', shopby.helper.member.openKcpCallback)
        .on('click', 'button[name="sendAuth"]', this.sendAuthentication.bind(this))
        .on('click', 'button[name="confirmAuth"]', this.confirmAuthentication.bind(this));
      $('#btnPostcode').on('click', this.findAddress.bind(this));

      // terms
      $('#allAgree').on('change', this.onChangeAllAgreed.bind(this));
      $('input:checkbox[name="termItem"]').on('change', this.onChangeTermItem.bind(this));
      $('.agreement_detail').on('click', this.onClickAgreementDetail.bind(this));

      $('#btnCancel').on('click', () => history.back());
      $('#btnModify').on('click', this.modifyMember.bind(this));
    },
    updateKcpInfo({ name, ci, phone, sexCode, birthday }) {
      const [year, month, day] = dayjs(birthday).format('YYYY-M-D').split('-');

      $('#ci').val(ci).prop('disabled', true);
      $('#memberName').val(name).prop('disabled', true);
      $('#mobileNo').val(phone).prop('disabled', true);
      $('select[name="birthYear"]').html(`<option value="${year}" selected>${year}년</option>`).prop('disabled', true);
      $('select[name="birthMonth"]')
        .html(`<option value="${month}" selected>${month}월</option>`)
        .prop('disabled', true);
      $('select[name="birthDay"]').html(`<option value="${day}" selected>${day}일</option>`).prop('disabled', true);
      if (sexCode === '01') {
        $('#sexMan').prop('checked', true);
      } else if (sexCode === '02') {
        $('#sexWoman').prop('checked', true);
      } else {
        $('#sexNon').prop('checked', true);
      }
      $('input[name="sex"]').prop('disabled', true);
      $('#mobileReAuth').text('재인증');
    },
    togglePasswordInput() {
      $('#passwordWrap').show();
    },
    changeValidInput({ key, target }) {
      const { pattern } = target.dataset;
      if (key.includes('Arrow') || !pattern) return;

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
      const $warnMessage = $target.closest('.member_warning').find('.warning_message');
      const { name, value, dataset } = target;
      const resultMessage = await this._validateForm(name, value, dataset.userInfo || null);
      shopby.regex.mobileNo.lastIndex = 0; // test 사용시 lastIndex를 기억하기 때문에 초기화 해줘야 이후 실행이 잘 됨.
      const successValidation = resultMessage.includes('success') || resultMessage === '';
      const errorInput = $target.closest('.member_warning').find('input');

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
      const $warnMessage = $target.closest('.member_warning').find('.warning_message');
      const authType = $target.data('authType');
      const { value, errorMessage, key } = shopby.helper.member.getCurrentAuth(authType);
      const $invalidInput = $target.parents('.member_warning').find(`input[name=${key}]`);

      if (value.length === 0 || value === '@') {
        $warnMessage.text(errorMessage).show();
        $invalidInput.addClass('fail_valid');
        shopby.alert(errorMessage);
        return;
      }
      const $sendButton = $(`.btn_send_${authType}`);
      if ($sendButton.text() === '재인증') {
        $(`.${authType}_box, .auth_${authType}`).find('input').val('');
        $(`input[name="${key}"], input[name="auth_${authType}"]`).attr('disabled', false);
        $sendButton.text('인증번호 발송');
        return;
      }
      if ($invalidInput.attr('class').includes('fail_valid')) {
        shopby.alert($warnMessage.text().split('.')[0]);
        return;
      }
      const usable = $warnMessage.data('usable') || value;
      if (!usable) return;

      const { data } = await shopby.api.auth.postAuthentications({
        requestBody: {
          memberName: $('input[name="memberName"]').val(),
          notiAccount: value,
          type: authType.toUpperCase(),
          usage: authType === 'sms' ? 'CHANGE_MOBILE_NO' : 'CHANGE_EMAIL',
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
      const certificatedNumber = $(`input[name="auth_${authType}"]`).val();
      if (authType === 'email') {
        this.emailCaptcha = this.emailCaptcha || shopby.helper.captcha('emailCaptcha');
      } else if (authType === 'sms') {
        this.smsCaptcha = this.smsCaptcha || shopby.helper.captcha('smsCaptcha');
      }
      try {
        const { value } = shopby.helper.member.getCurrentAuth(authType);
        (await captcha) && captcha.submitCode(true);
        await shopby.api.auth.getAuthentications({
          queryString: {
            notiAccount: value,
            type: authType.toUpperCase(),
            usage: authType === 'sms' ? 'CHANGE_MOBILE_NO' : 'CHANGE_EMAIL',
            certificatedNumber,
          },
        });

        const targetTimer = authType === 'sms' ? this.smsTimer : this.emailTimer;
        targetTimer.clear();
        captcha && captcha.reset();
        $(`.btn_send_${authType}`).show();
      } catch (e) {
        console.error(e);
        if (certificatedNumber.length === 0) {
          shopby.alert('인증번호를 입력해주세요.');
        } else {
          $(`.auth_${authType} .warning_message`).text('올바른 인증번호가 아닙니다.').show();
          if (e.code === 'E0008' || e.code === 'CP9001') {
            captcha && captcha.retry();
            captcha && captcha.errorHandler(e);
          }
        }
      }
    },
    findAddress() {
      shopby.popup('find-address', null, data => {
        if (data.state === 'close') return;
        $('#zipCd').val(data.zipCode);
        $('#address').val(data.address);
        $('#jibunAddress').val(data.jibunAddress);
        shopby.alert('상세주소를 입력해주시기 바랍니다.', () => $('input[name="detailAddress"]').focus());
      });
    },
    onChangeAllAgreed({ target }) {
      $('input:checkbox[name="termItem"]')
        .filter((_, selector) => !$(selector).prop('disabled'))
        .prop('checked', $(target).prop('checked'));
    },
    onChangeTermItem() {
      const checked = this.agreements.length + 1 === $('input[name=termItem]:checked').length;
      $('#allAgree').prop('checked', checked);
    },
    onClickAgreementDetail({ target }) {
      const termKey = $(target).data('term-id');
      const title = $(`label[for=agreeCheckbox-${termKey}]`).text();
      const contents = this.agreements.find(({ key }) => key === termKey).contents;

      shopby.popup('terms', { title, contents }, function (data) {
        if (data.state === 'ok') {
          $(`input:checkbox[id=agreeCheckbox-${termKey}]`).prop('checked', true);
        }
      });
    },
    async modifyMember() {
      const inputWaringMessage = $('.member_warning').find('.warning_message');
      const isValid = shopby.helper.member.checkValidInput(inputWaringMessage);
      const failValidInput = $('.fail_valid').siblings('.warning_message').html();

      try {
        if (!isValid) {
          shopby.alert(failValidInput);
          return;
        }
        shopby.helper.member.submitValidation();
      } catch (error) {
        shopby.alert({ message: error.message });
        return;
      }
      await shopby.api.member.putProfile({ requestBody: this._memberInfo });
      const updateKcp = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.kcpAuth);
      if (updateKcp) {
        await shopby.api.member.postProfileRename({ requestBody: { key: this.authKey } });
      }
      shopby.alert('회원 정보수정되었습니다.', () => location.replace('/pages/my/mypage.html'));
    },

    _validatePassword(password) {
      if (!password) {
        throw new Error('비밀번호를 입력해주세요.');
      }
    },
    _validateForm(type, value, originValue) {
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
          return member.nicknameValidation(value, originValue);
        case 'email':
          return member.emailValidation(originValue);
        case 'mobileNo':
        case 'telephoneNo':
          return member.mobileNoValidation(value);
        default:
          return '';
      }
    },
    get _memberInfo() {
      const certificated = !!($('#authSMS').val() || $('#authEmail').val() || $('#ci').val());
      const joinTermsAgreements = $('input:checkbox[name="termItem"]:checked:not(:disabled)')
        .map(function () {
          const termKey = $(this).data('term-id');
          if (termKey !== 'JOIN_POSSIBLE_AGE') return termKey;
        })
        .get();

      return {
        memberId: $('input[name="memberId"]').val(), //영문6자이상
        password: $('input[name="password"]').val() || null, //영문+숫자+특수문자
        memberName: $('input[name="memberName"]').val(), //이름
        nickname: $('input[name="nickname"]').val(), //닉네임
        email: shopby.helper.member.emailValue, //이메일
        directMailAgreed: $('#directMailAgreed').is(':checked'), //메일 알림 동의 여부 boolean
        telephoneNo: $('input[name="telephoneNo"]').val(), //전화번호 예.023457890
        mobileNo: $('input[name="mobileNo"]').val(), //핸드폰번호 예.01012347890
        smsAgreed: $('#smsAgreed').is(':checked'), //sms 알림 동의 여부 boolean
        pushNotificationAgreed: $('input[name="pushNotificationAgreed"]').is(':checked') || false, //푸시 알림 동의 여부 boolean
        zipCd: $('input[name="zipCd"]').val(), //우편번호
        address: $('input[name="address"]').val(), //도로명 주소
        detailAddress: $('input[name="detailAddress"]').val(), //도로명 상세주소
        jibunAddress: $('input[name="jibunAddress"]').val(), //지번 주소
        jibunDetailAddress: $('input[name="detailAddress"]').val(), //지번 상세주소
        sex: $('input[name="sex"]:checked').val(), //성별
        birthday: this._birthday, //생일 예.19981209
        countryCd: shopby.cache.getMall().mall.countryCode, //국적
        joinTermsAgreements, //약관동의 array
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
        $(`.auth_${authType} .timer`)
          .closest('div')
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

  shopby.start.initiate(shopby.my.modifyMember.initiate.bind(shopby.my.modifyMember));
});

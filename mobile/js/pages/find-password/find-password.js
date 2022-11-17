/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @author hyeyeon-park
 *  @since 2021.7.2
 *
 */

$(() => {
  shopby.member.findPassword = {
    data: {
      userCertification: {
        memberNo: null,
        memberId: null,
        email: null,
        mobileNo: null,
        status: null,
        isCertification: false,
      },
      userCertificationConfirm: {
        authType: null,
        authTypeText: '',
        remainTime: 0,
      },
      userPasswordChange: {
        certificationNumber: null,
      },
      isAuthPhoneConfig: null,
      kcpKey: null,
    },
    captcha: shopby.helper.captcha('captcha'),
    timer: null,
    initiate() {
      this.bindEvents();
    },
    bindEvents() {
      $('#btnMemberCertify').on('click', this.checkId.bind(this));
    },
    renderUserCertification() {
      $('#userIdForm').hide();
      $('#userCertificationConfirm').hide();
      shopby.utils.changeBreadcrumb('본인인증 수단 선택');
      $('#userCertification').render(this.data.userCertification);
      this.bindUserCertificationEvents();
      if (this.timer) {
        this.timer.clear();
      }
    },
    renderUserCertificationConfirm() {
      $('#userCertification').hide();
      shopby.utils.changeBreadcrumb('본인인증 인증번호 확인');
      $('#userCertificationConfirm').render(this.data.userCertificationConfirm);
      this.captcha && this.captcha.render();
      this.bindUserCertificationConfirmEvents();
    },
    renderChangePassword() {
      $('#userCertificationConfirm, #userCertification').hide();
      shopby.utils.changeBreadcrumb('비밀번호 새로 등록');
      $('#userPasswordChange').render(this.data.userPasswordChange);
      this.bindChangePasswordEvents();
    },
    renderComplete() {
      $('#userPasswordChange').hide();
      shopby.utils.changeBreadcrumb('비밀번호 변경 완료');
      $('#completeFindPassword').render();
      this.bindCompleteEvents();
    },
    bindUserCertificationEvents() {
      $('#btnMemberCertifyConfirm').on('click', this.selectCertificationType.bind(this));
    },
    bindUserCertificationConfirmEvents() {
      $('#btnCancel').on('click', this.renderUserCertification.bind(this));
      $('#btnCertifyAgain').on('click', this.sendAuthentication.bind(this));
      $('#btnPasswordReset').on('click', this.resetPassword.bind(this));
    },
    bindChangePasswordEvents() {
      $('#passwordForm')
      .on('keyup', 'input', this.changeValidInput.bind(this))
      .on('blur', 'input', this.blurValidInput.bind(this));
      $('#btnChangePassword').on('click', this.changePassword.bind(this));
    },
    bindCompleteEvents() {
      $('#goLogin').on('click', shopby.goLogin);
    },
    selectCertificationType(e) {
      const authType = $('input[name="authType"]:checked').val();
      switch (authType) {
        case 'MOBILE':
          shopby.helper.member.openKcpCallback(e);
          this.isShopKcpCallback();
          break;
        case 'SMS':
        case 'EMAIL':
          this.sendAuthentication();
          break;
        default:
          break;
      }
    },
    isShopKcpCallback() {
      if (this.data.isAuthPhoneConfig) {
        window.shopKcpCallback = async (result, key) => {
          if (!result) {
            shopby.alert('본인 인증에 실패하였습니다.');
            return;
          }
          this.data.userCertificationConfirm.authType = 'MOBILE';
          this.data.kcpKey = key;
          shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, result);
          this.renderChangePassword();
        };
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
      }
    },

    async checkId() {
      const memberId = $('#memberId').val();
      const validateId = () => {
        if (memberId.length === 0) {
          throw new Error('아이디를 입력해주세요');
        }
      };

      try {
        validateId();
        const { data: accountResult } = await shopby.api.member.getProfilePasswordSearchAccount({
          queryString: { memberId },
        });
        const { authenticationTimeType, authenticationType } = shopby.cache.getMall().mallJoinConfig;
        this.data.isAuthPhoneConfig =
          authenticationTimeType === 'JOIN_TIME' &&
          authenticationType === 'AUTHENTICATION_BY_PHONE' &&
          accountResult.hasCI;
        this.data.userCertification = {
          ...accountResult,
          isCertification: !!(accountResult.email || accountResult.mobileNo || this.data.isAuthPhoneConfig),
          memberId,
          isAuthPhoneConfig: this.data.isAuthPhoneConfig,
        };
        if (accountResult.status === 'DORMANT' || accountResult.status === 'FREEZE') {
          shopby.confirm(
            { message: '입력하신 아이디는 휴면상태의 계정입니다.\n비밀번호를 재설정하고 휴면상태를 해제하시겠습니까?' },
            function ({ state }) {
              if (state === 'ok') {
                shopby.member.findPassword.renderUserCertification();
              } else {
                this.data.userCertification = null;
              }
            },
          );
        } else {
          this.renderUserCertification();
        }
      } catch (error) {
        if (error.code === 'M0010') {
          $('input[name="memberId"]')
          .siblings('.warning_message')
          .html(`<strong>회원정보를 찾을 수 없습니다.</strong>`)
          .show();
        }
      }
    },
    async sendAuthentication() {
      const authType = $('input[name="authType"]:checked').val();
      const typeMessage = {
        EMAIL: '메일이 발송되었습니다.',
        SMS: 'SMS가 발송되었습니다.',
      };
      const authTypeText = {
        EMAIL: '이메일',
        SMS: 'SMS',
      };

      const { data } = await shopby.api.auth.postAuthentications({
        requestBody: {
          memberNo: this.data.userCertification.memberNo,
          type: authType,
          usage: 'FIND_PASSWORD',
        },
      });
      this.data.userCertificationConfirm = data;
      shopby.alert(typeMessage[authType], () => {
        this.data.userCertificationConfirm.authType = authType;
        this.data.userCertificationConfirm.authTypeText = authTypeText[authType];
        this.renderUserCertificationConfirm();
      });
      this.timer = new shopby.helper.timer(this._onTimerTicked, this._onTimerEnded);
      this.timer.start(this.data.userCertificationConfirm.remainTime);
      $('#guideMsg').hide();
    },
    async resetPassword() {
      const certifyCode = $('input[name="inputCertify"]').val();

      const validateCertifyCode = () => {
        if (certifyCode.length === 0) {
          throw new Error('인증번호를 입력해주세요');
        }
      };

      try {
        validateCertifyCode();
      } catch (e) {
        shopby.alert(e.message);
        return;
      }

      try {
        await this.initCaptcha();
        await this.captcha.submitCode();
        await shopby.api.auth.getAuthentications({
          queryString: {
            memberNo: this.data.userCertification.memberNo,
            type: this.data.userCertificationConfirm.authType,
            usage: 'FIND_PASSWORD',
            certificatedNumber: certifyCode,
          },
        });

        shopby.alert('인증되었습니다.', () => {
          this.data.userPasswordChange.certificationNumber = certifyCode;
          this.renderChangePassword();
          this.captcha.reset();
          this.captcha = shopby.helper.captcha('captcha');
        });
      } catch (error) {
        if (error && error.status === 401 && error.path.includes('authentications')) {
          shopby.alert(error.message);
        }
        if (error.code === 'E0008' || error.code === 'CP9001') {
          this.captcha.retry();
          this.captcha.errorHandler(error);
        }
      }
    },
    initCaptcha() {
      this.captcha = this.captcha || shopby.helper.captcha('captcha');
    },
    changeValidInput({ key, target }) {
      const { pattern } = target.dataset;
      if (key.includes('Arrow') || !pattern) return;

      const validInput = target.value.replace(shopby.regex[pattern], '');
      $(target).val(validInput);
    },
    blurValidInput({ target }) {
      const $target = $(target);
      const $warnMessage = $target.closest('.member_warning').find('.warning_message');
      const { name, value } = $target[0];
      const { member } = shopby.helper;
      let resultMessage = '';

      switch (name) {
        case 'password':
          resultMessage = member.passwordValidation(value);
          break;
        case 'passwordChk':
          resultMessage = member.passwordChkValidation(value);
          break;
        default:
          resultMessage = '';
      }
      const successValidation = resultMessage.includes('success') || resultMessage === '';
      // if (!successValidation) {
      //   $target[0].focus();
      // }
      resultMessage.length > 0 ? $warnMessage.text(shopby.message[resultMessage]).show() : $warnMessage.hide();
      $warnMessage.data('usable', successValidation);
    },
    async changePassword() {
      const password = $('input[name="password"]').val();
      const inputWaringMessage = $('.member_warning').find('.warning_message');
      const isValid = shopby.helper.member.checkValidInput(inputWaringMessage);

      try {
        this.checkPasswordValidation(password);
        if (!isValid) return;
      } catch (error) {
        shopby.alert(error.message);
        return;
      }
      const request = {
        requestBody: {
          findMethod: this.data.userCertificationConfirm.authType,
          memberId: this.data.userCertification.memberId,
          newPassword: password,
          certificationNumber: this.data.userPasswordChange.certificationNumber,
          key: this.data.kcpKey,
        },
      };
      await shopby.api.member.postProfileChangePasswordAfterCert(request);
      if (this.data.userCertification.status === 'DORMANT' || this.data.userCertification.status === 'FREEZE') {
        await shopby.api.member.putProfileDormancy({ requestBody: { authType: 'NONE' } });
      }
      this.renderComplete();
    },
    checkPasswordValidation(password) {
      const passwordChk = $('input[name="passwordChk"]').val();
      if (password.length === 0 || passwordChk.length === 0) {
        throw new Error('비밀번호(비밀번호 확인)를 입력해주세요.');
      }
      if (password !== passwordChk) {
        throw new Error('비밀번호와 비밀번호확인 값이 일치하지 않습니다.');
      }
    },

    _onTimerTicked(time) {
      $('.timer').html(time);
    },
    _onTimerEnded() {
      $('.timer').html('경과되었습니다.[인증번호 다시받기]를 클릭하여 발급된 인증번호를 입력해 주세요.');
      $('#guideMsg').show();
    },
  };

  shopby.start.initiate(shopby.member.findPassword.initiate.bind(shopby.member.findPassword));
});

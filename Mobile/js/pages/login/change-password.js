/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.5
 */

$(() => {
  const currentPassword = $('#oldPassword');
  const newPassword = $('#password');
  const newPasswordChk = $('#passwordChk');

  shopby.member.changePassword = {
    initiate() {
      if (!shopby.logined()) {
        shopby.goLogin();
      }
      this.render();
      this.bindEvents();
    },
    render() {
      $('#changePasswordTitle').render({
        mallName: shopby.cache.getMall().mall.mallName,
      });
    },
    bindEvents() {
      $('.new_password')
        .on('keyup', 'input', this.changeValidInput.bind(this))
        .on('blur', 'input', this.blurValidInput.bind(this));

      $('#btnLater').on('click', this.changeNextTime);
      $('#btnChange').on('click', this.onClickChangePassword.bind(this));
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

      if (!(resultMessage.includes('success') || resultMessage === '')) {
        $target[0].focus();
      }
      resultMessage.length > 0 ? $warnMessage.text(shopby.message[resultMessage]).show() : $warnMessage.hide();
    },
    async changeNextTime() {
      await shopby.api.member.putProfilePassword({ requestBody: { willChangeNextTime: true } });
      shopby.alert('해당 안내는 90일 뒤에 다시 안내됩니다.', shopby.goHome);
    },
    async onClickChangePassword() {
      try {
        await shopby.api.member.postProfileCheckPassword({ requestBody: { password: currentPassword.val() } });
        this._checkPasswordValue();
        await shopby.api.member.putProfilePassword({
          requestBody: {
            currentPassword: currentPassword.val(),
            newPassword: newPassword.val(),
            willChangeNextTime: false,
          },
        });
        shopby.alert('회원님의 비밀번호가 안전하게 변경되었습니다.', () => {
          shopby.cache.removeAccessToken();
          shopby.goLogin();
        });
      } catch (error) {
        const message = error.code === 'M0034' ? '현재 비밀번호가 맞지 않습니다.' : error.message;
        shopby.alert(message, () => {
          if (error.code === 'M0034') {
            currentPassword.focus();
          }
        });
      }
    },

    _checkPasswordValue() {
      const newPasswordValue = newPassword.val();
      const newPasswordChkValue = newPasswordChk.val();
      if (newPasswordValue === '') {
        newPassword.focus();
        throw new Error('새 비밀번호를 입력해주세요.');
      }
      if (newPasswordChkValue === '') {
        newPasswordChk.focus();
        throw new Error('새 비밀번호 확인을 입력해주세요.');
      }
      if (newPasswordValue !== newPasswordChkValue) {
        throw new Error(shopby.message.notEqualNewPassword);
      }
      if (newPasswordValue === currentPassword.val()) {
        throw new Error('현재 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.');
      }
    },
  };

  shopby.start.initiate(shopby.member.changePassword.initiate.bind(shopby.member.changePassword));
});

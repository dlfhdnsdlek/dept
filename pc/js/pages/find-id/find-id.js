/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @author hyeyeon-park
 *  @since 2021.7.1
 *
 */

$(() => {
  shopby.member.findId = {
    isAuthPhoneConfig: false,
    kcpKey: null,
    kcpAuthUserName: '',
    initiate() {
      this.render();
      this.bindEvents();
    },
    bindEvents() {
      $('input[name="findIdFl"]').on('change', this.changeFindType.bind(this));
      $('#findIdForm').on('keyup', 'input', this.changeValidInput);
      $('#btnFindId').on('click', this.findId.bind(this)).enterKeyup('#userDomain');
      $('#btnGoFindPw').on('click', this.goFindPw);
      $('#btnGoLogin').on('click', shopby.goLogin.bind(shopby));
      $('#btnAuthKCP').on('click', shopby.helper.member.openKcpCallback);
    },
    render() {
      const { authenticationTimeType, authenticationType } = shopby.cache.getMall().mallJoinConfig;
      this.isAuthPhoneConfig =
        authenticationTimeType === 'JOIN_TIME' && authenticationType === 'AUTHENTICATION_BY_PHONE';
      $('#findIdBox').render({ isAuthPhoneConfig: this.isAuthPhoneConfig });
    },
    changeFindType({ target }) {
      const checkedVal = $(target).data('find-type');
      switch (checkedVal) {
        case 'EMAIL':
          $('#userCellPhoneNum,#btnAuthKCP').hide().val('');
          $('#userName, #email, #btnFindId').show();
          break;
        case 'SMS':
          $('input[name="email"]').val('');
          $('#email,#btnAuthKCP').hide();
          $('#userName ,#userCellPhoneNum,#btnFindId').show();
          break;
        case 'MOBILE':
          $('#email, #userCellPhoneNum, #userName, #btnFindId').hide().val('');
          $('#btnAuthKCP').show();
          this.isShopKcpCallback();
          break;
        default:
          break;
      }
    },
    isShopKcpCallback() {
      if (this.isAuthPhoneConfig) {
        window.shopKcpCallback = async (result, key) => {
          if (!result) {
            shopby.alert('본인 인증에 실패하였습니다.');
            return;
          }
          this.kcpKey = key;
          this.kcpAuthUserName = result.name;
          shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, result);
          this.findId();
        };
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
      }
    },
    changeValidInput({ key, target }) {
      const { pattern } = target.dataset;
      if ((key && key.includes('Arrow')) || !pattern) return;

      const validInput = target.value.replace(shopby.regex[pattern], '');

      $(target).val(validInput);
    },
    async findId(event) {
      event && event.preventDefault();

      try {
        const findMethod = $('input[name="findIdFl"]:checked').data('find-type');
        if (findMethod !== 'MOBILE') {
          this._validateForm();
        }

        const { data: findIdResult } = await shopby.api.member.postProfileFindId({
          requestBody: {
            findMethod,
            memberName: $('#userName').val(),
            mobileNo: $('#userCellPhoneNum').val(),
            email: shopby.helper.member.emailValue,
            key: this.kcpKey,
          },
        });
        if (findIdResult.length === 0) {
          $('#cautionMsg').html('회원정보를 찾을 수 없습니다.').show();
          return;
        }
        $('#findIdBox').hide();
        $('#findCompleteBox').html(this._getFindCompleteTemplate(findIdResult));
        $('#resultBox').show();
      } catch (error) {
        $('#cautionMsg').html(error.message).show();
      }
    },
    goFindPw(event) {
      event && event.preventDefault();
      window.location.href = '/pages/find-password/find-password.html';
    },
    _validateForm() {
      if ($('#userName').val().length === 0) {
        throw new Error('이름을 입력해주세요.');
      }

      const findIdType = $('input[name="findIdFl"]:checked').val();
      const messages = {
        email: {
          value: shopby.helper.member.emailValue,
          must: '이메일을 입력해주세요.',
          invalid: '입력된 이메일은 잘못된 형식입니다.',
        },
        mobileNo: {
          value: $('#userCellPhoneNum').val(),
          must: '휴대폰번호를 입력해주세요.',
          invalid: '11~12자 이내로 입력해주세요.',
        },
      };

      const value = messages[findIdType].value;
      if (value.length === 0 || value === '@') {
        throw new Error(messages[findIdType].must);
      } else if (!shopby.regex[findIdType].test(value)) {
        throw new Error(messages[findIdType].invalid);
      }
    },
    _getFindCompleteTemplate(user) {
      const userName = $('#userName').val() === '' ? this.kcpAuthUserName : $('#userName').val();
      const Ids = user.map(user => {
        const dormant = user.status === 'DORMANT' ? '<strong>(휴면)</strong>' : '';
        return `<strong>${user.id}</strong>${dormant}`;
      });
      return `<p>${userName} 회원님의 아이디입니다.<br>${Ids.join('')}</p>`;
    },
  };

  shopby.start.initiate(shopby.member.findId.initiate.bind(shopby.member.findId));
});

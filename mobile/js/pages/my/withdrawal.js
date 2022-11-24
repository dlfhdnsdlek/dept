/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.6
 *
 */

$(() => {
  shopby.my.withdrawal = {
    $reason: $('#reason'),
    async initiate() {
      const isWithdrawalProcess = this.checkIsWithdrawalProcess();
      if (isWithdrawalProcess) {
        this.runWithdrawalProcess();
      }
      await this.render();
      this.bindEvents();
    },
    checkIsWithdrawalProcess() {
      const isOauthWithdrawalProcess = shopby.localStorage.getItemWithExpire(
        shopby.cache.key.member.isOauthWithdrawalProcess,
      );
      return Boolean(isOauthWithdrawalProcess);
    },
    async render() {
      const { data: userInfo } = await shopby.api.member.getProfile();
      if (userInfo.memberType === 'MALL') {
        this.initiateWithdrawalForm();
      } else {
        $('#certifyOpenId').render({
          providerTypes: userInfo.providerTypes.map(type => type.toLowerCase()),
          providerType: userInfo.providerType.toLowerCase(),
        });
      }
    },
    bindEvents() {
      $('.btnLoginSns').on('click', this.certifyOpenId.bind(this));
    },
    async certifyOpenId(event) {
      event.preventDefault();
      const provider = `ncp_${event.currentTarget.dataset.provider}`;
      const data = await shopby.helper.login.fetchOauthLogin(provider);
      shopby.helper.login.openLoginPopup(data);
      shopby.localStorage.setItemWithExpire(shopby.cache.key.member.isOauthWithdrawalProcess, true); //탈퇴페이지 인지
    },

    async runWithdrawalProcess() {
      const isPrevWithdrawalPage = document.referrer.includes('/pages/my/withdrawal');
      if (isPrevWithdrawalPage) {
        shopby.localStorage.removeItem(shopby.cache.key.member.isOauthWithdrawalProcess);
        return;
      }
      const isComparedUserInfo = shopby.localStorage.getItem(shopby.cache.key.member.isOauthWithdrawalCompareInfo);

      const { data } = await shopby.api.member.getProfile();
      shopby.localStorage.removeItem(shopby.cache.key.member.isOauthWithdrawalProcess);

      if (isComparedUserInfo) {
        shopby.alert('현재 로그인 한 간편로그인 계정과 다릅니다. 쇼핑몰 계정과 동일하게 로그인해주세요.');
        shopby.localStorage.removeItem(shopby.cache.key.member.isOauthWithdrawalCompareInfo);
        return;
      }
      if (data) {
        shopby.alert('인증이 완료되었습니다.', this.initiateWithdrawalForm.bind(this));
        return;
      }
      location.href = '/pages/my/withdrawal.html';
      shopby.alert('간편 인증에 실패하였습니다.');
    },

    async initiateWithdrawalForm() {
      await this.renderWithdrawalForm();
      this.bindEventsWithdrawalForm();
    },
    async renderWithdrawalForm() {
      $('#certifyOpenId').hide();
      const {
        data: { withdrawal_guide },
      } = await shopby.api.manage.getTerms({
        queryString: { termsTypes: 'WITHDRAWAL_GUIDE' },
      });
      $('#withdrawalForm').render({ withdrawalGuide: withdrawal_guide });
      this.$reason = $('#reason');
    },
    bindEventsWithdrawalForm() {
      this.$reason.on('keyup', this.changeValidInput);
      $('#btnWithdrawal').on('click', this.onClickWithdrawal.bind(this));
    },
    changeValidInput({ target, key }) {
      if (key && key.includes('Arrow')) return;
      const pattern = shopby.regex.noCommonSpecial;
      const value = target.value.replace(pattern, '');

      $(target).val(value);
    },
    async onClickWithdrawal() {
      try {
        await this._validateWithdrawal();
        await this._deleteMember();
      } catch (error) {
        if (error.name === 'confirmError') {
          shopby.confirm({ message: error.message }, data => {
            if (data.state === 'ok') {
              this._deleteMember();
            }
          });
          return;
        }
        shopby.alert(error.message, () => {
          if (error.name === 'reasonError') {
            this.$reason.focus();
          }
        });
      }
    },

    async _deleteMember() {
      await shopby.api.member.deleteProfile({ queryString: { reason: this.$reason.val() } });
      shopby.alert('탈퇴가 완료되었습니다.', () => {
        shopby.cache.removeAccessToken();
        shopby.goHome();
      });
    },
    _validatePassword(password) {
      if (!password) {
        throw new Error('비밀번호를 입력해주세요.');
      }
    },
    async _validateWithdrawal() {
      const reason = this.$reason.val().length > 0;
      if (!reason) {
        this._throwCustomNameError('탈퇴 사유를 입력해주세요.', 'reasonError');
      }

      const dropoutAgree = $('input:checkbox[name="dropoutAgree"]').is(':checked');
      if (!dropoutAgree) {
        throw new Error('회원탈퇴 동의 후 탈퇴가 가능합니다.');
      }

      const { data: summaryProfile } = await shopby.api.member.getProfileSummary();
      const {
        productPrepareCnt,
        deliveryIngCnt,
        deliveryPrepareCnt,
        payDoneCnt,
        cancelProcessingCnt,
        exchangeProcessingCnt,
        returnProcessingCnt,
        deliveryDoneCnt,
      } = summaryProfile.orderCountByStatus;
      const hasBenefit = summaryProfile.usableCouponCnt > 0 || summaryProfile.accumulations.totalAmt > 0;
      const hasOrder =
        payDoneCnt > 0 || deliveryPrepareCnt > 0 || productPrepareCnt > 0 || deliveryIngCnt > 0 || deliveryDoneCnt > 0;
      const hasClaim = cancelProcessingCnt > 0 || exchangeProcessingCnt > 0 || returnProcessingCnt > 0;
      const hasProcessOrder = hasOrder || hasClaim;
      const hasBenefitAndProcessOrder = hasBenefit && hasProcessOrder;
      //쿠폰,적립금,진행중인 주문건, 클레임이 있는 경우
      if (hasBenefitAndProcessOrder) {
        const message = `진행중인 주문건이 있습니다. 탈퇴 시 쇼핑몰에 접속 및 주문내역 확인이 불가하 며 보유중인 적립금 및 쿠폰은 모두 삭제됩니다. 탈퇴하시겠습니까? <br>사용가능한 쿠폰 ${summaryProfile.usableCouponCnt}장 / 마일리지 ${summaryProfile.accumulations.totalAmt}원`;
        this._throwCustomNameError(message);
      }
      //쿠폰 또는 적립금이 있는 경우
      if (hasBenefit) {
        const message = `탈퇴 시 쇼핑몰에 접속 불가하며 보유중인 적립금 및 쿠폰은 모두 삭제됩니다. 탈퇴하시겠습니까? <br>사용가능한 쿠폰 ${summaryProfile.usableCouponCnt}장 / 마일리지 ${summaryProfile.accumulations.totalAmt}원`;
        this._throwCustomNameError(message);
      }
      //진행중인 주문건 또는 클레임이 있는 경우
      if (hasProcessOrder) {
        const message =
          '진행중인 주문건이 있습니다. 탈퇴 시 쇼핑몰 접속 및 주문내역 확인이 불가합니다. 탈퇴하시겠습니까?';
        this._throwCustomNameError(message);
      }
      // 진행중주문, 적립금, 쿠폰 없는 경우
      if (!hasBenefit && !hasProcessOrder) {
        const message = `탈퇴 시 쇼핑몰에 접속 불가하며 보유중인 적립금 및 쿠폰은 모두 삭제됩니다. 탈퇴하시겠습니까?`;
        this._throwCustomNameError(message);
      }
    },
    _throwCustomNameError(message, name = 'confirmError') {
      const error = new Error(message);
      error.name = name;
      throw error;
    },
  };

  shopby.start.initiate(shopby.my.withdrawal.initiate.bind(shopby.my.withdrawal));
});

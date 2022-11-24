/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.6.23
 *
 */

$(() => {
  shopby.member.joinAgreement = {
    isAuthPhoneConfig: false,
    kcpAuthComplete: false,
    agreements: null,
    joinTermsAgreements: shopby.utils.getUrlParam('terms'),
    async initiate() {
      await this.render();
      this.bindEvents();
      this.initJoinTermsAgreements();

      if (this.isAuthPhoneConfig) {
        const shopKcpCallback = async result => {
          if (!result || (result && result.fail)) {
            shopby.alert('본인 인증에 실패하였습니다.');
            return;
          }
          const { data: checkCI } = await shopby.api.member.getProfileCiExists({ queryString: { ci: result.ci } });
          if (checkCI && checkCI.exist) {
            const messageType = checkCI.status === 'WITHDRAWN' ? 'kcpWithdrawn' : 'kcpExistMember';
            shopby.alert(shopby.message[messageType], shopby.goLogin);
          } else if (!checkCI || !checkCI.exist) {
            this.kcpAuthComplete = true;
            shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, result);
            this.onClickNextButton();
          }
        };
        const kcpProfile = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.kcpAuth);
        kcpProfile && (await shopKcpCallback(kcpProfile));
      } else {
        shopby.localStorage.removeItem(shopby.cache.key.member.kcpAuth);
      }
    },
    initJoinTermsAgreements() {
      this.joinTermsAgreements
        .split(',')
        .forEach(termKey => $(`input:checkbox[id=agreeCheckbox-${termKey}]`).prop('checked', true));

      this.onChangeTermItem();
    },
    async render() {
      $('#joinAgreement').render(await this.getData());
    },
    async getData() {
      const { mallJoinConfig, mall } = shopby.cache.getMall();
      const { authenticationTimeType, authenticationType } = mallJoinConfig;
      const { mallName } = mall;
      this.isAuthPhoneConfig =
        authenticationTimeType === 'JOIN_TIME' && authenticationType === 'AUTHENTICATION_BY_PHONE';
      this.agreements = await shopby.helper.member.getAgreements();

      return {
        mallName,
        isAuthPhoneConfig: this.isAuthPhoneConfig,
        agreements: this.agreements,
      };
    },
    bindEvents() {
      $('#allAgree').on('change', this.onChangeAllAgreed.bind(this));
      $('input:checkbox[name="termItem"]').on('change', this.onChangeTermItem.bind(this));
      $('.agreement_detail').on('click', this.onClickAgreementDetail.bind(this));
      $('#nextStepBtn').on('click', this.onClickNextButton.bind(this));
      $('#btnAuthKCP').on('click', this.moveKcpCertify.bind(this))
    },
    moveKcpCertify(e) {
      e.preventDefault()
      location.href = shopby.helper.member.getKcpCallbackUrl()
    },
    onChangeAllAgreed({ target }) {
      $('input:checkbox[name="termItem"]').prop('checked', $(target).prop('checked'));
      this.onChangeTermItem();
    },
    onChangeTermItem() {
      window.history.pushState(null, document.title, `/pages/join/agreement.html?${this._checkedTerms()}`);
      const checked = this.agreements.length + 1 === $('input[name=termItem]:checked').length;
      $('#allAgree').prop('checked', checked);
    },
    onClickAgreementDetail(event) {
      event.stopPropagation();
      const target = event.target;
      const termKey = $(target).data('term-id');
      const title = $(`label[for=agreeCheckbox-${termKey}]`).text();
      const contents = this.agreements.find(({ key }) => key === termKey).contents;

      shopby.popup('terms', { title, contents }, data => {
        if (data.state === 'ok') {
          $(`input:checkbox[id=agreeCheckbox-${termKey}]`).prop('checked', true);
          this.onChangeTermItem();
        }
      });
    },
    onClickNextButton() {
      if (this.isAuthPhoneConfig && !this.kcpAuthComplete) {
        shopby.alert({ message: '본인인증을 진행해주세요.' });
        return;
      }
      if (this.isAuthPhoneConfig) {
        const { birthday } = shopby.localStorage.getItemWithExpire(shopby.cache.key.member.kcpAuth);
        const today = dayjs();
        if (today.diff(dayjs(birthday), 'year', true) < 14) {
          shopby.popup('age-restrict-guide');
          return;
        }
      }

      if (!this._validateTerms()) return;
      location.replace(`/pages/join/join.html?${this._checkedTerms()}`);
    },

    _checkedTerms() {
      const checkedTerms = $('input:checkbox[name="termItem"]:checked')
        .map(function () {
          return $(this).data('term-id');
        })
        .get()
        .join();
      const params = new URLSearchParams();
      params.set('terms', checkedTerms);
      return params.toString();
    },

    /**
     * @return boolean
     */
    _validateTerms() {
      const requiredAgreement = this.agreements.filter(({ required }) => required);
      const checkRequired = requiredAgreement.every(({ key }) => $(`#agreeCheckbox-${key}`).is(':checked'));
      const checkPossibleAge = $('#agreeCheckbox-JOIN_POSSIBLE_AGE').is(':checked');

      const requiredAgreementSuccess = checkRequired && checkPossibleAge;
      const mustCheckMessage = $('.join_certify_box');
      requiredAgreementSuccess ? mustCheckMessage.hide() : mustCheckMessage.show();
      return requiredAgreementSuccess;
    },
  };

  shopby.start.initiate(shopby.member.joinAgreement.initiate.bind(shopby.member.joinAgreement));
});

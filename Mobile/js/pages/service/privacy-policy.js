$(() => {
  shopby.service.privacyPolicy = {
    $termsSelectBox: null,
    data: {
      termsTypes: 'PI_PROCESS',
      termsNo: shopby.utils.getUrlParam('termsNo', ''),
      termsContents: null,
      termsHistory: null,
      effectiveHistoryIdx: null,
    },
    async initiate() {
      await this._getTermsHistory();
      this.render();
      this.bindEvents();
    },
    render() {
      $('.content_box').render({
        termsContents: this.data.termsContents,
        termsHistory: this.data.termsHistory,
        showsHistory: this.data.termsHistory.length > 1,
      });
      this.$termsSelectBox = $('.terms_history');
      this.$termsSelectBox.val(this.data.termsNo).prop('selected', true);
    },
    bindEvents() {
      this.$termsSelectBox.on('change', this._selectOtherTerms.bind(this));
    },
    _selectOtherTerms({ target }) {
      location.href = `/pages/service/privacy-policy.html?termsTypes=${this.data.termsTypes}&termsNo=${target.value}`;
      $(target).val(target.value).prop('selected', true);
    },
    async _getTermsHistory() {
      const request = { queryString: { termsType: this.data.termsTypes, futureDaysToShow: 7 } };
      const { data: termsHistory } = await shopby.api.manage.getTermsHistory(request);
      this.data.termsHistory = termsHistory;

      await this._getHistory(this.data.termsHistory);
    },
    async _getHistory(termsHistory) {
      if (termsHistory) {
        this.data.effectiveHistoryIdx = this._getEffectiveHistoryIdx(termsHistory);

        if (Number(this.data.termsNo) === 0) {
          this.data.termsNo = termsHistory[this.data.effectiveHistoryIdx].termsNo;
        }
        await this._getTermsItemContents();
      }
    },
    async _getTermsItemContents() {
      const request = { pathVariable: { termsNo: this.data.termsNo } };
      const { data: termsItem } = await shopby.api.manage.getTermsTermsNo(request);
      this.data.termsContents = termsItem.contents;
    },
    _isInEffect(terms) {
      const today = dayjs().format('YYYY-MM-DD');
      const isSame = dayjs(today).isSame(dayjs(terms.enforcementDate).format('YYYY-MM-DD'));
      const isAfter = dayjs(today).isAfter(dayjs(terms.enforcementDate).format('YYYY-MM-DD'));
      return isSame || isAfter;
    },
    _getEffectiveHistoryIdx(history) {
      return history.findIndex(this._isInEffect);
    },
  };

  shopby.start.initiate(shopby.service.privacyPolicy.initiate.bind(shopby.service.privacyPolicy));
});

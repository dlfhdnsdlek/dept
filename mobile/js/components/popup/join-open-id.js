(() => {
  class JoinOpenId {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;

      this.getTerms().then(() => {
        this.render($parent);
        this.bindEvents();
      });
    }

    async getTerms() {
      const usedTerms = await shopby.helper.member.getAgreements();

      this.option.allTerms = usedTerms;
      this.option.requiredTerms = usedTerms.filter(({ required }) => required);
      this.option.optionalTerms = usedTerms.filter(({ required }) => !required);
    }

    render($parent) {
      const compiled = Handlebars.compile($('#joinPopupTemplate').html());
      this.$el = $(compiled(this.option));
      $parent.append(this.$el);
    }

    bindEvents() {
      this.$el
        .on('click', '.agreement_detail', this._openDetailTerm.bind(this))
        .on('click', '.btnCloseLayer', this._closeButtonEvent.bind(this))
        .on('change', '#allAgree', this.onChangeAllAgreed.bind(this))
        .on('change', 'input:checkbox[name="termItem"]', this.onChangeTermItem.bind(this));
    }

    _openDetailTerm({ target }) {
      const termKey = $(target).data('term-id');
      const { label, contents } = [...this.option.optionalTerms, ...this.option.requiredTerms].find(
        ({ key }) => key === termKey,
      );

      shopby.popup('terms', { title: label, contents }, data => {
        if (data.state === 'ok') {
          $(`input:checkbox[id=agreeCheckbox-${termKey}]`).prop('checked', true);
        }
      });
    }
    _closeButtonEvent(event) {
      const actionType = $(event.currentTarget).data('action-type') || 'negative';
      if (actionType === 'positive') {
        if (!this._validateTerms()) return;
        const agreedTerms = $('input:checkbox[name="termItem"]:checked')
          .map((_, target) => $(target).data('term-id'))
          .get()
          .concat(this.option.allTerms.map(({ key }) => key))
          .filter((value, index, arr) => arr.indexOf(value) === index && value !== 'JOIN_POSSIBLE_AGE');
        //NOTE: JOIN_POSSIBLE_AGE 필터 이유 - BE에서 Enum정의가 되어있지 않음

        this.close({ state: 'ok', agreedTerms });
      } else {
        this.close({ state: 'close' });
      }
    }
    onChangeAllAgreed({ target }) {
      $('input:checkbox[name="termItem"]').prop('checked', $(target).prop('checked'));
      this.onChangeTermItem();
    }
    onChangeTermItem() {
      window.history.pushState(null, document.title, `/pages/join/agreement.html?${this._checkedTerms()}`);
      const checked = this.option.allTerms.length + 1 === $('input[name=termItem]:checked').length;
      //NOTE: JOIN_POSSIBLE_AGE가 allTerms에 미존재 하기에 +1
      $('#allAgree').prop('checked', checked);
    }

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
    }
    _validateTerms() {
      const checkRequired = this.option.requiredTerms.every(({ key }) => $(`#agreeCheckbox-${key}`).is(':checked'));
      const checkPossibleAge = $('#agreeCheckbox-JOIN_POSSIBLE_AGE').is(':checked');

      const isCheckRequiredAgreements = checkRequired && checkPossibleAge;
      const $mustCheckMessage = $('.join_certify_box');
      isCheckRequiredAgreements ? $mustCheckMessage.hide() : $mustCheckMessage.show();
      return isCheckRequiredAgreements;
    }
  }
  shopby.registerPopupConstructor('join-open-id', JoinOpenId);
})();

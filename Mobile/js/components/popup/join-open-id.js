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
        .on('click', '.btnCloseLayer', this._closeButtonEvent.bind(this));
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
        const agreeTerms = $('input:checkbox[name="termItem"]:checked')
          .map((_, target) => $(target).data('term-id'))
          .get()
          .concat(this.option.requiredTerms.map(({ key }) => key))
          .join();
        this.close({ state: 'ok', agreeTerms });
      } else {
        this.close({ state: 'close' });
      }
    }
  }

  shopby.registerPopupConstructor('join-open-id', JoinOpenId);
})();

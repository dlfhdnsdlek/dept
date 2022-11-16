$(() => {
  shopby.service.guide = {
    data: {
      termsTypes: 'ACCESS_GUIDE',
      termsContents: null,
    },
    async initiate() {
      await this._getTermsContents();
      this.render();
    },
    render() {
      $('.content_box').render({
        termsContents: this.data.termsContents,
      });
    },
    async _getTermsContents() {
      const request = { queryString: { termsTypes: this.data.termsTypes } };
      const { data: terms } = await shopby.api.manage.getTerms(request);
      this.data.termsContents = terms[this.data.termsTypes.toLowerCase()].contents;
    },
  };

  shopby.start.initiate(shopby.service.guide.initiate.bind(shopby.service.guide));
});

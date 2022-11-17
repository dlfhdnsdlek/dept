/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Haekyu Cho
 * @since 2021-06-23
 */
(() => {
  class FindAddress {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#findAddressPopupTemplate').html());
      this.$el = $(compiled(option));

      this.option = option;
      this.callback = callback;
      this.keyword = '';

      $parent.append(this.$el);

      this.bindEvents();
      this.page = new shopby.pagination(this.fetchAddressesWithPaging.bind(this), '#addressPagination');
    }

    bindEvents() {
      this.$el
        .on('click', '#searchAddressBtn', this._onClickSearchBtn.bind(this))
        .on('keyup', '#addressKeyword', key => {
          if (key.code === 'Enter') {
            this._onClickSearchBtn();
          }
        })
        .on('click', '#addressTemplate li', ({ currentTarget }) => {
          this.$el.remove();

          const { address, jibunAddress, zipCode } = currentTarget.dataset;
          this.callback({ address: address, jibunAddress: jibunAddress, zipCode: zipCode });
        });
    }

    _onClickSearchBtn() {
      try {
        $('#tip').hide();
        this.page.pageNumber = 1;
        this.keyword = $('#addressKeyword').val() || '';

        if (!this.keyword) {
          $('#addressTemplate').hide();
          this.throwing('검색어를 입력해주세요.');
        }

        this.fetchAddressesWithPaging(this.keyword);
      } catch (e) {
        console.error(e.message);
      }
    }

    async fetchAddressesWithPaging() {
      const { data } = await shopby.api.manage.getAddressesSearch({
        queryString: {
          keyword: this.keyword.trim(),
          pageNumber: this.page.pageNumber,
          pageSize: this.page.pageSize,
        },
      });

      const empty = shopby.utils.isArrayEmpty((data && data.items) || []);
      $('#addressTemplate,#noResult').toggle(empty);

      if (data && data.error) {
        this.throwing('API 호출 실패');
      }

      this.render(data);
    }

    render(result) {
      const empty = shopby.utils.isArrayEmpty((result && result.items) || []);

      if (empty) {
        $('#addressTemplate').empty();
        $('#noResult').show();
      } else {
        $('#addressTemplate').empty().render(result.items);
        $('#noResult').hide();

        this.page.render(result.totalCount);
      }
    }

    throwing(message) {
      $('#addressTemplate').empty();
      $('#noResult').show();

      throw new Error(message);
    }
  }

  shopby.registerPopupConstructor('find-address', FindAddress);
})();

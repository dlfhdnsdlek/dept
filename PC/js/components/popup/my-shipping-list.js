/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.7
 */
(() => {
  class MyShippingList {
    constructor($parent, option, callback) {
      this.$parent = $parent;
      this.option = option;
      this.callback = callback;

      this.pageSize = 5;
      this.shippingAddress = {};
      this.displayShippingAddress = [];

      this.init($parent, option);
    }

    async init($parent, option) {
      const compiled = Handlebars.compile($('#myShippingListPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
      this.setPagination();

      await this.fetchShippingAddress();
      this.paging();
      this.bindEvents();
    }

    setPagination() {
      $('#pagination').children().remove();
      this.page = new shopby.pagination(this.paging.bind(this), '#pagination', this.pageSize);
    }

    async fetchShippingAddress() {
      const shippingAddressResponse = await shopby.api.order.getProfileShippingAddresses();
      this.shippingAddress = shippingAddressResponse.data;
    }

    paging() {
      const pageStart = (this.page.pageNumber - 1) * this.pageSize;
      const pageEnd = pageStart + this.pageSize;

      this.displayShippingAddress = this.shippingAddress.bookedAddresses.slice(pageStart, pageEnd);

      this.render();
    }

    render() {
      const compiled = Handlebars.compile($('#shippingListTemplate').html());

      // 테이블은 리렌더가 안되서 clear 후 다시 삽입
      $('.top_table_type').remove();
      $('#shippingList').append(compiled(this._getShippingListData()));

      this.page.render(this.shippingAddress.bookedAddresses.length);
    }

    bindEvents() {
      $('#addShipping').on('click', this.onOpenShippingRegister.bind(this));
      this.$el
        .on('click', '#modifyAddress', this.onOpenShippingRegister.bind(this))
        .on('click', '.btnChoiceAddress', this.onClickChoiceBtn.bind(this))
        .on('click', '.btnDeleteAddress', this.onClickDeleteBtn.bind(this));
    }

    onClickChoiceBtn(e) {
      e.preventDefault();
      const addressNo = Number(e.target.dataset.addressNo);

      const selectedAddress = this.shippingAddress.bookedAddresses.find(
        bookedAddress => bookedAddress.addressNo === addressNo,
      );

      this.callback({ selectedAddress });
      this.$el.remove();
    }

    onClickDeleteBtn(e) {
      e.preventDefault();
      shopby.confirm({ message: '배송지 정보를 삭제하시겠습니까?' }, callback => {
        if (callback.state === 'ok') {
          const addressNo = e.target.dataset.addressNo;
          this.deleteShipping(addressNo);
        }
      });
    }

    onOpenShippingRegister(e) {
      e.preventDefault();
      const addressNo = e.target.dataset.addressNo;
      const modifyTarget = this.shippingAddress.bookedAddresses.find(
        bookedAddress => bookedAddress.addressNo === Number(addressNo),
      );
      const isDefaultAddress = this.shippingAddress.bookedAddresses.length > 0;
      shopby.popup('my-shipping-register', { addresses: modifyTarget, isDefaultAddress }, async result => {
        if (result.state === 'close') return;
        if (!result.address.addressNo) {
          this.addNewShipping(result);
        } else {
          this.modifyShipping(result);
        }
      });
    }

    //TODO: result 네이밍 바꾸기
    async addNewShipping(result) {
      const requestBody = { ...result.address, addressType: 'BOOK', customsIdNumber: '' };

      await shopby.api.order.postProfileShippingAddresses({ requestBody });
      shopby.alert('배송지 정보가 추가되었습니다.', () => {
        this.resetShippingAddress();
        result.closePopup();
      });
    }

    async modifyShipping(result) {
      const requestBody = { ...result.address };
      await shopby.api.order.putProfileShippingAddressesAddressNo({
        pathVariable: {
          addressNo: result.address.addressNo,
        },
        requestBody,
      });
      shopby.alert('배송지 정보가 변경되었습니다.', () => {
        this.resetShippingAddress();
        result.closePopup();
      });
    }

    async deleteShipping(addressNo) {
      await shopby.api.order.deleteProfileShippingAddressesAddressNo({
        pathVariable: {
          addressNo,
        },
      });
      shopby.alert('삭제 되었습니다.');
      this.resetShippingAddress();
    }

    async resetShippingAddress() {
      this.setPagination();
      await this.fetchShippingAddress();
      this.paging();
      $('.btnChoiceAddress').attr('data-action-type', 'updated');
      $('.btnClosePopup').attr('data-action-type', 'updated');
    }

    _getShippingListData() {
      return {
        displayShippingAddress: this.displayShippingAddress,
      };
    }

    throwing(message) {
      $('#noResult').show();
      throw new Error(message);
    }
  }

  shopby.registerPopupConstructor('my-shipping-list', MyShippingList);
})();

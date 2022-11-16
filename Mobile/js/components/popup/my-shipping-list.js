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

      this.init($parent, option);
    }

    async init($parent, option) {
      const compiled = Handlebars.compile($('#myShippingListPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
      this.setReadMore();

      await this.fetchShippingAddress();
      this.render();
      this.bindEvents();
    }

    setReadMore() {
      this.page = new shopby.readMore(this.paging.bind(this), '#readMore', this.pageSize);
    }

    async fetchShippingAddress() {
      const shippingAddressResponse = await shopby.api.order.getProfileShippingAddresses();
      this.shippingAddress = shippingAddressResponse.data;
    }

    paging() {
      const { pageNumber, pageSize } = this.page;
      const start = pageSize / pageNumber;

      const data = this.shippingAddress.bookedAddresses.slice(start, pageSize);
      this.append(data);
    }

    render(rerender = false) {
      const compiled = Handlebars.compile($('#shippingListTemplate').html());
      const { pageNumber, pageSize } = this.page;
      const start = pageNumber - 1;
      const end = pageSize;
      const data = this.shippingAddress.bookedAddresses.slice(start, end);
      if (rerender) $('#shippingList').children().remove();
      $('#shippingList').append(compiled(data));
      this.page.render(this.shippingAddress.bookedAddresses.length);
      this.page.pageSize = end * 2;
    }

    append(data) {
      const compiled = Handlebars.compile($('#shippingListTemplate').html());
      const $addressElements = $(compiled(data)).find('li');
      $('#shippingList ul').append($addressElements);
      this.page.render(this.shippingAddress.bookedAddresses.length);
    }

    bindEvents() {
      $('#addShipping').on('click', this.onOpenShippingRegister.bind(this));
      this.$el
        .on('click', '[data-action="modifyAddress"]', this.onOpenShippingRegister.bind(this))
        .on('click', '[data-action="deleteAddress"]', this.onClickDeleteBtn.bind(this))
        .on('click', '#choiceSubmit', this.choiceSubmit.bind(this))
        .on('click', '.btnClosePopup', this.closePopup.bind(this));
    }

    closePopup() {
      this.page.unBindEvents();
    }

    choiceSubmit() {
      const choiceAddressNo =
        this.$el.find('input[type="radio"]:checked') && this.$el.find('input[type="radio"]:checked').val();
      if (!choiceAddressNo) {
        shopby.alert('배송지를 선택해주세요.');
        return;
      }

      const selectedAddress = this.shippingAddress.bookedAddresses.find(
        bookedAddress => bookedAddress.addressNo === Number(choiceAddressNo),
      );

      this.callback({ selectedAddress });
      this.close();
      this.page.unBindEvents();
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
      this.setReadMore();
      await this.fetchShippingAddress();
      this.render(true);
    }

    throwing(message) {
      $('#noResult').show();
      throw new Error(message);
    }
  }

  shopby.registerPopupConstructor('my-shipping-list', MyShippingList);
})();

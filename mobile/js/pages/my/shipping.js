/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author HyeYeon Park
 * @author JongKeun Kim
 * @since 2021.7.12
 */

$(() => {
  shopby.shipping = {
    addresses: null, // updateAddress 용도로 사용.
    initiate() {
      this.add.initiate();
      this.search.initiate();
      this.content.initiate(shopby.shipping.addresses);
    },

    add: {
      initiate() {
        this._bindEvents();
      },
      _bindEvents() {
        $('#addShippingAddress').on('click', this.createAddressHandler.bind(this));
      },
      createAddressHandler(event) {
        event.preventDefault();
        this.openRegisterShippingAddressPopup();
      },
      openRegisterShippingAddressPopup(addressNo) {
        const addresses = !addressNo
          ? null
          : shopby.shipping.addresses.find(address => address.addressNo === addressNo);
        const isDefaultAddress = shopby.shipping.addresses.length > 0;
        shopby.popup('my-shipping-register', { addresses, isDefaultAddress }, result => {
          if (result.state === 'close') return;

          result.address.addressNo ? this.updateShipping(result) : this.createShipping(result);
        });
      },
      async createShipping(result) {
        const requestBody = { ...result.address, addressType: 'BOOK', customsIdNumber: '' };

        await shopby.api.order.postProfileShippingAddresses({ requestBody });
        shopby.alert('배송지 정보가 추가되었습니다.', () => {
          shopby.shipping.search.search(); // 데이터 갱신
          result.closePopup();
        });
      },

      async updateShipping(result) {
        const requestBody = { ...result.address };
        await shopby.api.order.putProfileShippingAddressesAddressNo({
          pathVariable: {
            addressNo: result.address.addressNo,
          },
          requestBody,
        });
        shopby.alert('배송지 정보가 변경되었습니다.', () => {
          shopby.shipping.search.search(); // 데이터 갱신
          result.closePopup();
        });
      },
    },

    search: {
      pagination: null,
      initiate() {
        this.search();
      },
      async search() {
        await this.fetchProfileShippingAddress()
          .then(data =>
            data.sort((prev, next) => {
              const x = dayjs(prev.registerYmdt).unix();
              const y = dayjs(next.registerYmdt).unix();
              return x > y ? -1 : 1;
            }),
          )
          .then(data => {
            shopby.shipping.addresses = data; // updateAddress 용도로 저장
            shopby.shipping.content.renderAddresses(data);
          });
      },
      async fetchProfileShippingAddress() {
        return await shopby.api.order
          .getProfileShippingAddresses()
          .then(({ data: { bookedAddresses } }) => bookedAddresses);
      },
    },

    content: {
      initiate(data) {
        this.renderAddresses(data);
        this._bindEvents();
      },
      renderAddresses(data) {
        const $addresses = $('#addresses');
        const compiled = Handlebars.compile($addresses.html());
        $addresses.siblings().remove();
        $addresses.closest('.s_content').append(compiled(data));
      },
      _bindEvents() {
        $('#contents')
          .on('click', '[data-id="shippingAddressUpdate"]', this.updateAddressHandler.bind(this))
          .on('click', '[data-id="shippingAddressDelete"]', this.deleteAddressHandler.bind(this))
          .on('click', '#defaultSetting', this.setDefaultAddress.bind(this));
      },
      updateAddressHandler(event) {
        const addressNo = $(event.currentTarget).closest('.s_info').data('shipping-no');
        shopby.shipping.add.openRegisterShippingAddressPopup(addressNo);
      },
      deleteAddressHandler(event) {
        const isDefault = event.currentTarget.dataset['defaultYn'] === 'Y';
        if (isDefault) return shopby.alert('기본 배송지는 삭제할 수 없습니다.<br />변경 후 삭제해주세요.');

        const addressName = $(event.currentTarget).closest('.s_info').data('shipping-name');

        shopby.confirm({ message: `${addressName} 삭제하시겠습니까?` }, ({ state }) => {
          if (state !== 'ok') return;
          const addressNo = $(event.currentTarget).closest('.s_info').data('shipping-no');
          this.deleteAddress(addressNo).then(() => {
            shopby.shipping.search.search(); // 데이터 갱신
          });
        });
      },
      deleteAddress(addressNo) {
        const request = {
          pathVariable: {
            addressNo,
          },
        };
        return shopby.api.order.deleteProfileShippingAddressesAddressNo(request).then(() => {
          shopby.alert('삭제 되었습니다.');
        });
      },
      async setDefaultAddress({ currentTarget }) {
        const addressNo = $(currentTarget).closest('.s_info').data('shipping-no');
        try {
          await shopby.api.order.putProfileShippingAddressesAddressNoDefault({
            pathVariable: {
              addressNo,
            },
          });
          shopby.alert('기본 배송지로 설정되었습니다.', () => {
            shopby.shipping.search.search(); // 데이터 갱신
          });
        } catch (e) {
          console.error(e);
        }
      },
    },
  };

  shopby.start.initiate(shopby.shipping.initiate.bind(shopby.shipping));
});

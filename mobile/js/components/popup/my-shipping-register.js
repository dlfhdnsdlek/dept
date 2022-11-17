/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.7
 */

(() => {
  class MyShippingRegister {
    constructor($parent, option, callback) {
      this.addresses = option.addresses;
      this.isDefaultAddress = option.isDefaultAddress;
      this.callback = callback;

      this.init($parent, this.addresses);
    }

    init($parent, option) {
      const compiled = Handlebars.compile($('#myShippingRegisterPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);

      this.setDefaultValues();
      this.bindEvents();
    }

    setDefaultValues() {
      if (this.isDefaultAddress === false) {
        this.$el.find(`input[name=defaultYn]`).prop('checked', true).prop('disabled', true);
      }
      if (!this.addresses) {
        return;
      }

      Object.keys(this.addresses).forEach(key => {
        if (key === 'defaultYn' && this.addresses[key] === 'Y') {
          this.$el.find(`input[name=${key}]`).prop('checked', true);
        } else {
          this.$el.find(`input[name=${key}]`).val(this.addresses[key]);
        }
      });
    }

    bindEvents() {
      this.$el
        .on('click', '#postSearch', this.onOpenPostSearch.bind(this))
        .on('click', '#saveButton', this.onSave.bind(this));
    }

    onOpenPostSearch(e) {
      e.preventDefault();
      shopby.popup('find-address', null, result => {
        const { zipCode, address, jibunAddress } = result;

        this.setAddressInputValue({ zipCode, address, jibunAddress });
      });
    }

    setAddressInputValue({ zipCode, address, jibunAddress }) {
      $('input[name="receiverZipCd"]').val(zipCode);
      $('input[name="receiverAddress"]').val(address);
      $('input[name="receiverJibunAddress"]').val(jibunAddress);
    }

    onSave(e) {
      e.preventDefault();

      try {
        this.validate();

        this.callback({
          address: {
            addressNo: (this.addresses && this.addresses.addressNo) || 0,
            addressType: (this.addresses && this.addresses.addressType) || null,
            customsIdNumber: (this.addresses && this.addresses.customsIdNumber) || 0,
            addressName: this.$el.find('input[name=addressName]').val(),
            receiverName: this.$el.find('input[name=receiverName]').val(),
            receiverZipCd: this.$el.find('input[name=receiverZipCd]').val(),
            receiverAddress: this.$el.find('input[name=receiverAddress]').val(),
            receiverDetailAddress: this.$el.find('input[name=receiverDetailAddress]').val(),
            receiverJibunAddress: this.$el.find('input[name=receiverJibunAddress]').val(),
            receiverContact1: this.$el.find('input[name=receiverContact1]').val(),
            receiverContact2: this.$el.find('input[name=receiverContact2]').val(),
            defaultYn: this.$el.find('input[name=defaultYn]').is(':checked') ? 'Y' : 'N',
          },
          closePopup: () => {
            this.$el.remove();
            $('body').removeClass('popup-open');
          },
        });
      } catch (e) {
        shopby.alert(e.message);
      }
    }

    validate() {
      const receiverName = this.$el.find('input[name=receiverName]').val();
      const receiverZipCd = this.$el.find('input[name=receiverZipCd]').val();
      const receiverAddress = this.$el.find('input[name=receiverAddress]').val();
      const receiverDetailAddress = this.$el.find('input[name=receiverDetailAddress]').val();
      const receiverContact1 = this.$el.find('input[name=receiverContact1]').val();

      if (receiverName.trim().length === 0) {
        throw new Error('받으실 분 정보를 입력해주세요.');
      }

      const isAddressEmpty = [receiverZipCd, receiverAddress, receiverDetailAddress].some(
        address => address.trim().length === 0,
      );
      if (isAddressEmpty) {
        throw new Error('주소를 입력해주세요.');
      }

      if (receiverContact1.trim().length === 0) {
        throw new Error('휴대폰번호를 입력해주세요.');
      }

      if (receiverContact1.trim().length < 11) {
        throw new Error('정확한 휴대폰번호를 입력해주세요.');
      }
    }
  }

  shopby.registerPopupConstructor('my-shipping-register', MyShippingRegister);
})();

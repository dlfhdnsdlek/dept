/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-21
 */
$(() => {
  const { getUrlParam } = shopby.utils;
  shopby.my.orderClaim = {
    orderNo: getUrlParam('orderNo'),
    orderOptionNo: getUrlParam('orderOptionNo'),
    claimType: getUrlParam('type'),
    claims: null,
    payType: null,
    attachedImages: [],
    returnType: 'SELLER_COLLECT',
    shippingData: null,
    async initiate() {
      this.my.initiate();
      await this.fetchPossibleClaims();
      this.bindEvents();
    },
    async fetchPossibleClaims() {
      try {
        const request = {
          pathVariable: {
            orderOptionNo: this.orderOptionNo,
          },
          queryString: {
            claimType: this.claimType,
            orderOptionNo: this.orderOptionNo,
          },
        };

        const getClaims = shopby.logined()
          ? shopby.api.claim.getProfileOrderOptionsOrderOptionNoClaims
          : shopby.api.claim.getGuestOrderOptionsOrderOptionNoClaims;
        const { data } = await getClaims(request);

        this.generateOrderInfo(data);
        this.generateClaimInfo(data);
        this.generateShippingInfo(data);
      } catch (e) {
        console.error(e);
      }
    },
    generateOrderInfo(item) {
      this.setDefaultValues(item); // render 되기 전에 데이터가 set 되어야 해서 여기 넣었어요. to 은비님
      const isNaverPayOrder = this.payType === 'NAVER_PAY';
      this.claims = isNaverPayOrder ? [item.originalOption] : [item.originalOption].concat(item.claimableOptions);
      const data = this.claims.flatMap(claim => ({
        orderYmd: claim.orderStatusDate.registerYmdt.split(' ')[0],
        optionTextInfo: shopby.utils.createOptionText(claim),
        productName: shopby.utils.substrWithPostFix(claim.productName),
        buyAmt: claim.price.buyAmt,
        orderStatusType: claim.orderStatusType,
        defaultOrderOptionNo: Number(this.orderOptionNo),
        orderNo: claim.orderNo,
        productNo: claim.productNo,
        imageUrl: claim.imageUrl,
        orderCnt: claim.orderCnt,
        orderOptionNo: claim.orderOptionNo,
        payType: claim.payType,
        isEscrow: this.isEscrow,
      }));
      this.renderOrderTable(data);
    },
    setDefaultValues(item) {
      this.payType = item.payType;

      if (this.payType === 'NAVER_PAY') {
        this.returnType = 'BUYER_DIRECT_RETURN';
      }
    },
    generateClaimInfo({ claimReasonTypes, availableBanks, originalOption }) {
      const responsibleObjectTypes = [
        { label: '구매자', responsibleObjectType: 'BUYER' },
        { label: '판매자', responsibleObjectType: 'SELLER' },
      ];
      const data = {
        claimType: this.claimTitle,
        claimReasonTypes,
        bankList: [{ bank: '', label: '선택해주세요' }, ...availableBanks],
        responsibleObjectTypes,
        orderStatusType: originalOption.orderStatusType,
        isAttachments: this.claimType !== 'CANCEL' && this.isShipping === true,
        isAccountInfo:
          this.claimType !== 'EXCHANGE' && !(this.claimType === 'CANCEL' && this.orderStatusType === 'DEPOSIT_WAIT'),
        isEscrow: this.isEscrow,
      };
      this.renderClaimForm(data);
    },
    generateShippingInfo({
      originalOption,
      exchangeAddress,
      returnAddress,
      deliveryCompanyTypeWithLabels,
      returnWarehouse,
    }) {
      const isReturnShippingInfo = this.claimType !== 'CANCEL' && this.isShipping;
      const isExchangeShippingInfo = this.claimType === 'EXCHANGE' && this.isShipping;
      if (isReturnShippingInfo === false && isExchangeShippingInfo === false) return;

      const data = {
        isReturnShippingInfo,
        isExchangeShippingInfo,
        returnAddress,
        exchangeAddress,
        deliveryCompanyTypeWithLabels,
        returnWarehouse,
        returnType: this.returnType,
        orderStatusType: originalOption.orderStatusType,
        customsIdNumber: (exchangeAddress && exchangeAddress.customsIdNumber) || 0,
        deliveryCompanyTypeLabel: originalOption.delivery.deliveryCompanyTypeLabel,
        logined: shopby.logined(),
      };
      this.shippingData = data;
      this.renderShippingForm(data);
    },
    renderOrderTable(data) {
      const $orderTable = $('#orderTable');
      const compiled = Handlebars.compile($orderTable.html());
      $orderTable.next().remove();
      $orderTable.parent().append(compiled(data));
      this.changeAllCheckBox();
    },
    renderClaimForm(data) {
      $('#claimInfo').render(data);
      $('.claimType').text(`${this.claimTitle}수량`);
      $('#claimTitle').text(`${this.claimTitle}신청`);
    },
    renderShippingForm(data) {
      const $shippingInfo = $('#shippingInfo');
      const compiled = Handlebars.compile($shippingInfo.html());
      $shippingInfo.next().remove();
      $shippingInfo.parent().append(compiled(data));
      $(`input[name='returnType']:radio[value='${this.returnType}']`).prop('checked', true);
    },
    renderAttachment() {
      const attachmentTemplate = this.attachedImages.map((attachedImage, index) =>
        this.getAttachmentTemplate(attachedImage, index),
      );
      $('#attachedImages').html(attachmentTemplate);
    },
    get isEscrow() {
      return ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(this.payType);
    },
    bindEvents() {
      $('#orderClaimTemplate')
        .on('change', '#allChecked', this.onChangeAllCheckBox.bind(this))
        .on('change', 'input[name=optionItem]:checkbox', this.onChangeCheckBox.bind(this))
        .on('change', '#imageAttachments', this.onChangeAttachments.bind(this))
        .on('click', '#attachedImages', this.onClickDeleteBtn.bind(this))
        .on('input', '.valueValidation', this.onInputValidation.bind(this))
        .on('click', '.btn_post_search', this.onClickFindAddress.bind(this))
        .on('change', 'input[name=returnType]', this.onChangeReturnType.bind(this))
        .on('click', '.btn_claim_ok', this.onClickSaveButton.bind(this))
        .on('click', '.openShippingAddressManager', this.onClickShippingAddressPopup.bind(this));

      $('.goods_cnt').on('click', this.onClickClaimCount.bind(this));
      $('input[name=claimCount]').on('change', this.onChangeClaimCount.bind(this));
    },
    onChangeAllCheckBox({ target }) {
      $(target).prop('checked')
        ? this.checkboxHandler('optionItem', true, true)
        : this.checkboxHandler('optionItem', false, true);
    },
    onChangeCheckBox({ target }) {
      $(target)
        .closest('tr')
        .find('.claimCount')
        .attr('disabled', $(target).prop('checked') ? null : 'checked');
      this.changeAllCheckBox();
    },
    changeAllCheckBox() {
      if (this.isEscrow === true) {
        $(`input:checkbox[name='all']`).prop('disabled', true);
      }
      const allCheckBoxLength = $('input[name=optionItem]:checkbox').length;
      const checkedBoxLength = $('input[name=optionItem]:checked').length;
      allCheckBoxLength === checkedBoxLength ? this.checkboxHandler('all') : this.checkboxHandler('all', false);
    },
    checkboxHandler(name, isChecked = true, isTrigger = false) {
      const $checkbox = $(`input:checkbox[name='${name}']`);
      isTrigger ? $checkbox.prop('checked', isChecked).trigger('change') : $checkbox.prop('checked', isChecked);
    },
    onClickClaimCount({ target }) {
      if (this.payType === 'NAVER_PAY') {
        alert('네이버페이 주문형 주문은 수량을 나누어 취소/반품할 수 없습니다.\n 전체 수량을 선택 후 신청해 주세요');
        return;
      }

      const currentOrderOptionNo = Number($(target).closest('tr').data('order-option-no'));
      const orderOption = this.claims.find(({ orderOptionNo }) => currentOrderOptionNo === orderOptionNo);
      const calcType = $(target).data('type');
      const $currentTr = $(target).closest('tr');
      const maxClaimCnt = orderOption.orderCnt;
      let claimCount = Number($currentTr.find('input[name=claimCount]').val());

      if (calcType === 'increase' && claimCount < maxClaimCnt) {
        claimCount += 1;
      } else if (calcType === 'decrease' && claimCount > 1) {
        claimCount -= 1;
      }
      $currentTr.find('input[name=claimCount]').val(claimCount);
    },
    onChangeClaimCount({ target }) {
      const $el = $(target);
      let count = Number($el.val());

      const currentOrderOptionNo = Number($el.closest('tr').data('order-option-no'));
      const orderOption = this.claims.find(({ orderOptionNo }) => currentOrderOptionNo === orderOptionNo);

      if (!count || count < 0) {
        count = 1;
      } else if (count > orderOption.orderCnt) {
        count = orderOption.orderCnt;
      }

      $el.val(count);
    },
    onChangeAttachments(event) {
      const uploadImageCallback = ({ imageUrl }) => {
        this.attachedImages.push(imageUrl);
        this.renderAttachment();
      };
      shopby.helper.attachments.onChangeAttachments(event, uploadImageCallback, this.attachedImages.length);
    },
    onClickDeleteBtn({ target }) {
      const { type } = target.dataset;
      if (type !== 'delete') return;

      shopby.confirm({ message: '첨부파일을 삭제하시겠습니까?' }, ({ state }) => {
        if (state === 'close') return;
        const index = $(target).closest('li').data('image-id');
        this.attachedImages.splice(index, 1);
        this.renderAttachment();
      });
    },
    onInputValidation({ target }) {
      const { pattern } = target.dataset;
      const { value } = target;
      const validValue =
        pattern === 'customsId' ? this.validateCustomId(value) : value.replace(shopby.regex[pattern], '');
      $(target).val(validValue);
    },
    validateCustomId(value) {
      const regLetter = /[^p|P]/;
      const firstLetter = value[0];
      const numbers = value.slice(1);

      if (regLetter.test(firstLetter)) return '';

      return firstLetter + numbers.replace(shopby.regex.notNumber, '');
    },
    onClickFindAddress({ target }) {
      const { type } = target.dataset;
      shopby.popup('find-address', {}, data => {
        if (data.state === 'close') return;
        this.setAddressInputValue(data, type);
        shopby.alert('상세주소를 입력해주시기 바랍니다.');
      });
    },
    onClickShippingAddressPopup({ target }) {
      shopby.popup('my-shipping-list', null, data => {
        if (data.state === 'close' || !data.selectedAddress) return;
        const { type } = target.dataset;
        const { receiverZipCd, receiverAddress, receiverJibunAddress, receiverName } = data.selectedAddress;
        const addressValue = {
          zipCode: receiverZipCd,
          address: receiverAddress,
          jibunAddress: receiverJibunAddress,
          name: receiverName,
        };
        this.setAddressInputValue(addressValue, type);
      });
    },
    setAddressInputValue({ zipCode, address, jibunAddress, name }, type) {
      $(`input[name="${type}ReceiverZipCd"]`).val(zipCode);
      $(`input[name="${type}ReceiverAddress"]`).val(address);
      $(`input[name="${type}ReceiverJibunAddress"]`).val(jibunAddress);
      $(`input[name="${type}ReceiverDetailAddress"]`).val('');
      if (name === undefined) return;
      $(`input[name="${type}ReceiverName"]`).val(name);
    },
    onChangeReturnType({ target }) {
      if (this.payType === 'NAVER_PAY') {
        alert(
          '판매자수거요청으로 반품신청이 불가합니다.\n판매자수거요청으로 반품신청을 희망하는 경우, 네이버페이에서 신청해주세요.',
        );
        $('#returnBuyer').prop('checked', true);
        return;
      }
      this.returnType = target.value;
      this.shippingData.returnType = this.returnType;
      this.shippingData.logined = shopby.logined();

      this.renderShippingForm(this.shippingData);
    },
    async onClickSaveButton() {
      const claimInfoData = this.getClaimInfoData();
      if (this.validateClaim(claimInfoData) === false) return;
      if (this.validateBank(claimInfoData) === false) return;

      const getReturnInfo = this.getReturnInfoFunc();
      if (this.validateReturn(getReturnInfo) === false) return;

      const getExchangeInfo = this.getExchangeInfoFunc();
      if (this.validateExchange(getExchangeInfo) === false) return;

      const claimInfoRequest = this.getClaimInfoRequest(claimInfoData);
      let isSuccess = null;
      switch (this.claimType) {
        case 'CANCEL':
          isSuccess = await this.postClaimsCancel(claimInfoRequest);
          break;
        case 'RETURN':
          isSuccess = await this.postClaimsReturn(claimInfoRequest, getReturnInfo);
          break;
        case 'EXCHANGE':
          isSuccess = await this.postClaimsExchange(claimInfoRequest, getReturnInfo, getExchangeInfo);
          break;
        default:
          throw new Error('Unknown claim type');
      }
      if (!isSuccess) return;
      shopby.alert(
        `${this.claimTitle}신청이 완료되었습니다.</br>${this.claimTitle}관련 정보는 마이페이지 취소/반품/교환 내역에서 확인 가능합니다.`,
        () => (location.href = document.referrer === '' ? '/pages/my/orders.html' : document.referrer),
      );
    },
    validateClaim({ responsibilityTarget, claimReasonType, claimReasonDetail, claimedProductOptions }) {
      const $claimInfo = $('.order_view_info_main');
      if (responsibilityTarget === '') {
        shopby.alert('귀책대상을 선택해주세요.', () => $claimInfo.find('select[name=responsibilityTarget]').focus());
        return false;
      }

      if (claimReasonType === '') {
        shopby.alert('사유를 선택해주세요.', () => $claimInfo.find('select[name=claimReasonType]').focus());
        return false;
      }

      //배송전 취소일때만
      if (this.isEscrow === false && claimReasonDetail === '') {
        shopby.alert('상세 사유를 입력해주세요.', () => $claimInfo.find('textarea[name=claimReasonDetail]').focus());
        return false;
      }
      if (claimedProductOptions.length === 0) {
        if (this.claimType !== 'CANCEL') {
          shopby.alert('상품을 하나 이상 선택해주세요.');
        } else {
          shopby.alert('취소상품을 하나 이상 선택해주세요.');
        }
        return false;
      }
      return true;
    },
    validateBank({ bank, bankAccount, bankDepositorName }) {
      if (bank === undefined && bankAccount === undefined && bankDepositorName === undefined) return;
      if (bank === '') {
        shopby.alert('은행을 선택해주세요.');
        return false;
      }

      if (bankAccount === '') {
        shopby.alert('계좌번호를 입력해주세요.');
        return false;
      }

      if (bankDepositorName === '') {
        shopby.alert('예금주를 입력해주세요.');
        return false;
      }
      return true;
    },
    validateReturn(getReturnInfo) {
      if (this.returnType === 'SELLER_COLLECT' && this.isShipping) {
        if (getReturnInfo('returnReceiverName') === '') {
          shopby.alert('반품자명을 입력해주세요.', () => getReturnInfo('returnReceiverName', 'focus'));
          return false;
        }
        const isEmptyAddress =
          getReturnInfo('returnReceiverZipCd') === '' ||
          getReturnInfo('returnReceiverAddress') === '' ||
          getReturnInfo('returnReceiverDetailAddress') === '';
        if (isEmptyAddress) {
          shopby.alert('반품 수거지 주소를 입력해주세요.', () => getReturnInfo('returnReceiverDetailAddress', 'focus'));
          return false;
        }

        if (getReturnInfo('returnReceiverContact1') === '') {
          shopby.alert('반품수거정보의 휴대폰번호를 입력해주세요.', () =>
            getReturnInfo('returnReceiverContact1', 'focus'),
          );
          return false;
        }
      }

      if (this.returnType !== 'SELLER_COLLECT') {
        if (getReturnInfo('deliveryCompanyType') === '') {
          shopby.alert('구매자 직접 반품인 경우 상품을 반송할 택배사를 선택해주세요.', () =>
            getReturnInfo('deliveryCompanyType', 'focus'),
          );
          return false;
        }
      }
      return true;
    },
    validateExchange(getExchangeInfo) {
      if (this.claimType !== 'EXCHANGE' && this.isShipping === false) return;
      if (getExchangeInfo('exchangeReceiverName') === '') {
        shopby.alert('수령자명을 입력해주세요.', () => getExchangeInfo('exchangeReceiverName', 'focus'));
        return false;
      }

      const isEmptyAddress =
        getExchangeInfo('exchangeReceiverZipCd') === '' ||
        getExchangeInfo('exchangeReceiverAddress') === '' ||
        getExchangeInfo('exchangeReceiverDetailAddress') === '';
      if (isEmptyAddress) {
        shopby.alert('교환 수거지 주소를 입력해주세요.', () =>
          getExchangeInfo('exchangeReceiverDetailAddress', 'focus'),
        );
        return false;
      }

      if (getExchangeInfo('exchangeReceiverContact1') === '') {
        shopby.alert('교환수거정보의 휴대폰번호를 입력해주세요.', () =>
          getExchangeInfo('exchangeReceiverContact1', 'focus'),
        );
        return false;
      }

      const exchangeCustomsIdNo = getExchangeInfo('exchangeCustomsIdNo');

      if (exchangeCustomsIdNo === undefined) return;
      if (exchangeCustomsIdNo === '') {
        shopby.alert('개인통관부호를 입력해주세요.', () => getExchangeInfo('exchangeCustomsIdNo', 'focus'));
        return false;
      }
      if (!shopby.regex.customsId.test(exchangeCustomsIdNo)) {
        shopby.alert('개인통관부호가 유효하지 않습니다.', () => getExchangeInfo('exchangeCustomsIdNo', 'focus'));

        return false;
      }
      return true;
    },
    async postClaimsCancel(claimInfoRequest) {
      try {
        let postClaimsCancel = null;
        const request = { requestBody: claimInfoRequest };

        const escrowOrderTypes = ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'];
        if (escrowOrderTypes.includes(this.payType)) {
          request.pathVariable = { orderNo: this.orderNo };

          postClaimsCancel = shopby.logined()
            ? shopby.api.claim.postProfileOrdersOrderNoClaimsCancel
            : shopby.api.claim.postGuestOrdersOrderNoClaimsCancel;
        } else {
          postClaimsCancel = shopby.logined()
            ? shopby.api.claim.postProfileClaimsCancel
            : shopby.api.claim.postGuestClaimsCancel;
        }

        await postClaimsCancel(request);

        return true;
      } catch (e) {
        console.error(e);
      }
    },
    async postClaimsReturn(claimInfoRequest, getReturnInfo) {
      try {
        const returnRequest = {
          invoiceNo: getReturnInfo('invoiceNo'),
          deliveryCompanyType: getReturnInfo('deliveryCompanyType'),
          claimImageUrls: this.attachedImages,
          returnWayType: this.returnType,
          returnAddress:
            this.returnType === 'BUYER_DIRECT_RETURN'
              ? null
              : {
                  addressNo: 0,
                  receiverName: getReturnInfo('returnReceiverName'),
                  receiverContact1: getReturnInfo('returnReceiverContact1'),
                  receiverContact2: getReturnInfo('returnReceiverContact2'),
                  receiverZipCd: getReturnInfo('returnReceiverZipCd'),
                  receiverAddress: getReturnInfo('returnReceiverAddress'),
                  receiverJibunAddress: getReturnInfo('returnReceiverJibunAddress'),
                  receiverDetailAddress: getReturnInfo('returnReceiverDetailAddress'),
                  customsIdNumber: getReturnInfo('exchangeCustomsIdNo'),
                  deliveryMemo: getReturnInfo('returnDeliveryMemo'),
                },
        };
        const requestBody = { ...claimInfoRequest, ...returnRequest };

        if (shopby.logined()) {
          await shopby.api.claim.postProfileClaimsReturn({ requestBody });
        } else {
          await shopby.api.claim.postGuestClaimsReturn({ requestBody });
        }

        return true;
      } catch (e) {
        console.error(e);
      }
    },
    async postClaimsExchange(claimInfoRequest, getReturnInfo, getExchangeInfo) {
      try {
        const returnAddress =
          this.returnType === 'BUYER_DIRECT_RETURN' || this.isShipping === false
            ? null
            : {
                addressNo: 0,
                receiverName: getReturnInfo('returnReceiverName'),
                receiverContact1: getReturnInfo('returnReceiverContact1'),
                receiverContact2: getReturnInfo('returnReceiverContact2'),
                receiverZipCd: getReturnInfo('returnReceiverZipCd'),
                receiverAddress: getReturnInfo('returnReceiverAddress'),
                receiverJibunAddress: getReturnInfo('returnReceiverJibunAddress'),
                receiverDetailAddress: getReturnInfo('returnReceiverDetailAddress'),
                customsIdNumber: getReturnInfo('exchangeCustomsIdNo'),
                deliveryMemo: getReturnInfo('returnDeliveryMemo'),
                countryCd: 'KR',
              };
        const exchangeAddress =
          this.isShipping === false
            ? null
            : {
                addressNo: 0,
                receiverName: getExchangeInfo('exchangeReceiverName'),
                receiverContact1: getExchangeInfo('exchangeReceiverContact1'),
                receiverContact2: getExchangeInfo('exchangeReceiverContact2'),
                receiverZipCd: getExchangeInfo('exchangeReceiverZipCd'),
                receiverAddress: getExchangeInfo('exchangeReceiverAddress'),
                receiverJibunAddress: getExchangeInfo('exchangeReceiverJibunAddress'),
                receiverDetailAddress: getExchangeInfo('exchangeReceiverDetailAddress'),
                customsIdNumber: getExchangeInfo('exchangeCustomsIdNo'),
                deliveryMemo: getExchangeInfo('exchangeDeliveryMemo'),
                countryCd: 'KR',
              };
        const { inputs, optionNo, productNo } = this.claims[0];

        const exchangeRequest = {
          invoiceNo: getExchangeInfo('invoiceNo'),
          deliveryCompanyType: getExchangeInfo('deliveryCompanyType'),
          orderOptionNo: this.orderOptionNo,
          productCnt: claimInfoRequest.claimedProductOptions[0].productCnt,
          claimImageUrls: this.attachedImages,
          returnWayType: this.returnType,
          returnAddress,
          exchangeAddress,
          exchangeOption: {
            inputTexts: inputs,
            orderCnt: claimInfoRequest.claimedProductOptions[0].productCnt,
            optionNo,
            productNo,
            additionalProductNo: 0,
          },
        };
        const request = {
          pathVariable: {
            orderOptionNo: this.orderOptionNo,
          },
          requestBody: { ...claimInfoRequest, ...exchangeRequest },
        };

        shopby.logined()
          ? await shopby.api.claim.postProfileOrderOptionsOrderOptionNoClaimsExchange(request)
          : await shopby.api.claim.postGuestOrdersOrderOptionNoClaimsExchange(request);

        return true;
      } catch (e) {
        console.error(e);
      }
    },
    getClaimInfoRequest(claimInfoData) {
      return {
        claimType: this.claimType,
        claimReasonType: claimInfoData.claimReasonType,
        claimReasonDetail: claimInfoData.claimReasonDetail,
        claimedProductOptions: claimInfoData.claimedProductOptions,
        returnWayType: this.returnType,
        bankAccountInfo: {
          bankAccount: claimInfoData.bankAccount,
          bankDepositorName: claimInfoData.bankDepositorName,
          bank: claimInfoData.bank,
          bankName: claimInfoData.bankName,
        },
        responsibleObjectType: claimInfoData.responsibilityTarget,
      };
    },
    getClaimInfoData() {
      const $claimInfo = $('.order_view_info_main');
      const claimInfoData = {
        claimedProductOptions: this.checkedClaimProductInfo,
        responsibilityTarget: this.isEscrow ? 'SELLER' : $claimInfo.find('select[name=responsibilityTarget]').val(), //귀책 대상
        claimReasonType: $claimInfo.find('select[name=claimReasonType]').val(), //사유
        claimReasonDetail: $claimInfo.find('textarea[name=claimReasonDetail]').val(), //상세사유

        bank: $claimInfo.find('select[name=bank]').val(), //은행
        bankName: $claimInfo.find('select[name=bank] option:selected').data('bank-name'),
        bankAccount: $claimInfo.find('input[name=bankAccount]').val(),
        bankDepositorName: $claimInfo.find('input[name=bankDepositorName]').val(),
      };
      if (this.claimType === 'CANCEL' && this.orderStatusType === 'DEPOSIT_WAIT') {
        claimInfoData.claimReasonType = 'CHANGE_MIND';
        claimInfoData.responsibilityTarget = 'BUYER';
      }
      return claimInfoData;
    },
    getExchangeInfoFunc() {
      const $exchangeShipping = $('.order_view_delivery');
      const exchangeShipping = {
        exchangeReceiverName: $exchangeShipping.find('input[name=exchangeReceiverName]'),
        exchangeReceiverZipCd: $exchangeShipping.find('input[name=exchangeReceiverZipCd]'),
        exchangeReceiverAddress: $exchangeShipping.find('input[name=exchangeReceiverAddress]'),
        exchangeReceiverDetailAddress: $exchangeShipping.find('input[name=exchangeReceiverDetailAddress]'),
        exchangeReceiverJibunAddress: $exchangeShipping.find('input[name=exchangeReceiverJibunAddress]'),
        exchangeReceiverContact1: $exchangeShipping.find('input[name=exchangeReceiverContact1]'),
        exchangeReceiverContact2: $exchangeShipping.find('input[name=exchangeReceiverContact2]'),
        exchangeDeliveryMemo: $exchangeShipping.find('input[name=exchangeDeliveryMemo]'),
        exchangeCustomsIdNo: $exchangeShipping.find('input[name=exchangeCustomsIdNo]'),
        invoiceNo: $exchangeShipping.find('input[name=invoiceNo]'),
        deliveryCompanyType: $exchangeShipping.find('select[name=deliveryCompanyType]'),
        exchangeType: $exchangeShipping.find('input[name=exchangeType]'),
      };
      return (name, func = 'val') => exchangeShipping[name][func]();
    },
    getReturnInfoFunc() {
      const $returnShipping = $('.order_view_delivery');
      const returnShipping = {
        returnReceiverName: $returnShipping.find('input[name=returnReceiverName]'),
        returnReceiverZipCd: $returnShipping.find('input[name=returnReceiverZipCd]'),
        returnReceiverAddress: $returnShipping.find('input[name=returnReceiverAddress]'),
        returnReceiverDetailAddress: $returnShipping.find('input[name=returnReceiverDetailAddress]'),
        returnReceiverJibunAddress: $returnShipping.find('input[name=returnReceiverJibunAddress]'),
        returnReceiverContact1: $returnShipping.find('input[name=returnReceiverContact1]'),
        returnReceiverContact2: $returnShipping.find('input[name=returnReceiverContact2]'),
        returnDeliveryMemo: $returnShipping.find('input[name=returnDeliveryMemo]'),
        invoiceNo: $returnShipping.find('input[name=invoiceNo]'),
        exchangeType: $returnShipping.find('input[name=exchangeType]'),
        exchangeCustomsIdNo: $returnShipping.find('input[name=exchangeCustomsIdNo]'),
        deliveryCompanyType: $returnShipping.find('select[name=deliveryCompanyType]'),
      };
      return (name, func = 'val') => returnShipping[name][func]();
    },
    get checkedClaimProductInfo() {
      return Array.from($('input[name=optionItem]:checked')).map(productInfo => {
        const $tr = $(productInfo).closest('tr');
        return {
          orderProductOptionNo: $tr.attr('data-order-option-no'),
          productCnt: Number($tr.find('input[name=claimCount]').val()),
        };
      });
    },
    get orderStatusType() {
      return this.claims[0].orderStatusType;
    },
    get isShipping() {
      return ['DELIVERY_ING', 'DELIVERY_DONE'].includes(this.orderStatusType);
    },
    get claimTitle() {
      return { CANCEL: '취소', EXCHANGE: '교환', RETURN: '반품' }[this.claimType];
    },
    getAttachmentTemplate(imageUrl, index) {
      return `
        <li class='vis_mode' data-image-id="${index}">
          <div>
            <img src="${imageUrl}" alt="첨부파일 이미지" />
            <a href='javascript:void(0)' data-type="delete">
              <img src='/assets/img/board/icon_del_add_file.png' alt='삭제' data-type="delete"/>
            </a>
          </div>
        </li>`.trim();
    },

    /**
     * @my :  마이페이지 공통 로직
     */
    my: {
      initiate() {
        shopby.my.menu.init('#myPageLeftMenu');
        if (shopby.logined()) {
          this.summary.initiate().catch(console.error);
        }
      },

      summary: {
        async initiate() {
          const [summary, summaryAmount] = await this._getData();
          this.render(summary, summaryAmount);
        },
        async _getData() {
          return Promise.all([
            shopby.api.member.getProfileSummary(),
            shopby.api.order.getProfileOrdersSummaryAmount({
              queryString: {
                orderStatusType: 'BUY_CONFIRM',
                startYmd: shopby.date.lastHalfYear(),
                endYmd: shopby.date.today(),
              },
            }),
          ]).then(res => res.map(({ data }) => data));
        },
        render(summary, summaryAmount) {
          shopby.my.summary.init('#myPageSummary', summary, summaryAmount);
        },
      },
    },
  };

  shopby.start.initiate(shopby.my.orderClaim.initiate.bind(shopby.my.orderClaim));
});

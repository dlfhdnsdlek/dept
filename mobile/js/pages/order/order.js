/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.6
 */

$(() => {
  //TODO: 쿼리 카멜케이스로
  const orderSheetNo = shopby.utils.getUrlParam('ordersheetno');

  // Reference agreement.js
  // 약관키: [title, required]
  const termsTitle = () => ({
    PI_COLLECTION_AND_USE_ON_ORDER: ['개인정보 수집/이용', true],
    PI_SELLER_PROVISION: ['개인정보 판매자 제공', true],
    USE: [`${shopby.cache.getMall().mall.mallName} 이용약관`, true],
    CLEARANCE_INFO_COLLECTION_AND_USE: ['통관정보 수집/이용 약관', false],
    TRANSFER_AGREE: ['개인정보 국외이전 동의', true],
  });

  const $orderProductsTable = $('#orderProductsTable');
  const $ordererInfo = $('#ordererInfo');
  const $tempPasswordContainer = $('#tempPasswordContainer');
  const $shippingInfo = $('#shippingInfo');
  const $paymentInfo = $('#paymentInfo');
  const $orderBuy = $('#orderBuy');
  const $payMethodList = $('#payMethodList');
  const $accountDetailInfo = $('#accountDetailInfo');
  const $termsChecks = $('#termsChecks');
  const $paymentProgressList = $('#paymentProgressList');
  const $escrow = $('#escrow');
  // const $paymentFinal = $('#paymentFinal');

  shopby.order = {
    data: {
      orderSheetResponse: null,
      deliveryGroups: [], // 주문상품 상세
      ordererInfo: null, // 주문자 정보
      orderSheetAddress: {
        addressNo: null,
        countryCd: null,
        addressName: null,
        receiverName: null,
        receiverZipCd: null,
        receiverAddress: null,
        receiverDetailAddress: null,
        receiverJibunAddress: null,
        receiverContact1: null,
      }, // 배송지정보
      paymentInfo: null, //결제정보,
      payMethods: [], // 결제방법
      agreementList: [], // 약관 리스트

      // coupon
      coupon: {
        choiceCoupon: {
          productCoupons: [], // 선택된 상품 쿠폰 (복수) : { productNo: number , couponIssueNo: number }
          cartCouponIssueNo: null, // 선택된 주문 쿠폰 (단수) : number
        },
        // TODO : productCouponOnly 는 2차 스펙.
        productCouponOnly: false, // 상품 쿠폰중 '주문쿠폰 사용불가' 쿠폰이 있을때 true : boolean
        cartCouponOnly: false, // 주문 쿠폰중 '상품쿠폰 사용불가' 쿠폰이 있을때 true : boolean
        canUsedAccumulation: true, // 쿠폰 적용중 '적립금 사용불가' 쿠폰이 있을때 false : boolean
      },
      partnerMalls: [],
    },

    async initiate() {
      try {
        await this.setData(await this._fetchData());
        this.render();
        this.bindEvents();
      } catch (e) {
        shopby.alert({ message: e.message }, () => {
          location.href = '/pages/order/cart.html';
        });
      }
    },

    async setData([orderSheetResponse, termsResponse]) {
      shopby.setGlobalVariableBy('ORDER', orderSheetResponse.data);
      await this.setAgreementList(termsResponse.data);
      this.setOrderSheetResponse(orderSheetResponse.data);
      this.setDeliveryGroups(orderSheetResponse.data.deliveryGroups);
      this.setOrdererInfo(orderSheetResponse.data.ordererContact);
      this.setOrderSheetAddress(orderSheetResponse.data.orderSheetAddress);
      this.setPaymentInfo(orderSheetResponse.data.paymentInfo);
      this.setPayMethods(orderSheetResponse.data.availablePayTypes);
    },

    async setAgreementList(terms) {
      this.data.agreementList = await shopby.helper.member.getAgreements(terms, termsTitle());
    },

    setOrderSheetResponse(orderSheetResponse) {
      this.data.orderSheetResponse = orderSheetResponse;
    },

    setDeliveryGroups(deliveryGroups) {
      this.data.deliveryGroups = deliveryGroups.map(deliveryGroup => ({
        deliveryAmt: deliveryGroup.deliveryAmt,
        deliveryPayType: deliveryGroup.deliveryPayType === 'PAY_ON_DELIVERY' ? '착불' : '선결제',
        orderProducts: this.makeDeliveryGroups(deliveryGroup),
        deliveryInternational: deliveryGroup.orderProducts[0].deliveryInternational,
      }));
    },

    // 배송그룹(deliveryGroups) -> 주문상품 정보 데이터로 바꿔야함
    makeDeliveryGroups(deliveryGroup) {
      const REPRESENTATIVE_PRODUCT = 0;

      const mall = shopby.cache.getMall().mall;
      return deliveryGroup.orderProducts
        .flatMap(({ orderProductOptions, imageUrl, productName }) => {
          orderProductOptions[REPRESENTATIVE_PRODUCT].imagesUrl = imageUrl;
          orderProductOptions.forEach(orderProductOption => {
            orderProductOption.productName = productName;
          });
          return orderProductOptions;
        })
        .map(orderProductOption => ({
          imageUrl: orderProductOption.imageUrl,
          productName: orderProductOption.productName,
          productNo: orderProductOption.productNo,
          optionTitle: orderProductOption.optionTitle,
          optionInputs: orderProductOption.optionInputs,
          orderCnt: orderProductOption.orderCnt,
          standardAmt: orderProductOption.price.standardAmt, // 상품금액
          accumulationAmtWhenBuyConfirm: orderProductOption.accumulationAmtWhenBuyConfirm, // 예상 적립금
          accumulationUnit: (mall.accumulationConfig && mall.accumulationConfig.accumulationUnit) || '원',
          discountAmt: shopby.utils.getDiscountAmt(orderProductOption.price, orderProductOption.orderCnt),
          productTotalAmt: shopby.utils.getProductTotalAmt(orderProductOption.price, orderProductOption.orderCnt), // 합계금액
        }));
    },

    setOrdererInfo(ordererContact) {
      this.data.ordererInfo = ordererContact;
    },

    setOrderSheetAddress(orderSheetAddress) {
      if (!shopby.logined()) {
        return;
      }

      this.data.orderSheetAddress = { ...orderSheetAddress.mainAddress };
    },

    setPaymentInfo(paymentInfo) {
      this.data.paymentInfo = { ...paymentInfo };
    },

    setPayMethods(availablePayTypes) {
      const standardPgType = this.extractStandardPgType(availablePayTypes);

      this.data.payMethods = availablePayTypes
        .flatMap(availablePay => this.makePayMethod(availablePay, standardPgType))
        .filter(payMethod => payMethod !== undefined);
    },

    makePayMethod(availablePay, standardPgType) {
      const payMethods = {
        PAYCO: availablePay => {
          return availablePay.pgTypes.map(pgType => {
            if (pgType === 'PAYCO') {
              return { payType: 'PAYCO', pgType: 'PAYCO', title: '페이코 간편 결제' };
            }
            if (pgType === 'KCP') {
              return { payType: 'KCP-PAYCO', pgType: 'PAYCO', title: 'KCP 페이코 간편 결제' };
            }
          });
        },
        CREDIT_CARD: () => ({ payType: 'CREDIT_CARD', pgType: standardPgType, title: '신용카드' }),
        REALTIME_ACCOUNT_TRANSFER: () => ({
          payType: 'REALTIME_ACCOUNT_TRANSFER',
          pgType: standardPgType,
          title: '계좌이체',
        }),
        VIRTUAL_ACCOUNT: () => ({ payType: 'VIRTUAL_ACCOUNT', pgType: standardPgType, title: '가상계좌' }),
        ACCOUNT: () => ({ payType: 'ACCOUNT', pgType: 'NONE', title: '무통장 입금' }),
        MOBILE: () => ({ payType: 'MOBILE', pgType: standardPgType, title: '모바일' }),
        ESCROW_REALTIME_ACCOUNT_TRANSFER: () => ({
          payType: 'ESCROW_REALTIME_ACCOUNT_TRANSFER',
          pgType: standardPgType,
          title: '계좌이체-에스크로',
        }),
        ESCROW_VIRTUAL_ACCOUNT: () => ({
          payType: 'ESCROW_VIRTUAL_ACCOUNT',
          pgType: standardPgType,
          title: '가상계좌-에스크로',
        }),
        NAVER_EASY_PAY: () => ({ payType: 'NAVER_EASY_PAY', pgType: 'NAVER_EASY_PAY', title: '네이버페이' }),
      };

      const isSupportablePayType = Object.keys(payMethods).includes(availablePay.payType);

      if (isSupportablePayType) {
        return payMethods[availablePay.payType](availablePay);
      }
    },

    // 구스킨 히스토리 -  pgType : 샵바이 프론트에서 이렇게 쓰고 있더라 NONE or PAYCO or witoutPayco (아마 대체로 KCP)
    // data-pg-type 값 return 용도로 추측
    extractStandardPgType(availablePayTypes) {
      const card = availablePayTypes.find(p => p.payType === 'CREDIT_CARD');
      if (card) {
        return card.pgTypes.filter(pgType => pgType !== 'PAYCO')[0]; // 첫번째 인덱스 의미 모르겠음
      } else {
        return 'NONE';
      }
    },

    initAccount() {
      const isAvailableAccount = this.data.payMethods.some(payMethod => payMethod.payType === 'ACCOUNT');
      if (!isAvailableAccount) return;

      const isCheckedAccount = $('input[name="payType"]:checked').val() === 'ACCOUNT';
      if (isCheckedAccount) {
        $accountDetailInfo.show();
        $accountDetailInfo.render(this._getAccountDetailInfo());
      }
    },

    render() {
      const paymentInfo = this._getPaymentInfo();
      $orderProductsTable.render(this._getOrderProductsTable());
      $ordererInfo.render(this._getOrdererInfo());
      $tempPasswordContainer.render();
      $shippingInfo.render(this._getShippingInfo());
      this.renderPayment(paymentInfo);
      $payMethodList.render(this._getPayMethods());
      $escrow.render(this._isEscrow());
      $termsChecks.render({
        agreementList: this.data.agreementList,
        deliveryInternational: this.data.deliveryGroups[0].deliveryInternational,
      });
      $('input:radio[name=payType]:first').attr('checked', true);
      $('#orderForm').removeClass('invisible').addClass('visible');

      this.initAccount();
      this.paymentDisplay();
    },
    renderPayment(paymentInfo) {
      paymentInfo = paymentInfo || this._getPaymentInfo();
      $paymentInfo.render(paymentInfo);
      // 사용가능한 적립금 0 원일 때 || 적립금 사용불가 쿠폰 사용했을 때  비활성화 처리
      const disabledAccumulation =
        paymentInfo.availableMaxAccumulationAmt === 0 || !this.data.coupon.canUsedAccumulation;
      $('#accumulation').attr('disabled', disabledAccumulation);
      $('#useAllAccumulation').attr('disabled', disabledAccumulation);
    },

    bindEvents() {
      $shippingInfo
        .on('click', '#manageShippingAddressBtn', this.events.onOpenMyShippingList.bind(this))
        .on('change', "input:radio[name='shipping']", this.events.onCheckShippingArea.bind(this)) // 배송 탭
        .on('change', '#shippingSameCheck', this.events.onCheckSameShipping.bind(this))
        .on(
          'change',
          'input[name="receiverName"]',
          'input[name="receiverContact1"]',
          this.events.onChangeSameShippingBindInput.bind(this),
        )
        .on('click', '#postSearch', this.events.onOpenFindAddress.bind(this));
      $orderBuy.on('click', this.events.onOrderBuy.bind(this));
      $('#orderForm')
        .on('keyup', 'input', this.events.changeValidInput.bind(this))
        .on('click', '#btnApplyCoupons', this.events.onOpenApplyCoupon.bind(this))
        .on('blur', '#accumulation', this.events.onBlurAccumulation.bind(this))
        .on('click', '#useAllAccumulation', this.events.onClickUseAllAccumulation.bind(this));
      $paymentProgressList.on('change', '.paymethods', this.events.onChangePayMethods.bind(this));
      $('#tempPasswordTable').on('blur', 'input', this.events.onBlurTempPassword.bind(this));
      $('.agreement_detail').on('click', this.events.onOpenTerm.bind(this));
      $('.js-order_tit').on('click', this.events.toggleContent.bind(this));
    },

    events: {
      changeValidInput({ key, target }) {
        const { pattern } = target.dataset;
        if ((key && key.includes('Arrow')) || !pattern) return;

        const { value } = target;
        let validInput =
          pattern === 'customsId' ? this.events.validateCustomId(value) : value.replace(shopby.regex[pattern], '');

        if (target.name === 'subPayAmt') {
          validInput = shopby.utils.toCurrencyString(Number(validInput));
        }

        $(target).val(validInput);
      },
      validateCustomId(value) {
        const regLetter = /[^p|P]/;
        const firstLetter = value[0];
        const numbers = value.slice(1);

        if (regLetter.test(firstLetter)) return '';

        return firstLetter + numbers.replace(shopby.regex.notNumber, '');
      },
      async onBlurAccumulation(e) {
        const { removeComma } = shopby.utils;
        const { availableMaxAccumulationAmt, minAccumulationLimit } = this.data.paymentInfo;
        const { value } = e.target;

        const usingAccumulation = removeComma(value);

        if (usingAccumulation > availableMaxAccumulationAmt) {
          $(e.target).val(availableMaxAccumulationAmt);
        } else if (usingAccumulation < minAccumulationLimit) {
          $(e.target).val(0);
          shopby.alert(`최소 적립금액 (${shopby.utils.toCurrencyString(minAccumulationLimit)}원) 이상 입력해주세요. `);
        }

        await this._postCalculate();
        this.renderPayment();
      },

      onOrderBuy() {
        const requestBody = this._getOrderBuyFormData();
        const notPay = this.data.paymentInfo.paymentAmt === 0;
        const isAccount = $('input:radio[name="payType"]:checked').val() === 'ACCOUNT';
        const lessNaverEasyPay = this.data.paymentInfo.paymentAmt < 100;
        const isNaverEasyPay = $('input:radio[name="payType"]:checked').val() === 'NAVER_EASY_PAY';
        try {
          this.validateForm();

          if (isNaverEasyPay && lessNaverEasyPay) {
            shopby.alert('네이버페이 결제는 결제 금액이 100원 이상부터 가능합니다');
            return;
          }
          //무통장결제가 아니고 0원 결제가 아닌경우 : 결제레이어창 띄우기
          if (!isAccount && !notPay) shopby.popup('pay-process', { orderSheetNo });

          window.NCPPay.setConfiguration({
            clientId: shopby.config.skin.clientId,
            accessToken: shopby.cache.getAccessToken(),
            confirmUrl: `${location.origin}/pages/order/order-complete.html`,
            platform: 'MOBILE_WEB',
          });

          window.NCPPay.reservation(requestBody);
        } catch (e) {
          console.error(e);
          shopby.alert(e.message);
        }
      },
      async onCheckShippingArea(e) {
        const SELECTED_AREA = e.target.value; // 'default'|'shipping-list'|'new'

        if (SELECTED_AREA === 'shipping-list') {
          this.events.onOpenMyShippingList.call(this);
          return;
        }

        const { mainAddress } = this.data.orderSheetResponse.orderSheetAddress; // mainAddress 메인배송지, 최근배송지

        this.setShippingInfoForm({ address: { ...mainAddress }, setAllNull: SELECTED_AREA === 'new' });

        await this._postCalculate(); // 제주도, 특수지역 배송비 계산 : PaymentInfo 수정 발생
        this.renderPayment();
      },

      async onCheckSameShipping({ currentTarget: { checked } }) {
        if (!checked) return;

        const ordererName = $('input[name="ordererName"]').val();
        const ordererContact1 = $('input[name="ordererContact1"]').val();
        const ordererContact2 = $('input[name="ordererContact2"]').val();

        $('input[name="receiverName"]').val(ordererName);
        $('input[name="receiverContact1"]').val(ordererContact1);
        $('input[name="receiverContact2"]').val(ordererContact2);

        await this._postCalculate(); // 제주도, 특수지역 배송비 계산 : PaymentInfo 수정 발생
        this.renderPayment();
      },

      onChangeSameShippingBindInput() {
        $('#shippingSameCheck').prop('checked', false);
      },

      onOpenMyShippingList(e) {
        e && e.preventDefault();
        shopby.popup('my-shipping-list', null, async data => {
          if (data.state === 'close') return;

          if (!data.selectedAddress) {
            return;
          }

          this.data.orderSheetAddress = {
            ...data.selectedAddress,
          };

          await this._postCalculate();

          this.setShippingInfoForm({
            address: this.data.orderSheetAddress,
          });
          this.renderPayment();
        });
      },
      onOpenFindAddress() {
        shopby.popup('find-address', {}, async data => {
          $('body').removeClass('popup-open');
          if (data.state === 'close') return;

          const { zipCode, address, jibunAddress } = data;
          this.setShippingInfoForm({
            address: {
              receiverZipCd: zipCode,
              receiverAddress: address,
              receiverJibunAddress: jibunAddress,
              receiverDetailAddress: null,
            },
          });
          this.data.orderSheetAddress = {
            ...this.data.orderSheetAddress,
            receiverZipCd: zipCode,
            receiverAddress: address,
            receiverJibunAddress: jibunAddress,
            receiverDetailAddress: null,
          };

          await this._postCalculate();

          this.renderPayment();
        });
      },
      onChangePayMethods(e) {
        if (e.target.value === 'ACCOUNT') {
          $accountDetailInfo.show();
          $accountDetailInfo.render(this._getAccountDetailInfo());
        } else {
          $accountDetailInfo.hide();
        }
      },
      onBlurTempPassword(e) {
        const { name, value } = e.target;

        const { member } = shopby.helper;
        let resultMessage = '';

        switch (name) {
          case 'password':
            resultMessage = member.passwordValidation(value);

            resultMessage.length > 0
              ? $('#tempPasswordErrorMessage').text(shopby.message[resultMessage]).show()
              : $('#tempPasswordErrorMessage').hide();

            break;

          case 'passwordConfirm':
            resultMessage = member.passwordChkValidation(value);

            resultMessage.length > 0
              ? $('#tempPasswordConfirmErrorMessage').text(shopby.message[resultMessage]).show()
              : $('#tempPasswordConfirmErrorMessage').hide();
            break;

          default:
            resultMessage = '';
        }
      },
      onOpenApplyCoupon(e) {
        e && e.preventDefault();

        shopby.popup('apply-coupon', this.data.coupon, async ({ state, data }) => {
          try {
            if (!data) return;
            if (state === 'ok') this.data.coupon = data;

            await this._postCalculate();
            this.renderPayment();
          } catch (e) {
            if (e.code === 'ODSH0010') {
              shopby.alert(
                '쿠폰 적용 후, 적립금 사용 금액이 결제금액을 초과하여<br> 적립금 사용 금액이 초기화됩니다.',
                async () => {
                  $('#accumulation').val(0);
                  await this._postCalculate();
                  this.renderPayment();
                },
              );
            }
          }
        });
      },
      onOpenTerm(e) {
        const { termId: termKey } = e.target.dataset;

        const title = $(`label[for=agreeCheckbox-${termKey}]`).text();
        const contents = this.data.agreementList.find(({ key }) => key === termKey).contents;

        shopby.popup('terms', { title, contents }, function (data) {
          if (data.state === 'ok') {
            $(`input:checkbox[id=agreeCheckbox-${termKey}]`).prop('checked', true);
          }
        });
      },
      async onClickUseAllAccumulation() {
        const { availableMaxAccumulationAmt } = this.data.paymentInfo;

        $('#accumulation').val(availableMaxAccumulationAmt);

        await this._postCalculate();
        this.renderPayment();
      },
      toggleContent(e) {
        e.target.classList.toggle('on');
      },
    },

    setShippingInfoForm({ address, setAllNull = false }) {
      Object.keys(address).forEach(keyName => {
        $(`input[name=${keyName}]`).val(setAllNull ? null : address[keyName]);
      });

      this.data.orderSheetAddress = {
        ...address,
      };
    },

    async _postCalculate() {
      const { removeComma } = shopby.utils;
      const res = await shopby.api.order.postOrderSheetsOrderSheetNo({
        pathVariable: { orderSheetNo },
        requestBody: {
          accumulationUseAmt: shopby.logined() ? removeComma($('input[name=subPayAmt]').val()) : 0,
          addressRequest: { ...this.data.orderSheetAddress },
          couponRequest: {
            productCoupons: [...this.data.coupon.choiceCoupon.productCoupons],
            cartCouponIssueNo: this.data.coupon.choiceCoupon.cartCouponIssueNo,
            // promotionCode: null,
            // deliveryCouponIssueNo: null,
          },
          shippingAddresses: [], // TODO: 다중배송지, 지금 사용 안함
        },
      });

      this.setPaymentInfo(res.data.paymentInfo);
      this.paymentDisplay();
    },

    paymentDisplay() {
      if (this.data.paymentInfo.paymentAmt === 0) {
        $('#paymentProgressList').hide();
      } else {
        $('#paymentProgressList').show();
      }
    },

    async _fetchData() {
      try {
        const orderSheetResponse = await shopby.api.order.getOrderSheetsOrderSheetNo({
          pathVariable: { orderSheetNo },
        });

        const shopPartner = orderSheetResponse.data.deliveryGroups.find(
          res => res.orderProducts[0].shippingAreaType === 'MALL_SHIPPING_AREA',
        );

        const shopPartnerName = shopPartner ? shopPartner.partnerName : '';

        this.data.partnerMalls = orderSheetResponse.data.sellerPrivacyUsagePartners
          .filter(partner => partner.partnerName !== shopPartnerName)
          .map(partner => partner.partnerName);
        const hasPartner = this.data.partnerMalls.length > 0;
        const termsTypes = shopby.logined()
          ? ['PI_COLLECTION_AND_USE_ON_ORDER']
          : ['PI_COLLECTION_AND_USE_ON_ORDER', 'USE', 'CLEARANCE_INFO_COLLECTION_AND_USE', 'TRANSFER_AGREE'];

        if (hasPartner) termsTypes.splice(1, 0, 'PI_SELLER_PROVISION');
        const termsResponse = await shopby.api.manage.getTerms({
          queryString: { termsTypes },
        });

        if (hasPartner) {
          const replacedTermsPhrase = await shopby.api.manage.postTerms({
            headers: { Version: '1.1' },
            requestBody: {
              termsType: ['PI_SELLER_PROVISION'],
              replacementPhrase: {
                partner: this.data.partnerMalls.join(', '),
              },
            },
          });
          termsResponse.data.pi_seller_provision = replacedTermsPhrase.data.pi_seller_provision;
        }

        return [orderSheetResponse, termsResponse];
      } catch (e) {
        throw new Error('상품정보 변경 및 품절로 인해 주문할 수 없습니다.');
      }
    },

    _getOrderProductsTable() {
      return {
        deliveryGroups: this.data.deliveryGroups,
      };
    },

    _getOrdererInfo() {
      const { ordererInfo } = this.data;

      return { ordererInfo };
    },

    _getShippingInfo() {
      const { requireCustomsIdNumber } = this.data.orderSheetResponse;
      return {
        ...this.data.orderSheetAddress,
        requireCustomsIdNumber,
      };
    },

    _getPaymentInfo() {
      const { paymentInfo } = this.data;
      const mall = shopby.cache.getMall();
      return {
        totalStandardAmt: paymentInfo.totalStandardAmt,
        deliveryAmt: paymentInfo.deliveryAmt,
        totalDiscountAmt:
          paymentInfo.cartCouponAmt +
          paymentInfo.totalAdditionalDiscountAmt +
          paymentInfo.totalImmediateDiscountAmt +
          paymentInfo.productCouponAmt,
        accumulationAmtWhenBuyConfirm: paymentInfo.accumulationAmtWhenBuyConfirm,
        accumulationUnit: (mall.accumulationConfig && mall.accumulationConfig.accumulationUnit) || '원',
        instantDiscount: paymentInfo.totalAdditionalDiscountAmt + paymentInfo.totalImmediateDiscountAmt,
        productCouponAmt: paymentInfo.productCouponAmt,
        cartCouponAmt: paymentInfo.cartCouponAmt,
        remoteDeliveryAmt: paymentInfo.remoteDeliveryAmt,
        paymentAmt: paymentInfo.paymentAmt,
        accumulationAmt: paymentInfo.accumulationAmt,
        availableMaxAccumulationAmt: paymentInfo.availableMaxAccumulationAmt,
        subPayAmt: Number($('input[name=subPayAmt]').val()) || 0,
        useAccumulation:
          !mall.accumulationConfig.useProductAccumulation && !mall.accumulationConfig.useMemberAccumulation,
      };
    },

    _getPayMethods() {
      return {
        payMethods: this.data.payMethods,
      };
    },

    _isEscrow() {
      return {
        isEscrow: this.data.payMethods.some(({ payType }) => payType.includes('ESCROW')),
      };
    },

    _getAccountDetailInfo() {
      return {
        accountBankList: this.data.orderSheetResponse.tradeBankAccountInfos,
      };
    },

    _getOrderBuyFormData() {
      const RPRESENTATIVE_PRODUCT = 0;
      const { productName } = this.data.orderSheetResponse.deliveryGroups[RPRESENTATIVE_PRODUCT].orderProducts[
        RPRESENTATIVE_PRODUCT
      ];
      const { removeComma } = shopby.utils;
      const hasChoiceCoupon = (() => key =>
        this.data.coupon && this.data.coupon.choiceCoupon && this.data.coupon.choiceCoupon[key])();
      const formData = {
        orderSheetNo,
        orderTitle: shopby.utils.truncate(productName, 30),
        pgType: $('input:radio[name="payType"]:checked').data('pgType'),
        payType: $('input:radio[name="payType"]:checked').val(),
        orderer: {
          ordererName: $('input[name="ordererName"]').val(),
          ordererContact1: $('input[name="ordererContact1"]').val(),
          ordererContact2: $('input[name="ordererContact2"]').val(),
          ordererEmail: $('input[name="ordererEmail"]').val(),
        },
        member: shopby.logined(),
        updateMember: shopby.logined() ? $('input:checkbox[name="updateMember"]').is(':checked') : false,
        tempPassword: shopby.logined() ? null : $('input[name="passwordConfirm"]').val(),
        shippingAddress: {
          addressNo: this.data.orderSheetAddress.addressNo,
          countryCd: this.data.orderSheetAddress.countryCd,
          addressName: $('input[name="addressName"]').val(),
          receiverName: $('input[name="receiverName"]').val(),
          receiverZipCd: $('input[name="receiverZipCd"]').val(),
          receiverAddress: $('input[name="receiverAddress"]').val(),
          receiverDetailAddress: $('input[name="receiverDetailAddress"]').val(),
          receiverJibunAddress: $('input[name="receiverJibunAddress"]').val(),
          receiverContact1: $('input[name="receiverContact1"]').val(),
          receiverContact2: $('input[name="receiverContact2"]').val(),
          customsIdNumber: $('input[name="customsIdNumber"]').val(),
        },
        saveAddressBook: shopby.logined() ? $('input:radio[name="shipping"]:checked').val() === 'new' : false,
        useDefaultAddress: shopby.logined() ? $('input:radio[name="shipping"]:checked').val() === 'default' : false,
        paymentAmt: this.data.paymentInfo.paymentAmt,
        paymentAmtForVerification: this.data.paymentInfo.paymentAmt,
        applyCashReceipt: false, // 현금영수증 히스토리 확인 필요
        remitter: $('input[name="remitter"]').val(),
        bankAccountToDeposit: {
          bankAccount: $('select[name=bankAccount] option:selected').val(),
          bankCode: $('select[name=bankAccount] option:selected').data('bank-code'),
          bankDepositorName: $('select[name=bankAccount] option:selected').data('bank-depositor-name'),
        },
        orderMemo: $('input[name="orderMemo"]').val(),
        deliveryMemo: $('input[name="deliveryMemo"]').val(),
        subPayAmt: shopby.logined() ? removeComma($('input[name=subPayAmt]').val()) : 0,
        agreementTypes: $('input:checkbox[name="agreeCheckbox"]:checked')
          .toArray()
          .map(c => c.value),
        coupons: {
          productCoupons: hasChoiceCoupon('productCoupons') ? [...this.data.coupon.choiceCoupon.productCoupons] : [],
          cartCouponIssueNo: hasChoiceCoupon('cartCouponIssueNo')
            ? this.data.coupon.choiceCoupon.cartCouponIssueNo
            : null,
        },
      };
      formData.bankAccountToDeposit =
        !formData.bankAccountToDeposit || !formData.bankAccountToDeposit.bankAccount
          ? null
          : formData.bankAccountToDeposit;
      return formData;
    },

    validateForm() {
      if ($('input[name="ordererName"]').val().trim() === '') {
        throw new Error('주문하시는 분 정보를 입력해주세요.');
      }

      if ($('input[name="ordererContact1"]').val().trim() === '') {
        throw new Error('휴대폰번호를 입력해주세요.');
      } else if ($('input[name="ordererContact1"]').val().length < 10) {
        throw new Error('정확한 휴대폰번호를 입력해주세요.');
      }

      if ($('input[name="ordererEmail"]').val().trim() === '') {
        throw new Error('이메일을 입력해주세요.');
      }

      if (!shopby.regex.email.test($('input[name="ordererEmail"]').val().trim())) {
        throw new Error('올바른 이메일을 입력해 주세요.');
      }

      if ($('input[name="receiverName"]').val().trim() === '') {
        throw new Error('받으실 분 정보를 입력해주세요.');
      }

      const isAllAddressEmpty = ['receiverZipCd', 'receiverAddress', 'receiverDetailAddress'].some(
        name => $(`input[name="${name}"]`).val().trim() === '',
      );
      if (isAllAddressEmpty) {
        throw new Error('주소를 입력해주세요.');
      }

      if ($('input[name="receiverContact1"]').val().trim() === '') {
        throw new Error('휴대폰번호를 입력해주세요.');
      } else if ($('input[name="receiverContact1"]').val().trim().length < 10) {
        throw new Error('정확한 휴대폰번호를 입력해주세요.');
      }

      const { requireCustomsIdNumber } = this.data.orderSheetResponse;
      if (requireCustomsIdNumber && $('input[name="customsIdNumber"]').val().trim() === '') {
        throw new Error('개인통관고유부호를 입력해주세요.');
      } else if (
        requireCustomsIdNumber &&
        (!shopby.regex.customsId.test($('input[name="customsIdNumber"]').val().trim()) ||
          $('input[name="customsIdNumber"]').val().trim().length < 13)
      ) {
        throw new Error('개인통관고유부호가 유효하지 않습니다.');
      }

      const notPay = this.data.paymentInfo.paymentAmt === 0;
      const isAccount = $('input:radio[name="payType"]:checked').val() === 'ACCOUNT';
      const isEmptyRemitter = $('input[name="remitter"]').val().trim().length === 0;
      if (!notPay && isAccount && isEmptyRemitter) {
        throw new Error('입금자명 입력하세요');
      }

      if (!shopby.logined()) {
        const tempPassword = $('input[name="password"]').val();
        const tempPasswordConfirm = $('input[name="passwordConfirm"]').val();
        if (tempPassword.length === 0) {
          throw new Error('비회원 임시 비밀번호를 입력해주세요.');
        }

        const resultMessage = shopby.helper.member.passwordValidation(tempPassword);
        if (resultMessage.length > 0) {
          throw new Error(shopby.message[resultMessage]);
        }

        if (tempPassword !== tempPasswordConfirm) {
          throw new Error('비회원 임시 비밀번호가 서로 다릅니다. 다시 확인해주세요.');
        }
      }

      // 결제정보 확인
      const { orderTitle, payType, pgType, orderer, shippingAddress } = this._getOrderBuyFormData();
      if (
        !orderSheetNo ||
        !orderTitle ||
        !payType ||
        !pgType ||
        !orderer.ordererName ||
        !shippingAddress.receiverName
      ) {
        throw new Error('결제 가능한 수단이 존재하지 않습니다.');
      }

      const checkedAgreements = $('input:checkbox[name="agreeCheckbox"]:checked')
        .toArray()
        .map(c => c.value);
      const needCheckedAggrements = shopby.logined()
        ? ['PI_COLLECTION_AND_USE_ON_ORDER', 'ORDER_DEFAULT']
        : ['PI_COLLECTION_AND_USE_ON_ORDER', 'USE', 'ORDER_DEFAULT'];
      if (this.data.partnerMalls.length > 0) {
        needCheckedAggrements.push('PI_SELLER_PROVISION');
      }
      const isAllChecked = needCheckedAggrements.every(needCheckedAggrement =>
        checkedAgreements.includes(needCheckedAggrement),
      );
      if (!isAllChecked) {
        throw new Error('동의 항목에 체크하여야 결제를 진행할 수 있습니다.');
      }
    },
  };

  shopby.start.initiate(shopby.order.initiate.bind(shopby.order));
});

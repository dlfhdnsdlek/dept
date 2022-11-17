/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.15
 */

$(() => {
  const orderNo = shopby.utils.getUrlParam('orderNo');
  const $orderEndCompletion = $('#orderEndCompletion');
  const $orderInfoTable = $('#orderInfoTable');

  shopby.orderComplete = {
    data: {
      orderDetailResponse: null,
      isPaySuccess: shopby.utils.getUrlParam('result') === 'SUCCESS',
      orderProductInfos: null,
    },

    async initiate() {
      this._checkIsPayPopup();
      await this._fetchOrderDetail();
      this.render();
      this.bindEvents();
    },
    /*
     * 주문페이지(부모)에서 결제창(자식)을 띄우고 결제완료/취소하는 경우 주문완료페이지가 결제창에서 노출되는 경우
     * 결제창은 닫고 결제창을 띄어준 부모창으로 url을 넘겨줌.
     * */
    _checkIsPayPopup() {
      if (opener) {
        opener.location.href = self.location.href;
        self.close();
      }
    },
    async _fetchOrderDetail() {
      if (shopby.logined()) {
        // 회원 주문 조회
        const res = await shopby.api.order.getProfileOrdersOrderNo({
          pathVariable: { orderNo },
        });
        shopby.setGlobalVariableBy('ORDER_COMPLETE', res.data);
        this.data.orderDetailResponse = res.data;

        this.callOrderNaverInflow(res.data);
      } else {
        // 비회원 주문 조회
        if (!orderNo) return;
        const guestToken = shopby.utils.getUrlParam('guestToken');
        shopby.cache.setGuestToken(guestToken);

        const res = await shopby.api.order.getGuestOrdersOrderNo({
          pathVariable: { orderNo },
          queryString: { orderRequestType: 'ALL' },
        });
        shopby.setGlobalVariableBy('ORDER_COMPLETE', res.data);
        this.data.orderDetailResponse = res.data;

        this.callOrderNaverInflow(res.data);
      }
    },

    callOrderNaverInflow(orderDetailResponse) {
      if (shopby.naverInflow) {
        const cpaOrder = this.makeCpaOrder(orderDetailResponse);
        shopby.naverInflow.wcsDoCPA(
          cpaOrder,
          (orderDetailResponse &&
            orderDetailResponse.firstOrderAmount &&
            orderDetailResponse.firstOrderAmount.totalProductAmt) ||
            0,
        );
      }
    },

    makeCpaOrder(orderDetailResponse) {
      const { orderOptionsGroupByPartner } = orderDetailResponse;
      return (
        orderOptionsGroupByPartner &&
        orderOptionsGroupByPartner
          .flatMap(({ orderOptionsGroupByDelivery }) => orderOptionsGroupByDelivery)
          .flatMap(({ orderOptions }) => orderOptions)
          .map(orderOption => ({
            oid: orderOption.orderNo,
            poid: orderOption.orderOptionNo,
            pid: orderOption.productNo,
            parpid: null,
            name: orderOption.productName,
            cnt: orderOption.orderCnt,
            price: orderOption.price.buyAmt,
            deliveryMemo: orderOption.deliveryMemo,
          }))
      );
    },

    render() {
      const defaultOrderStatusType =
        (this.data.orderDetailResponse && this.data.orderDetailResponse.defaultOrderStatusType) || null;

      $orderEndCompletion.render(this._getOrderEndCompletion(defaultOrderStatusType));
      $orderInfoTable.render(this._getOrderInfoTable());
      $('#orderSummaryTitle').render({ hasOrderData: !!defaultOrderStatusType });
      $('#orderCompleteBtns').render({ isPaySuccess: this.data.isPaySuccess });
    },

    bindEvents() {
      $('.btn_order_prev').click(e => {
        e.preventDefault();
        location.href = `/pages/order/order.html?ordersheetno=${shopby.utils.getUrlParam('orderSheetNo')}`;
      });
    },

    _getOrderEndCompletion(defaultOrderStatusType) {
      const serviceCenterNumber = shopby.cache.getMall().mall.serviceCenter.phoneNo;
      const messages = {
        DEPOSIT_WAIT: {
          imageUrl: '/assets/img/order/order_end_completion.png',
          mainMessage: '주문이 정상적으로 접수 되었습니다.',
          subMessage: '감사합니다.',
        },
        PAY_DONE: {
          imageUrl: '/assets/img/order/order_end_completion.png',
          mainMessage: '결제가 완료 되었습니다.',
          subMessage: '감사합니다.',
        },
        PAY_FAIL: {
          imageUrl: '/assets/img/order/order_end_error.png',
          mainMessage: '결제가 정상적으로 이루어지지 않았습니다. 다시 결제 진행을 해주시기 바랍니다.',
          subMessage: '지속적으로 문제가 발생될 경우 관리자에게 문의 하시기 바랍니다.',
        },
        DEFAULT: {
          imageUrl: '/assets/img/order/order_end_error.png',
          mainMessage: '이미 결제가 완료된 주문입니다.',
          subMessage: '감사합니다.',
        },
        UNDEFINED: {
          imageUrl: '/assets/img/order/order_end_error.png',
          mainMessage: this.data.isPaySuccess
            ? '주문 정보가 없습니다. 다시 확인 바랍니다.'
            : shopby.utils.getUrlParam('message'),
          subMessage: `실패사유를 확인하신 후 '이전페이지 가기' 또는 '장바구니 가기' 버튼을 통해 주문/결제를 다시 시도하시기 바랍니다. 계속 실패되시는 경우 고객센터 ${serviceCenterNumber}로 문의 주시기 바랍니다.`,
        },
      };

      if (!defaultOrderStatusType) {
        return messages['UNDEFINED'];
      }

      // https://nhnent.dooray.com/project/posts/3160221005204803811
      if (defaultOrderStatusType === 'DELIVERY_DONE') {
        let isDeliveryTypeNone = true;

        this.data.orderDetailResponse.orderOptionsGroupByPartner
          .flatMap(partner => partner.orderOptionsGroupByDelivery)
          .map(orderOption => {
            if (orderOption.deliveryType !== 'NONE') {
              isDeliveryTypeNone = false;
            }
          });

        if (isDeliveryTypeNone) {
          return messages['PAY_DONE'];
        }
      }

      return messages[defaultOrderStatusType] || messages['DEFAULT'];
    },

    _getOrderInfoTable() {
      const hasOrderData = this.data.orderDetailResponse && !!this.data.orderDetailResponse.defaultOrderStatusType;
      if (!hasOrderData) {
        return { hasOrderData };
      }

      const { orderDetailResponse } = this.data;
      const {
        immediateDiscountAmt,
        productCouponDiscountAmt,
        cartCouponDiscountAmt,
      } = orderDetailResponse.lastOrderAmount;
      this.hideBankInfo(orderDetailResponse.payType);

      const { accumulationConfig } = shopby.cache.getMall();

      return {
        hasOrderData,
        orderNo: orderDetailResponse.orderNo,
        orderYmdt: orderDetailResponse.orderYmdt,
        deliveryMemo: orderDetailResponse.deliveryMemo,
        payTypeLabel: orderDetailResponse.payTypeLabel,
        ordererName: orderDetailResponse.orderer.ordererName,
        shippingAddress: orderDetailResponse.shippingAddress,
        lastOrderAmount: orderDetailResponse.lastOrderAmount,
        bankInfo: (orderDetailResponse.payInfo && orderDetailResponse.payInfo.bankInfo) || null,
        accumulationUnit:
          accumulationConfig && accumulationConfig.accumulationName ? accumulationConfig.accumulationName : '원',
        accumulationAmtWhenBuyConfirm: orderDetailResponse.accumulationAmtWhenBuyConfirm,
        productTitles: this.makeProductTitles(
          (orderDetailResponse && orderDetailResponse.orderOptionsGroupByPartner) || [],
        ),
        totalDiscountAmt: immediateDiscountAmt + productCouponDiscountAmt + cartCouponDiscountAmt,
      };
    },

    hideBankInfo(payType) {
      const bankInfoPayTypes = ['ACCOUNT', 'VIRTUAL_ACCOUNT', 'ESCROW_VIRTUAL_ACCOUNT'];
      if (bankInfoPayTypes.includes(payType) === false) {
        $('#bankInfo').hide();
      }
    },
    makeProductTitles(orderOptionsGroupByPartner) {
      const getOptionTit = tit => {
        const result = tit.split('/').reduce((acc, title) => {
          const [tit, value] = title.split(':');
          if (!value) return '';
          acc += `<strong>${tit}</strong>: ${value} | `;
          return acc;
        }, '');
        return result.slice(0, result.trim().length - 1);
      };

      return orderOptionsGroupByPartner
        .flatMap(({ orderOptionsGroupByDelivery }) => orderOptionsGroupByDelivery)
        .flatMap(({ orderOptions }) => orderOptions)
        .map(({ productNo, productName, optionTitle, inputs }) => ({
          productNo,
          productName,
          optionTitle: getOptionTit(optionTitle),
          optionInputs: inputs.map(({ inputLabel, inputValue }) => `<strong>${inputLabel}</strong>: ${inputValue}`),
        }));
    },
  };

  shopby.start.initiate(shopby.orderComplete.initiate.bind(shopby.orderComplete));
});

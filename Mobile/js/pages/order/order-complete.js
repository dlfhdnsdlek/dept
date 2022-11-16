/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.15
 */

$(() => {
  const orderNo = shopby.utils.getUrlParam('orderNo');
  const $orderInfoTable = $('#orderInfoTable');

  shopby.orderComplete = {
    data: {
      orderDetailResponse: null,
      isPaySuccess: shopby.utils.getUrlParam('result') === 'SUCCESS',
      orderProductInfos: null,
    },

    async initiate() {
      const result = shopby.utils.getUrlParam('result');
      const orderSheetNo = shopby.utils.getUrlParam('orderSheetNo');
      if (result !== 'SUCCESS' && result === '2222') {
        const orderPage = `/pages/order/order.html?ordersheetno=${orderSheetNo}`;
        window.location.replace(orderPage);
        return;
      }
      await this._fetchOrderDetail();
      this.render();
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
          }))
      );
    },

    render() {
      const defaultOrderStatusType =
        (this.data.orderDetailResponse && this.data.orderDetailResponse.defaultOrderStatusType) || '';

      $orderInfoTable.render(this._getOrderInfoTable());
      $('#orderSummaryTitle').render({ hasOrderData: !!defaultOrderStatusType });
    },

    _getOrderInfoTable() {
      const { orderDetailResponse } = this.data;
      const hasOrderData = orderDetailResponse && !!orderDetailResponse.defaultOrderStatusType;
      if (!hasOrderData) {
        return {
          hasOrderData,
          orderEndCompletion: this._getOrderEndCompletion(
            (orderDetailResponse && orderDetailResponse.defaultOrderStatusType) || null,
          ),
        };
      }

      const {
        immediateDiscountAmt,
        productCouponDiscountAmt,
        cartCouponDiscountAmt,
      } = orderDetailResponse.lastOrderAmount;
      const bankInfoPayTypes = 'ACCOUNT';
      const virtualInfoPayTypes = ['VIRTUAL_ACCOUNT', 'ESCROW_VIRTUAL_ACCOUNT'];

      return {
        hasOrderData,
        orderNo: orderDetailResponse.orderNo,
        orderYmdt: orderDetailResponse.orderYmdt,
        deliveryMemo: orderDetailResponse.deliveryMemo,
        payTypeLabel: orderDetailResponse.payTypeLabel,
        payType: orderDetailResponse.payType,
        ordererName: orderDetailResponse.orderer.ordererName,
        shippingAddress: orderDetailResponse.shippingAddress,
        lastOrderAmount: orderDetailResponse.lastOrderAmount,
        hasBankInfo: bankInfoPayTypes.includes(orderDetailResponse.payType),
        hasVirtualInfo: virtualInfoPayTypes.includes(orderDetailResponse.payType),
        bankInfo:
          orderDetailResponse.payInfo && orderDetailResponse.payInfo.bankInfo
            ? orderDetailResponse.payInfo.bankInfo
            : null,
        accumulationAmtWhenBuyConfirm: orderDetailResponse.accumulationAmtWhenBuyConfirm,
        productTitles: this.makeProductTitles(
          (orderDetailResponse && orderDetailResponse.orderOptionsGroupByPartner) || null,
        ),
        totalDiscountAmt: immediateDiscountAmt + productCouponDiscountAmt + cartCouponDiscountAmt,
        orderEndCompletion: this._getOrderEndCompletion(orderDetailResponse.defaultOrderStatusType),
      };
    },

    _getOrderEndCompletion(defaultOrderStatusType) {
      const messages = {
        DEPOSIT_WAIT: {
          mainMessage: '주문이 정상적으로 접수 되었습니다.',
        },
        PAY_DONE: {
          mainMessage: '결제가 완료 되었습니다.',
        },
        PAY_FAIL: {
          mainMessage: '결제가 정상적으로 이루어지지 않았습니다. 다시 결제 진행을 해주시기 바랍니다.1',
        },
        DEFAULT: {
          mainMessage: '이미 결제가 완료된 주문입니다.',
        },
        UNDEFINED: {
          mainMessage: this.data.isPaySuccess
            ? '주문 정보가 없습니다. 다시 확인 바랍니다.'
            : shopby.utils.getUrlParam('message'),
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

      return messages[defaultOrderStatusType] ? messages[defaultOrderStatusType] : messages['DEFAULT'];
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

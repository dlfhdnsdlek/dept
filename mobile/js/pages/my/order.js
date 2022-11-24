/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.19
 *
 */

$(() => {
  shopby.my.order = {
    orderNo: shopby.utils.getUrlParam('orderNo'),
    claimImages: null,
    refundInfos: null,
    additionalPayInfos: null,
    isMember: false,
    async initiate() {
      if (!this.orderNo) {
        location.href = '/pages/my/orders.html';
      }
      await this.render();
      this.bindEvents();
    },

    async render() {
      $('.spanOrderNo').text(this.orderNo);
      const { orderProductInfo, ordererInfo, shippingAddressInfo, paymentInfo, claimInfo } = await this.getOrderData();
      this.refundInfos = claimInfo.refundInfos;
      this.additionalPayInfos = claimInfo.additionalPayInfos;
      $('#orderDetailTable').render({ ...orderProductInfo, logined: shopby.logined() });
      $('#orderMemberInfo').render(ordererInfo);
      $('#shippingAddressInfo').render(shippingAddressInfo);
      $('#paymentInfo').render(paymentInfo);
      $('#claimInfo').render(claimInfo);
      if (shopby.logined()) {
        $('#writeButton').render();
      }
    },
    displayCallOut({ target }) {
      const claimType = $(target).data('claim-type');
      const refundIndex = $(target).data('refund-index');
      const removeCallout = ({ target, currentTarget }) => {
        if (target.nodeName.toLowerCase() !== 'button') return;
        currentTarget.parentNode.removeChild(currentTarget);
      };
      const calloutEl = (() => {
        let item, getItem, getTextOption, claimHtml;
        switch (claimType) {
          case 'refund':
            item = this.refundInfos[refundIndex].claimPopupData.find((data, index) => index == target.dataset.index);
            getItem = ({ title, value }) => `<li>${title} : ${value}</li>`;
            getTextOption = ({ inputLabel, inputValue }) => `<li>- ${inputLabel} : ${inputValue}</li>`;
            claimHtml = `<p><em>(환불수량 ${item.orderCnt}개) ${item.productName}</em></p>
                <ul>
                    ${item.options.map(getItem).join('')}
                    ${item.textOptions.map(getTextOption).join('')}
                </ul>`;
            break;
          case 'exchange':
            item = this.additionalPayInfos
              ? this.additionalPayInfos[refundIndex].exchangeOrderOption
              : this.refundInfos[refundIndex].exchangeOrderOption;
            claimHtml = `<p><em>(수량 ${item.orderCnt}개) ${item.productName}</em></p>
                        <p>${item.optionName} : ${item.optionValue}</p>
                        <p>${item.userInputTextStr ? item.userInputTextStr : ''}</p>
                        `;
            break;
          default:
            break;
        }
        return `
        <div class="claimInfo-callout">
            <div class="claimInfo-callout__inner">
                ${claimHtml}
                <button>확인</button>
            </div>
        </div>
      `;
      })();

      $('body').append(calloutEl);
      $('.claimInfo-callout').on('click', removeCallout);
    },
    bindEvents() {
      $('.vis_mode').on('click', this.openSlideImagesPopup.bind(this));
      $('.claimStatusBtn').on('click', this.onClickClaimStatusBtn.bind(this));
      $('.statusNextAction,.nextActionBtn').on('click', this.onClickStatusNextAction.bind(this));
      $('.order_goods_list').on('click', '#btn_write', this.onClickInquiryBtn);
      $('.claimInfo__btn').on('mouseenter, click', this.displayCallOut.bind(this));
    },

    openSlideImagesPopup({ currentTarget }) {
      const $currentTarget = $(currentTarget);
      const claimOrder = Number($currentTarget.data('claim-order'));
      const attachImages = this.claimImages[claimOrder].map((imageUrl, index) => ({
        imageUrl,
        fileName: `반품 이미지 - ${index}`,
      }));

      shopby.popup('slide-images', {
        title: '반품 이미지',
        imageObjectList: attachImages,
        clickedImageIndex: $currentTarget.index(),
      });
    },

    onClickClaimStatusBtn({ target }) {
      const { claimNo } = target.dataset;
      shopby.popup('claim-info', claimNo);
    },

    onClickStatusNextAction({ target }) {
      const { action, actionUri, deliveryType } = target.dataset;

      switch (action) {
        case 'VIEW_DELIVERY':
          this._openDeliveryRetrieve(deliveryType, actionUri);
          break;
        case 'CONFIRM_ORDER':
          this._confirmOrder(target, actionUri);
          break;
        case 'WRITE_REVIEW':
          this._writeReview(target);
          break;
        case 'NO_CANCEL':
        case 'CANCEL':
        case 'CANCEL_ALL':
        case 'RETURN':
        case 'EXCHANGE':
          this._registerClaim(target);
          break;
        case 'WITHDRAW_CANCEL':
        case 'WITHDRAW_RETURN':
        case 'WITHDRAW_EXCHANGE':
          this._cancelClaim(target);
          break;
        default:
          break;
      }
    },

    onClickInquiryBtn() {
      shopby.popup('inquiry', {}, data => {
        if (data && data.state === 'close') return;
        window.location.href = '/pages/my/inquiries.html';
      });
    },

    _openDeliveryRetrieve(deliveryType, actionUri) {
      if (deliveryType !== 'PARCEL_DELIVERY') {
        shopby.alert('직접배송의 경우 배송조회를 지원하지 않습니다.\n판매자에게 문의해주세요.');
        return;
      }
      window.open(actionUri, '_blank', 'toolbar=yes,location=yes,menubar=yes');
    },

    async _confirmOrder(target, actionUri) {
      const $targetLi = $(target).parents('li.order_product');
      const orderNo = $targetLi.data('orderNo');
      const payType = $targetLi.data('payType');

      const $arrLi = $.makeArray($('.my_goods li.order_product')).filter(li => $(li).data('orderNo') === orderNo);

      if (['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(payType)) {
        // 1. 일부 옵션이 구매 확정 불가능한 경우 - 근데 어차피 어드민에서 에스크로 결제의 경우 부분 배송처리가 안되기 때문에 노출 안될듯
        if ($arrLi.filter(tr => $(tr).data('orderStatusType') !== 'DELIVERY_ING').length > 0) {
          shopby.alert('에스크로 결제 건은 모든 상품이 구매확정이 가능한 경우에만 구매확정처리가 가능합니다.');
          return;
        }

        // 2. 모든 옵션이 구매 확정 가능한 경우
        shopby.confirm(
          {
            message: '에스크로 결제 건은 주문한 모든 상품에 대한 구매확정만 가능합니다. 진행하시겠습니까?',
          },
          result => {
            if (result.state === 'ok') {
              shopby.alert(
                '에스크로 결제 건은 결제업체에서 발송한 이메일에서만 구매확정 처리가 가능합니다.\n이메일 수신함을 확인해주세요.',
              );
            }
          },
        );
      } else {
        this._fetchOrderConfirm([actionUri.split('/')[3]]);
      }
    },

    async _fetchOrderConfirm(orderOptionNos = []) {
      if (orderOptionNos.length === 0) {
        return;
      }

      const arrFetch = orderOptionNos.map(orderOptionNo => {
        return shopby.api.order[
          this.isMember ? 'putProfileOrderOptionsOrderOptionsNoConfirm' : 'putGuestOrderOptionsOrderOptionsNoConfirm'
        ]({ pathVariable: { orderOptionNo } });
      });

      try {
        await Promise.all(arrFetch);
        shopby.alert('구매확정 처리되었습니다.', () => {
          location.reload();
        });
      } catch (e) {
        location.reload();
      }
    },

    _getReviewOption(target) {
      const { actionUri } = target.dataset;
      const $product = $(target).closest('li.order_product');
      const { optionNo, orderOptionNo, orderStatusType } = target.closest('li.order_product').dataset;
      const product = {
        productNo: actionUri.split('/')[2],
        productName: $product.find('.product_name').text().trim(),
        imageUrls: $product.find('img').attr('src'),
        optionText: $product.find('.prd_option').text().trim(),
        orderStatusType,
      };
      return {
        productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig,
        notSelectProduct: true,
        orderStatusType,
        product,
        options: [{ orderOptionNo, optionNo }],
      };
    },

    _writeReview(target) {
      const $targetLi = $(target).parents('li.order_product');
      const payType = $targetLi.data('payType');
      const orderStatusType = $targetLi.data('orderStatusType');

      if (!this.isMember) {
        shopby.alert('선택하신 상품은 후기를 작성하실 수 없습니다.');
        return;
      }

      if (
        ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(payType) &&
        orderStatusType !== 'BUY_CONFIRM'
      ) {
        shopby.alert('에스크로 결제 건은 구매확정 이후 후기작성이 가능합니다.');
        return;
      }

      const registerReview = () => {
        try {
          shopby.popup('product-review', this._getReviewOption(target), ({ state }) => {
            if (state !== 'ok') return;
            location.reload();
          });
        } catch (err) {
          console.log(err);
        }
      };
      registerReview();
    },

    _registerClaim(target) {
      try {
        const { action } = target.dataset;
        const { orderNo, orderStatusType, orderOptionNo, payType } = target.closest('li').dataset;
        const escrowOrderTypes = ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'];

        this.validateNaverPay(orderStatusType, payType, action);

        //결제완료 이후
        if (orderStatusType !== 'DEPOSIT_WAIT') {
          //에스크로 : 결제완료 이후 주문건이 있는 경우
          if (action === 'NO_CANCEL' && escrowOrderTypes.includes(payType)) {
            shopby.alert(
              '에스크로 결제 건은 모든 상품이 결제완료 상태에서만 취소신청이 가능합니다.<br>취소신청은 1:1문의를 통해 문의해주세요.',
            );
            return;
          }

          if (action === 'EXCHANGE' && escrowOrderTypes.includes(payType)) {
            shopby.alert('에스크로 결제 건은 교환 신청이 불가합니다.<br>취소/반품 후 재주문으로 처리해 주세요');
            return;
          }

          if (action === 'RETURN' && escrowOrderTypes.includes(payType)) {
            shopby.alert(
              '에스크로 결제 건은 결제업체에서 발송한 이메일에서만<br>반품신청이 가능합니다. 이메일 수신함을 확인해주세요',
              () => (window.location.href = '/pages/my/orders.html'),
            );
            return;
          }

          //에스크로 : 결제완료건
          if (escrowOrderTypes.includes(payType) && orderStatusType === 'PAY_DONE') {
            shopby.confirm(
              { message: `에스크로 결제 건은 전체 취소신청만 가능합니다.<br>모두 취소신청 하시겠습니까?` },
              ({ state }) => {
                if (state !== 'ok') return;
                this._goClaimPage(action, orderOptionNo, orderNo);
              },
            );
            return;
          }

          //일반 주문건은 클레임 신청페이지로
          this._goClaimPage(action, orderOptionNo, orderNo);
          return;
        }

        //무통장입금 결제건
        if (payType === 'ACCOUNT') {
          shopby.popup('cancel-message', null, ({ state, result }) => {
            if (state !== 'ok') return;
            result === 'all' ? this._cancelAllOrder(orderNo) : this._goClaimPage(action, orderOptionNo, orderNo);
          });
          return;
        }

        //에스크로 결제건 또는 가상계좌건
        if (escrowOrderTypes.includes(payType) || payType === 'VIRTUAL_ACCOUNT') {
          const payTypeLabel = escrowOrderTypes.includes(payType) ? '에스크로' : '가상계좌';

          shopby.confirm(
            { message: `${payTypeLabel} 결제 건은 전체 취소신청만 가능합니다.<br>모두 취소신청 하시겠습니까?` },
            ({ state }) => {
              if (state !== 'ok') return;
              this._cancelAllOrder(orderNo);
            },
          );
          return;
        }
      } catch (e) {
        console.error(e);
        shopby.alert(e.message);
      }
    },

    validateNaverPay(orderStatusType, payType, action) {
      const errorMessage = `네이버페이 주문은 네이버페이에서 ${this._getNextActionLabel(action)} 하실 수 있습니다.`;

      const depositWaitNaverPay = orderStatusType === 'DEPOSIT_WAIT' && payType === 'NAVER_PAY';
      if (depositWaitNaverPay) {
        throw new Error(errorMessage);
      }

      const exchangeNaverPay = action === 'EXCHANGE' && payType === 'NAVER_PAY';
      if (exchangeNaverPay) {
        throw new Error(errorMessage);
      }

      const confirmOrderNaverPay = action === 'CONFIRM_ORDER' && payType === 'NAVER_PAY';
      if (confirmOrderNaverPay) {
        throw new Error(errorMessage);
      }

      const writeReviewNaverPay =
        action === 'WRITE_REVIEW' &&
        payType === 'NAVER_PAY' &&
        (orderStatusType === 'DELIVERY_ING' || orderStatusType === 'DELIVERY_DONE');
      if (writeReviewNaverPay) {
        throw new Error('네이버페이 주문은 네이버페이에서 구매확정 이후 후기작성이 가능합니다.');
      }
    },

    async _cancelAllOrder(orderNo) {
      try {
        const postClaimsCancel = shopby.logined()
          ? shopby.api.claim.postProfileOrdersOrderNoClaimsCancel
          : shopby.api.claim.postGuestOrdersOrderNoClaimsCancel;

        await postClaimsCancel({
          pathVariable: { orderNo },
          requestBody: { orderNo },
        });
        shopby.alert('주문취소가 완료되었습니다.', () => {
          location.reload();
        });
      } catch (e) {
        console.error(e);
        shopby.alert(e.message);
      }
    },

    _goClaimPage(action, orderOptionNo, orderNo) {
      const claimType = action === 'CANCEL_ALL' ? 'CANCEL' : action;
      location.href = `/pages/my/order-claim.html?orderNo=${orderNo}&orderOptionNo=${orderOptionNo}&type=${claimType}`;
    },

    _cancelClaim(target) {
      const { action, claimNo } = target.dataset;
      const currentClaimNo = Number(claimNo);
      const actionType = { WITHDRAW_CANCEL: '취소', WITHDRAW_EXCHANGE: '교환', WITHDRAW_RETURN: '반품' }[action];

      const claimNos = target.closest('li').dataset.claimNos.split(',');
      const checkClaimNo = claimNos.some(claimNo => Number(claimNo) > currentClaimNo);
      const message = checkClaimNo
        ? '철회 시 후순위 클레임의 결제/환불 금액이 변동됩니다.<br>클레임을 철회하시겠습니까?'
        : `${actionType}신청을 철회하시겠습니까?`;

      shopby.confirm({ message }, async ({ state }) => {
        if (state !== 'ok') return;
        try {
          const pathVariable = { claimNo: currentClaimNo };

          shopby.logined()
            ? await shopby.api.claim.putProfileClaimsClaimNoWithdraw({ pathVariable })
            : await shopby.api.claim.putGuestClaimsClaimNoWithdraw({ pathVariable });

          shopby.alert(`${actionType}신청철회가 완료되었습니다.`, () => {
            location.reload();
          });
        } catch (e) {
          console.error(e);
          location.reload();
        }
      });
    },

    async getOrderData() {
      const request = { pathVariable: { orderNo: this.orderNo } };
      const { data } = shopby.logined()
        ? await shopby.api.order.getProfileOrdersOrderNo(request)
        : await shopby.api.order.getGuestOrdersOrderNo(request);
      shopby.setGlobalVariableBy('ORDER_DETAIL', data);
      this.claimImages = (data.refundInfos && data.refundInfos.map(({ claimImageUrls }) => claimImageUrls)) || null;

      return {
        orderProductInfo: this._orderProductInfo(data),
        ordererInfo: this._ordererInfo(data),
        shippingAddressInfo: this._shippingAddressInfo(data),
        paymentInfo: this._paymentInfo(data),
        claimInfo: this._claimInfo(data),
      };
    },

    _orderProductInfo(order) {
      const orderOptionsGroupByDelivery = order.orderOptionsGroupByPartner.flatMap(
        ({ orderOptionsGroupByDelivery }) => orderOptionsGroupByDelivery,
      );

      return orderOptionsGroupByDelivery.map(orderOptionGroupByDelivery => {
        const hasEscrowClaim = order.escrow && orderOptionsGroupByDelivery.map(o => o.claimNo).every(v => v !== null);
        const orderOptions = orderOptionGroupByDelivery.orderOptions || [];

        return {
          orderYmdt: order.orderYmdt.substr(0, 10),
          orderNo: order.orderNo,
          orderOption: orderOptionGroupByDelivery.orderOptions.map(orderOption => ({
            productNo: orderOption.productNo,
            orderOptionNo: orderOption.orderOptionNo,
            optionNo: orderOption.optionNo,
            claimNos: orderOptions.map(({ claimNo }) => claimNo).join(','),
            claimNo: orderOption.claimNo,
            imageUrl: orderOption.imageUrl,
            productName: shopby.utils.substrWithPostFix(orderOption.productName),
            optionTextInfo: shopby.utils.createOptionText(orderOption),
            orderCnt: orderOption.orderCnt,
            buyAmt: orderOption.price.buyAmt,
            orderStatusText: this._createOrderStatusText(orderOption),
            nextActionText:
              hasEscrowClaim && ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(order.payType)
                ? this._createNextActionText(order, orderOption.orderStatusType)
                : this._createNextActionText(orderOption),
            orderStatusType: orderOption.orderStatusType,
            orderStatusTypeLabel: orderOption.orderStatusTypeLabel,
            payType: order.payType,
            pgType: order.pgType,
          })),
        };
      });
    },

    _ordererInfo(order) {
      return {
        ...order.orderer,
        orderMemo: order.orderMemo,
      };
    },

    _shippingAddressInfo(order) {
      return {
        ...order.shippingAddress,
        deliveryMemo: order.deliveryMemo,
      };
    },

    _paymentInfo({ firstOrderAmount, payInfo, accumulationAmtWhenBuyConfirm, payTypeLabel }) {
      const {
        additionalDiscountAmt,
        immediateDiscountAmt,
        productCouponDiscountAmt,
        cartCouponDiscountAmt,
      } = firstOrderAmount;
      const {
        accumulationConfig: { accumulationName, accumulationUnit },
      } = shopby.cache.getMall();

      return {
        firstOrderAmount: {
          ...firstOrderAmount,
          totalDiscountAmt:
            additionalDiscountAmt + immediateDiscountAmt + productCouponDiscountAmt + cartCouponDiscountAmt,
        },
        payInfo: {
          ...payInfo,
          payTypeLabel,
        },
        accumulationAmtWhenBuyConfirm,
        accumulationName,
        accumulationUnit,
      };
    },

    _claimInfo(order) {
      const onlyDataIndex = 0;
      const { orderOptionsGroupByPartner } = order;
      const { orderOptionsGroupByDelivery } = orderOptionsGroupByPartner[onlyDataIndex];

      const getClaimDatas = no => {
        const result = orderOptionsGroupByDelivery.reduce((acc, item) => {
          const aClaimData = item.orderOptions
            .filter(option => option.claimNo === no)
            .map(item => ({
              orderNo: item.orderNo,
              productNo: item.productNo,
              orderCnt: item.orderCnt,
              options: [{ title: item.optionName, value: item.optionValue }],
              textOptions: item.inputs,
              productName: item.productName,
              imageUrl: item.imageUrl,
            }));
          acc.push(...aClaimData);
          return acc;
        }, []);
        return result;
      };

      return {
        refundInfos:
          order.refundInfos &&
          order.refundInfos.map(refundInfo => ({
            ...refundInfo,
            claimClassType: refundInfo.claimClassType === 'ORDER_CANCEL' ? false : true,
            refundAccountInfo: this._createRefundAccountText(refundInfo),
            returnWayLabel: refundInfo.returnWayType === 'SELLER_COLLECT' ? '판매자수거요청' : '구매자직접반품',
            refundMethod: this._createRefundMethod(refundInfo),
            exchangeOrderOption: {
              ...refundInfo.exchangeOrderOption,
              productOptionText: this._createClaimOptionText(refundInfo.exchangeOrderOption),
            },
            claimPopupData: getClaimDatas(refundInfo.claimNo),
          })),
        additionalPayInfos:
          order.additionalPayInfos &&
          order.additionalPayInfos.map(payInfo => {
            return {
              ...payInfo,
              returnWayLabel: payInfo.returnWayType === 'SELLER_COLLECT' ? '판매자수거요청' : '구매자직접반품',
              refundMethod: this._createRefundMethod(payInfo),
            };
          }),
        returnAddresses:
          order.additionalPayInfos &&
          order.additionalPayInfos.map(({ returnAddress, returnWayType }) => ({
            ...returnAddress,
            returnWayLabel: returnWayType === 'SELLER_COLLECT' ? '판매자수거요청' : '구매자직접반품',
          })),
      };
    },

    _createOrderStatusText(orderOption) {
      this.isMember = orderOption.member;
      const statusText = orderOption.claimStatusType
        ? `<a href="javascript:;" data-action="cancel" data-claim-no="${orderOption.claimNo}" class="order_ing_btn claimStatusBtn">${orderOption.claimStatusTypeLabel}</a>`
        : `<span>${orderOption.orderStatusTypeLabel}</span>`;

      const orderStatusTypes = ['VIEW_DELIVERY', 'CONFIRM_ORDER', 'WRITE_REVIEW'];
      const statusButton = orderOption.nextActions
        .filter(({ nextActionType }) => orderStatusTypes.includes(nextActionType))
        .sort((_, { nextActionType }) => (nextActionType === 'WRITE_REVIEW' ? -1 : 1))
        .map(({ nextActionType, uri }) => {
          const buttonClass = nextActionType === 'WRITE_REVIEW' ? 'btn_gray' : 'btn_black';
          return `<a href="javascript:;" class="${buttonClass} statusNextAction"
                    data-action="${nextActionType}" data-action-uri="${uri}"
                    data-delivery-type="${orderOption.delivery.deliveryType}"
                  >
                      ${this._getNextActionLabel(nextActionType)}
                  </a>`;
        })
        .join('');

      return statusText + statusButton;
    },

    _createNextActionText(orderOption, orderStatusType = null) {
      const notClaimAction = [
        'VIEW_DELIVERY',
        'CONFIRM_ORDER',
        'WRITE_REVIEW',
        'VIEW_CLAIM',
        'DELIVERY_DONE',
        'NONE',
        'CHANGE_ADDRESS',
      ];
      let canClaims =
        orderOption.nextActions && orderOption.nextActions.some(({ nextActionType }) => nextActionType === 'RETURN');
      //에스크로 : 결제완료 이후 주문건이 있는 경우
      if (orderOption.escrow && orderOption.nextActions.length === 0) {
        orderOption.nextActions.push({
          nextActionType: 'NO_CANCEL',
        });
        const deliveryDoneTypes = ['DELIVERY_ING', 'DELIVERY_DONE', 'BUY_CONFIRM'];
        if (deliveryDoneTypes.includes(orderStatusType)) {
          canClaims = true;
          orderOption.nextActions = [{ nextActionType: 'RETURN', uri: '' }];
        } else {
          orderOption.nextActions = [
            {
              nextActionType: 'NO_CANCEL',
            },
            { nextActionType: 'EXCHANGE', uri: '' },
          ];
        }
      }

      return (
        orderOption.nextActions
          .concat(canClaims ? [] : [{ nextActionType: 'NONE' }])
          .filter(({ nextActionType }) => !notClaimAction.includes(nextActionType))
          .map(({ nextActionType, uri }) => {
            return `<a href="javascript:;" class="btn_white delivery_order_btn nextActionBtn" data-action="${nextActionType}"
                    data-action-uri="${uri}"  data-claim-no='${orderOption.claimNo}'>
                      ${this._getNextActionLabel(nextActionType)}
                    </a>`;
          })
          .join('') || '-'
      );
    },
    _createRefundAccountText({ refundTypeLabel, refundBankAccount }) {
      const noAccountInfo =
        !refundBankAccount ||
        !refundBankAccount.bankName ||
        !refundBankAccount.bankAccount ||
        !refundBankAccount.bankDepositorName;
      if (noAccountInfo) {
        return refundTypeLabel;
      }
      return `${refundTypeLabel} - ${refundBankAccount.bankName} / ${refundBankAccount.bankAccount} / ${refundBankAccount.bankDepositorName}`;
    },

    _createRefundMethod({ returnDeliveryCompanyTypeLabel, returnInvoiceNo }) {
      const noRefundMethod = !returnDeliveryCompanyTypeLabel || !returnInvoiceNo;
      if (noRefundMethod) {
        return '-';
      }
      return `${returnDeliveryCompanyTypeLabel} / ${returnInvoiceNo}`;
    },

    _createClaimOptionText(orderOption) {
      if (!orderOption) return '';
      const seperator = '|';
      const values = orderOption.optionValue.split(seperator);

      const optionText = orderOption.optionName
        .split(seperator)
        .map((name, index) => `<dl><dt>${name}</dt><dd>${values[index]}</dd></dl>`);

      const inputText =
        (orderOption.inputs &&
          orderOption.inputs
            .filter(input => !!input.inputValue)
            .map(input => `<dl><dt>${input.inputLabel}</dt><dd>${input.inputValue}</dd></dl>`)) ||
        '';

      return inputText ? optionText.concat(inputText) : optionText;
    },

    _getNextActionLabel(nextActionType) {
      const nextActionLabel = {
        WITHDRAW_CANCEL: '취소신청철회',
        WITHDRAW_RETURN: '반품신청철회',
        WITHDRAW_EXCHANGE: '교환신청철회',
        CONFIRM_ORDER: '구매확정',
        VIEW_DELIVERY: '배송조회',
        RETURN: '반품신청',
        EXCHANGE: '교환신청',
        CANCEL_ALL: '취소신청',
        CANCEL: '취소신청',
        NO_CANCEL: '취소신청',
        WRITE_REVIEW: '후기작성',
      };
      return nextActionLabel[nextActionType];
    },
  };

  shopby.start.initiate(shopby.my.order.initiate.bind(shopby.my.order));
});

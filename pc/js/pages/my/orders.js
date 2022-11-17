/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Commerce Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Haekyu Cho
 * @since 2021-06-27
 */
$(() => {
  // window.history.pushState({ data: 'some data' },'Some history entry title', '/some-path')
  // 페이지 리프래쉬 없이 주소만 변경하는 방법..
  const $ordersResult = $('#ordersResult');

  shopby.orders = {
    dateRange: {},
    page: {},
    initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      this.dateRange = new shopby.dateRange('#myOrdersDateRangePicker', this.onClickSearchBtn.bind(this));
      this.page = new shopby.pagination(this.onClickSearchBtn.bind(this), '#pagination', 5);

      this._fetchApis().then(responses => {
        if (responses.some(response => response && response.error)) {
          // @fixme: /malls 도 401로 떨어져서 그냥 에러남.. 망함..
          shopby.alert('인증 정보가 만료되었습니다.', shopby.goLogin);
        } else {
          this.onClickSearchBtn();
          this.render(responses);
        }
      });
    },
    render(responses) {
      const [summary, summaryAmount, orders, likeProduct] = responses;
      shopby.my.summary.init('#myPageSummary', summary, summaryAmount, likeProduct.totalCount);

      this._renderOrders(orders);
    },
    _renderOrders(orders) {
      const data = orders.items.flatMap(order =>
        order.orderOptions.flatMap(orderOption => {
          const hasEscrowClaim = order.escrow && order.orderOptions.map(o => o.claimNo).every(v => v !== null);
          return {
            orderYmdt: order.orderYmdt.substr(0, 10),
            orderNo: order.orderNo,
            productNo: orderOption.productNo,
            orderOptionNo: orderOption.orderOptionNo,
            optionNo: orderOption.optionNo,
            rowSpan: order.orderOptions.indexOf(orderOption) !== 0 ? 0 : order.orderOptions.length,
            claimNos: order.orderOptions.map(o => o.claimNo).join(','),
            imageUrl: orderOption.imageUrl,
            productName: shopby.utils.substrWithPostFix(orderOption.productName),
            optionTextInfo: shopby.utils.createOptionText(orderOption),
            orderCnt: orderOption.orderCnt,
            buyAmt: orderOption.price.buyAmt,
            orderStatusText: this._createOrderStatusText(orderOption),
            nextActionText:
              !hasEscrowClaim && ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(order.payType)
                ? this._createNextActionText(order, orderOption.orderStatusType)
                : this._createNextActionText(orderOption),
            orderStatusType: orderOption.orderStatusType,
            orderStatusTypeLabel: orderOption.orderStatusTypeLabel,
            payType: order.payType,
            pgType: order.pgType,
          };
        }),
      );
      const compiled = Handlebars.compile($ordersResult.html());
      $ordersResult.next().remove();
      $ordersResult.parent().append(compiled(data));
      $('#totalcount').text(orders.totalCount);

      this._bindEvents();
    },
    _bindEvents() {
      $('.claimStatusBtn').on('click', this.onClickClaimStatusBtn.bind(this));
      $('.statusNextAction,.nextActionBtn').on('click', this.onClickStatusNextAction.bind(this));
      $('#btn_write').on('click', this.onClickInquiryBtn);
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

    onClickInquiryBtn(event) {
      event.stopImmediatePropagation();
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

    _confirmOrder(target, actionUri) {
      const $targetTr = $(target).parents('tr');
      const orderNo = $targetTr.data('orderNo');
      const payType = $targetTr.data('payType');

      const $arrTr = $.makeArray($('.order_table_body tr')).filter(tr => $(tr).data('orderNo') === orderNo);

      if (['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(payType)) {
        // 1. 일부 옵션이 구매 확정 불가능한 경우 - 근데 어차피 어드민에서 에스크로 결제의 경우 부분 배송처리가 안되기 때문에 노출 안될듯
        if ($arrTr.filter(tr => $(tr).data('orderStatusType') !== 'DELIVERY_ING').length > 0) {
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
        return shopby.api.order.putProfileOrderOptionsOrderOptionsNoConfirm({ pathVariable: { orderOptionNo } });
      });

      try {
        await Promise.all(arrFetch);
        shopby.alert('구매확정 처리되었습니다.', this.onClickSearchBtn.bind(this));
      } catch (e) {
        this.onClickSearchBtn();
      }
    },

    _getReviewOption(target) {
      const { actionUri } = target.dataset;
      const $product = $(target).closest('tr');
      const { optionNo, orderOptionNo, orderStatusType } = target.closest('tr').dataset;
      const product = {
        productNo: actionUri.split('/')[2],
        productName: $product.find('.productName').text().trim(),
        imageUrls: $product.find('img').attr('src'),
        optionText: $product.find('.goods_option').text().trim(),
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
      const $targetTr = $(target).parents('tr');
      const payType = $targetTr.data('payType');
      const orderStatusType = $targetTr.data('orderStatusType');

      if (
        ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'].includes(payType) &&
        orderStatusType !== 'BUY_CONFIRM'
      ) {
        shopby.alert('에스크로 결제 건은 구매확정 이후 후기작성이 가능합니다.');
        return;
      }

      try {
        const { action } = target.dataset;
        const { orderStatusType, payType } = target.closest('tr').dataset;
        this.validateNaverPay(orderStatusType, payType, action);

        const registerReview = () => {
          shopby.popup('product-review', this._getReviewOption(target), ({ state }) => {
            if (state !== 'ok') return;
            this.onClickSearchBtn();
          });
        };
        registerReview();
      } catch (e) {
        alert(e.message);
      }
    },

    _registerClaim(target) {
      try {
        const { action } = target.dataset;
        const { orderNo, orderStatusType, orderOptionNo, payType } = target.closest('tr').dataset;
        const escrowOrderTypes = ['ESCROW_REALTIME_ACCOUNT_TRANSFER', 'ESCROW_VIRTUAL_ACCOUNT'];

        this.validateNaverPay(orderStatusType, payType, action); // error thrower. 네페 아니면 무조건 throw 안함. 네이버 페이이고 해당 케이스가 아니면 불가 메시지 throw 함
        // 네이버 페이 validate 통과 후
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
        alert(e.message);
      }
    },

    /**
     * error thrower
     * 네이버 페이 결제한 주문이고 교환 신청등 불가한 프로세스일경우 throw 해서 불가하다는거 유저에게 알려줌
     * 취소, 반품은 네이버 페이 반품신청 가능. 교환 신청은 불가
     */
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
        shopby.alert('주문취소가 완료되었습니다.', this.onClickSearchBtn.bind(this));
      } catch (e) {
        this.onClickSearchBtn();
      }
    },

    _goClaimPage(action, orderOptionNo, orderNo) {
      const claimType = action === 'CANCEL_ALL' ? 'CANCEL' : action;
      location.href = `/pages/my/order-claim.html?orderNo=${orderNo}&orderOptionNo=${orderOptionNo}&type=${claimType}`;
    },

    _cancelClaim(target) {
      const { action, claimNo: currentClaimNo } = target.dataset;

      const actionType = {
        CANCEL: '취소',
        CANCEL_ALL: '취소',
        WITHDRAW_CANCEL: '취소',
        WITHDRAW_EXCHANGE: '교환',
        WITHDRAW_RETURN: '반품',
      }[action];
      const claimNos = target.closest('tr').dataset.claimNos.split(',');
      const checkClaimNo = claimNos.some(claimNo => Number(claimNo) > currentClaimNo);
      const message = checkClaimNo
        ? '철회 시 후순위 클레임의 결제/환불 금액이 변동됩니다.<br>클레임을 철회하시겠습니까?.'
        : `${actionType}신청을 철회하시겠습니까?`;

      shopby.confirm({ message }, async ({ state }) => {
        if (state !== 'ok') return;
        try {
          const pathVariable = { claimNo: currentClaimNo };
          await shopby.api.claim.putProfileClaimsClaimNoWithdraw({ pathVariable });
          shopby.alert(`${actionType}신청철회가 완료되었습니다.`, this.onClickSearchBtn.bind(this));
        } catch (e) {
          console.error(e);
          this.onClickSearchBtn();
        }
      });
    },

    _createOrderStatusText(orderOption) {
      const statusText = orderOption.claimStatusType
        ? `<a href="javascript:;" style="text-decoration:underline;" data-action="cancel" data-claim-no="${orderOption.claimNo}" class="claimStatusBtn">${orderOption.claimStatusTypeLabel}</a>`
        : orderOption.orderStatusTypeLabel;

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
      const notClaimAction = ['VIEW_DELIVERY', 'CONFIRM_ORDER', 'WRITE_REVIEW', 'VIEW_CLAIM', 'DELIVERY_DONE', 'NONE'];
      let canClaims =
        orderOption.nextActions && orderOption.nextActions.some(({ nextActionType }) => nextActionType === 'RETURN');
      //에스크로 : 결제완료 이후 주문건이 있는 경우
      if (orderOption.escrow && orderOption.nextActions.length === 0) {
        const deliveryDoneTypes = ['DELIVERY_ING', 'DELIVERY_DONE', 'BUY_CONFIRM'];
        if (deliveryDoneTypes.includes(orderStatusType)) {
          canClaims = true;
          orderOption.nextActions.push({
            nextActionType: 'RETURN',
            uri: '',
          });
        } else {
          orderOption.nextActions.push(
            {
              nextActionType: 'NO_CANCEL',
            },
            { nextActionType: 'EXCHANGE', uri: '' },
          );
        }
      }
      return (
        orderOption.nextActions
          .concat(canClaims ? [] : [{ nextActionType: 'NONE' }])
          .filter(({ nextActionType }) => !notClaimAction.includes(nextActionType))
          .map(({ nextActionType, uri }) => {
            return `<a href="javascript:;" class="btn_white nextActionBtn" data-action="${nextActionType}"
                    data-action-uri="${uri}" data-claim-no="${orderOption.claimNo}">
                      ${this._getNextActionLabel(nextActionType)}
                    </a>`;
          })
          .join('') || '-'
      );
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

    async onClickSearchBtn() {
      const { start, end } = this.dateRange;
      const { pageNumber } = this.page;
      shopby.utils.pushState({ start, end, pageNumber });

      const { data: orders } = await this.fetchOrders();
      this.page.render(orders.totalCount);
      this._renderOrders(orders);
    },
    async _fetchApis() {
      const result = await Promise.all([
        shopby.api.member.getProfileSummary(), // FIXME: API Deprecated
        shopby.api.order.getProfileOrdersSummaryAmount({
          queryString: {
            orderStatusType: 'BUY_CONFIRM',
            startYmd: shopby.date.lastHalfYear(),
            endYmd: shopby.date.today(),
          },
        }),
        this.fetchOrders(),
        // summary 찜리스트 totalCount만 받아오기 위해 추가
        // 전체 카운트만 받아오는 것으로 pageNumber, pageSize는 추가하지 않음
        shopby.api.product.getProfileLikeProducts({
          queryString: {
            hasTotalCount: true,
          },
        }),
      ]);
      return result.map(({ data }) => data);
    },

    fetchOrders() {
      return shopby.api.order.getProfileOrders({
        queryString: {
          pageNumber: this.page.pageNumber,
          pageSize: this.page.pageSize,
          startYmd: this.dateRange.start,
          endYmd: this.dateRange.end,
          hasTotalCount: true,
          orderRequestTypes:
            shopby.utils.getUrlParam('orderRequestTypes') ||
            'DEPOSIT_WAIT,PAY_DONE,PRODUCT_PREPARE,DELIVERY_PREPARE,DELIVERY_ING,DELIVERY_DONE,BUY_CONFIRM,CANCEL_DONE,CANCEL_PROCESSING,RETURN_DONE,RETURN_PROCESSING,EXCHANGE_DONE,EXCHANGE_PROCESSING',
        },
      });
    },
  };

  shopby.start.initiate(shopby.orders.initiate.bind(shopby.orders));
});

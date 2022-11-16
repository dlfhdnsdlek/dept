/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-19
 */
$(() => {
  const $claimsResult = $('#claimsResult');
  shopby.claims = {
    claims: [],
    async initiate() {
      this.dateRange = new shopby.dateRange('#dateSelector', this.searchClaims.bind(this));
      this.initReadMore();
      await this.fetchClaims();
    },
    initReadMore() {
      const REQUEST_COUNT = 5;
      this.page = new shopby.readMore(this.fetchClaims.bind(this, true), '#readMore', REQUEST_COUNT);
    },
    searchClaims() {
      this.page.pageNumber = 1;
      this.fetchClaims().catch(console.error);
    },
    async fetchClaims(append = false) {
      const { start, end } = this.dateRange;
      const { pageNumber, pageSize } = this.page;
      shopby.utils.pushState({ start, end, pageNumber });
      const queryString = {
        endYmd: end,
        hasTotalCount: true,
        pageNumber,
        pageSize,
        startYmd: start,
        orderRequestTypes: this.dateRange.getClaimOrderRequestType(),
      };
      const { data } = await shopby.api.order.getProfileOrders({ queryString });
      const { totalCount } = data;
      this.page.render(totalCount);
      const mappedData = this.getClaimData(data);
      append ? this.append(mappedData, totalCount) : this.render(mappedData, totalCount);

      this.bindEvents();
    },
    getClaimData({ items }) {
      return items.map(item => {
        const { orderOptions, orderYmdt, orderNo, payType } = item;
        const claimNos = this._getClaimNos(orderOptions);

        return {
          orderYmd: orderYmdt.split(' ')[0],
          orderNo,

          orders: orderOptions.map(orderOption => {
            this.claims.push(orderOption);
            return {
              productName: shopby.utils.substrWithPostFix(orderOption.productName),
              optionTextInfo: shopby.utils.createOptionText(orderOption),
              buyAmt: orderOption.price.buyAmt,
              claimStatus: this._createClaimStatus(orderOption),
              nextAction: this._createNextAction(orderOption, payType),
              orderNo: orderOption.orderNo,
              productNo: orderOption.productNo,
              imageUrl: orderOption.imageUrl,
              orderCnt: orderOption.orderCnt,
              claimNo: orderOption.claimNo,
              claimNos,
            };
          }),
        };
      });
    },
    render(data, totalCount) {
      const compiled = Handlebars.compile($claimsResult.html());
      $claimsResult.next().remove();
      $claimsResult.parent().append(compiled(data));
      $('#totalCount').text(totalCount);
    },
    append(data, totalCount) {
      const compiled = Handlebars.compile($claimsResult.html());
      $claimsResult.parent().append(compiled(data));
      $('#totalCount').text(totalCount);
    },
    bindEvents() {
      $('.nextActionBtn').on('click', this.onClickNextActionBtn.bind(this));
      $('#btn_write').on('click', this.onClickInquiryBtn);
    },
    onClickNextActionBtn({ target }) {
      const { action, claimNo } = target.dataset;
      const currentClaimNo = Number(claimNo);
      const actionType = { CANCEL: '취소', EXCHANGE: '교환', RETURN: '반품' }[action];
      const claimNos = target.closest('div').dataset.claimNos.split(',');
      const checkClaimNo = claimNos.some(claimNo => Number(claimNo) > currentClaimNo);
      const message = checkClaimNo
        ? '철회 시 후순위 클레임의 결제/환불 금액이 변동됩니다.<br>클레임을 철회하시겠습니까?.'
        : `${actionType}신청을 철회하시겠습니까?`;

      shopby.confirm({ message }, async ({ state }) => {
        if (state !== 'ok') return;
        try {
          const pathVariable = { claimNo: currentClaimNo };
          await shopby.api.claim.putProfileClaimsClaimNoWithdraw({ pathVariable });
          shopby.alert(`${actionType}신청철회가 완료되었습니다.`, () => {
            this.fetchClaims();
          });
        } catch (e) {
          console.error(e);
          this.fetchClaims();
        }
      });
    },
    onClickInquiryBtn() {
      shopby.popup('inquiry', {}, data => {
        if (data && data.state === 'close') return;
        window.location.href = '/pages/my/inquiries.html';
      });
    },
    _getClaimNos(orderOptions) {
      return orderOptions.map(({ claimNo }) => claimNo).join(',');
    },
    _createClaimStatus({ claimStatusTypeLabel, orderStatusTypeLabel }) {
      return claimStatusTypeLabel
        ? `<strong class="order_ing_btn">${claimStatusTypeLabel}</strong>`
        : `<strong class="order_ing_btn">${orderStatusTypeLabel}</strong>`;
    },
    _createNextAction({ claimStatusType, orderStatusType, claimNo }, payType) {
      const currentState = claimStatusType || orderStatusType;
      switch (currentState) {
        case 'CANCEL_REQUEST':
          return this._getNextActionTemplate('취소신청철회', 'CANCEL', claimNo, payType);
        case 'EXCHANGE_REQUEST':
          return this._getNextActionTemplate('교환신청철회', 'EXCHANGE', claimNo, payType);
        case 'RETURN_REQUEST':
          return this._getNextActionTemplate('반품신청철회', 'RETURN', claimNo, payType);
        default:
          return '-';
      }
    },
    _getNextActionTemplate(buttonText, action, claimNo, payType) {
      return `<button class="btn_white delivery_order_btn nextActionBtn" data-claim-no="${claimNo}" data-action="${action}" data-pay-type="${payType}">${buttonText}</button>`;
    },
  };

  shopby.start.initiate(shopby.claims.initiate.bind(shopby.claims));
});

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
    page: {},
    async initiate() {
      this.my.initiate();
      this.dateRange = new shopby.dateRange('#searchDateRange', this.searchClaims.bind(this));
      this.page = new shopby.pagination(this.fetchClaims.bind(this), '#pagination', 5);
      await this.fetchClaims();
    },
    searchClaims() {
      this.page.pageNumber = 1;
      this.fetchClaims();
    },
    async fetchClaims() {
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
      this.generateClaimData(data);
      this.bindEvents();
    },
    generateClaimData({ items, totalCount }) {
      const data = items.flatMap(({ orderOptions, payType }) => {
        const claimNos = this._getClaimNos(orderOptions);
        return orderOptions.flatMap(orderOption => {
          this.claims.push(orderOption);

          return {
            orderYmd: orderOption.orderStatusDate.registerYmdt.split(' ')[0],
            rowSpan: orderOptions.indexOf(orderOption) !== 0 ? 0 : orderOptions.length,
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
        });
      });

      this.render(data, totalCount);
      this.page.render(totalCount);
    },
    render(data, totalCount) {
      const compiled = Handlebars.compile($claimsResult.html());
      $claimsResult.next().remove();
      $claimsResult.parent().append(compiled(data));
      $('#totalCount').text(totalCount);
    },
    bindEvents() {
      $('.nextActionBtn').on('click', this.onClickNextActionBtn.bind(this));
      $('.claimStatusBtn').on('click', this.onClickClaimStatusBtn.bind(this));
      $('#btn_write').on('click', this.onClickInquiryBtn);
    },
    onClickNextActionBtn({ target }) {
      const { action, claimNo } = target.dataset;
      const currentClaimNo = Number(claimNo);
      const actionType = { CANCEL: '취소', EXCHANGE: '교환', RETURN: '반품' }[action];
      const claimNos = target.closest('td').dataset.claimNos.split(',');
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
    onClickClaimStatusBtn({ target }) {
      const { claimNo } = target.closest('td').dataset;
      shopby.popup('claim-info', claimNo);
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
        ? `<button class="claimStatusBtn" style="text-decoration:underline;">${claimStatusTypeLabel}</button>`
        : orderStatusTypeLabel;
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
      return `<button class="btn_white nextActionBtn" data-claim-no="${claimNo}" data-action="${action}" data-pay-type="${payType}">${buttonText}</button>`;
    },

    /**
     * @my :  마이페이지 공통 로직
     */
    my: {
      initiate() {
        shopby.my.menu.init('#myPageLeftMenu');
        this.summary.initiate().catch(console.error);
      },

      summary: {
        async initiate() {
          const [summary, summaryAmount, likeProduct] = await this._getData();

          this.render(summary, summaryAmount, likeProduct.totalCount);
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
            // summary 찜리스트 totalCount만 받아오기 위해 추가
            // 전체 카운트만 받아오는 것으로 pageNumber, pageSize는 추가하지 않음
            shopby.api.product.getProfileLikeProducts({
              queryString: {
                hasTotalCount: true,
              },
            }),
          ]).then(res => res.map(({ data }) => data));
        },
        render(summary, summaryAmount, likeCount) {
          shopby.my.summary.init('#myPageSummary', summary, summaryAmount, likeCount);
        },
      },
    },
  };

  shopby.start.initiate(shopby.claims.initiate.bind(shopby.claims));
});

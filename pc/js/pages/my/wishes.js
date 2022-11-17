/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Commerce Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 * @author Haekyu Cho
 * @since 2021-07-04
 */

$(() => {
  shopby.wishes = {
    page: {},
    initiate() {
      const url = shopby.utils.getUrlParams();
      shopby.my.menu.init('#myPageLeftMenu');
      this.page = new shopby.pagination(this.onClickPagination.bind(this), '#pagination');
      this.page.pageNumber = url && url.pageNumber ? url.pageNumber : 1;

      this.fetchApis().then(responses => {
        if (responses.some(response => response && response.error)) {
          // @fixme: /malls 도 401로 떨어져서 그냥 에러남.. 망함..
          shopby.alert('인증 정보가 만료되었습니다.', shopby.goLogin);
        } else {
          this.render(responses);
          this.bindEvents();
        }
      });
    },

    render(responses) {
      const [summary, summaryAmount, likes] = responses;

      shopby.my.summary.init('#myPageSummary', summary, summaryAmount, likes.totalCount);

      this._renderWishes(likes);
      $('#contents').visualize();
    },

    _removeWishes(checkedSelector) {
      const $checkedList = $(checkedSelector + ':checked');
      const length = $checkedList.length;

      if (length > 0) {
        const productNos = $checkedList.get().map(elem => elem.id);

        shopby.confirm({ message: `선택하신 ${length}개의 상품을 삭제하시겠습니까?` }, async callback => {
          if (callback.state !== 'ok') {
            return;
          }

          const response = await shopby.api.product.postProfileLikeProducts({
            requestBody: { productNos: productNos },
          });

          if (response.status === 200) {
            window.location.reload();
          } else {
            shopby.alert('찜리스트 삭제에 실패하였습니다.');
          }
        });
      } else {
        shopby.alert('선택하신 상품이 없습니다.');
      }
    },

    _renderWishes(likes) {
      const data = likes.items.map(product => {
        const canDiscount = product.immediateDiscountAmt + product.additionDiscountAmt > 0;
        const shouldShowContentsIfPausing = product.contentsIfPausing && product.saleStatusType === 'STOP';
        const isProductSoldout = product.stockCnt === 0;
        const isNotOnSaleStatus = product.saleStatusType !== 'ONSALE';
        return {
          ...product,
          productNo: product.productNo,
          productName: product.productName,
          imageUrls: product.imageUrls,
          displayProductPrice: shopby.utils.getDisplayProductPrice(product),
          canDiscount: canDiscount,
          discountHtml: this._createDiscountHtml(product),
          accumulateHtml: this._createAccumulateHtml(product),
          salePrice: product.salePrice,
          invalid: isProductSoldout || shouldShowContentsIfPausing || isNotOnSaleStatus,
          shouldShowContentsIfPausing,
        };
      });

      const $wishResults = $('#wishResults');
      const compiled = Handlebars.compile($wishResults.html());
      $wishResults.next().remove();
      $wishResults.parent().append(compiled(data));

      $('#totalCount').text(likes.totalCount);
      this.page.render(likes.totalCount);

      shopby.utils.pushState({ pageNumber: this.page.pageNumber }, '찜리스트');
    },

    bindEvents() {
      const allCheckedSelector = '#allChecked';
      const checkedSelector = '[name=checked]';

      $('body')
        .on('click', '#inquieryBtn', shopby.alert.bind(this, '1:1문의하기 구현', null))
        .on('change', checkedSelector, () => {
          $(allCheckedSelector).get(0).checked = $(checkedSelector)
            .get()
            .every(el => el.checked);
        })
        .on('change', allCheckedSelector, ({ currentTarget: { checked: checked } }) =>
          $(checkedSelector).prop('checked', checked),
        )
        .on('click', '#deleteBtn', this._removeWishes.bind(this, checkedSelector));
    },

    async fetchApis() {
      const result = await Promise.all([
        shopby.api.member.getProfileSummary(), // FIXME: API Deprecated
        shopby.api.order.getProfileOrdersSummaryAmount({
          queryString: {
            orderStatusType: 'BUY_CONFIRM',
            startYmd: shopby.date.lastHalfYear(),
            endYmd: shopby.date.today(),
          },
        }),
        this._fetchLikeProducts(),
      ]);

      return result.map(({ data }) => data);
    },

    async _fetchLikeProducts() {
      const { pageNumber, pageSize } = this.page;
      return await shopby.api.product.getProfileLikeProducts({
        queryString: {
          hasTotalCount: true,
          pageNumber,
          pageSize,
        },
      });
    },

    async onClickPagination() {
      const response = await this._fetchLikeProducts();

      if (response.status === 200) {
        this._renderWishes(response.data);
      } else {
        response.data && shopby.alert(response.data.message);
      }
    },

    _createDiscountHtml: function ({ immediateDiscountAmt, additionDiscountAmt }) {
      const canDiscount = immediateDiscountAmt + additionDiscountAmt > 0;
      const totalAmt = shopby.utils.toCurrencyString(immediateDiscountAmt + additionDiscountAmt);

      let discountHtml = '<li class="benefit_sale"><em>할인</em><strong> : - </strong></li>';

      if (canDiscount) {
        discountHtml = `
            <li class="benefit_sale">
                <em>할인</em><strong> : - ${totalAmt} 원</strong>
            </li>
          `.trim();
      }
      return discountHtml;
    },

    _createAccumulateHtml({ accumulationAmtWhenBuyConfirm }) {
      let accumulateHtml = '<li class="benefit_mileage"><em>적립</em><strong> : - </strong></li>';

      const accumulationAmt = accumulationAmtWhenBuyConfirm;
      const canAccumulate = accumulationAmt > 0;
      if (canAccumulate) {
        accumulateHtml = `
            <li class="benefit_mileage">
                <em>적립</em><strong> : - ${shopby.utils.toCurrencyString(accumulationAmt)} 원</strong>
            </li>
          `;
      }
      return accumulateHtml;
    },
  };

  shopby.start.initiate(shopby.wishes.initiate.bind(shopby.wishes));
});

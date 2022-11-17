/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author JongKeun Kim
 * @since 2021.7.12
 */

$(() => {
  const PAGE_SIZE = 5;

  shopby.shipping = {
    addresses: null, // updateAddress 용도로 사용.
    initiate() {
      this.setDefaultState();
      this.my.initiate();
      this.add.initiate();
      this.search.initiate();
      this.content.initiate();

      window.onpopstate = this.onPopState.bind(this);
    },
    get pageNumber() {
      return shopby.utils.getUrlParam('pageNumber') || '1';
    },
    setDefaultState() {
      const pageNumberEmpty = !shopby.utils.getUrlParam('pageNumber');

      if (pageNumberEmpty) {
        shopby.utils.replaceState({
          pageNumber: 1,
        });
      }
    },
    pushState(pageNumber) {
      shopby.utils.pushState({ pageNumber });
      this.changedState();
    },
    changedState() {
      this.search.search();
    },
    onPopState() {
      this.search.setCurrentPage();
      this.search.search();
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
        render(summary, summaryAmount, totalCount) {
          shopby.my.summary.init('#myPageSummary', summary, summaryAmount, totalCount);
        },
      },
    },

    add: {
      initiate() {
        this._bindEvents();
      },
      _bindEvents() {
        $('#addShippingAddress').on('click', this.createAddressHandler.bind(this));
      },
      createAddressHandler(event) {
        event.preventDefault();

        this.openRegisterShippingAddressPopup();
      },
      openRegisterShippingAddressPopup(addressNo) {
        const addresses = !addressNo
          ? null
          : shopby.shipping.addresses.find(address => address.addressNo === addressNo);
        const isDefaultAddress = shopby.shipping.addresses.length > 0;

        shopby.popup('my-shipping-register', { addresses, isDefaultAddress }, result => {
          if (result.state === 'close') return;

          result.address.addressNo ? this.updateShipping(result) : this.createShipping(result);
        });
      },
      async createShipping(result) {
        const requestBody = { ...result.address, addressType: 'BOOK', customsIdNumber: '' };

        await shopby.api.order.postProfileShippingAddresses({ requestBody });
        shopby.alert('배송지 정보가 추가되었습니다.', () => {
          shopby.shipping.search.search.call(shopby.shipping.search); // 데이터 갱신
          result.closePopup();
        });
      },

      async updateShipping(result) {
        const requestBody = { ...result.address };
        await shopby.api.order.putProfileShippingAddressesAddressNo({
          pathVariable: {
            addressNo: result.address.addressNo,
          },
          requestBody,
        });
        shopby.alert('배송지 정보가 변경되었습니다.', () => {
          shopby.shipping.search.search.call(shopby.shipping.search); // 데이터 갱신
          result.closePopup();
        });
      },
    },

    search: {
      pagination: null,
      initiate() {
        this.renderPagination();
        this.setCurrentPage();
        this.search();
      },
      renderPagination() {
        this.pagination = new shopby.pagination(this.changePagination.bind(this), '#pagination', PAGE_SIZE);
      },
      changePagination() {
        const { pageNumber } = this.pagination;
        shopby.shipping.pushState(pageNumber);
      },
      search() {
        return this.fetchProfileShippingAddress()
          .then(data =>
            data.sort((prev, next) => {
              const x = dayjs(prev.registerYmdt).unix();
              const y = dayjs(next.registerYmdt).unix();
              return x > y ? -1 : 1;
            }),
          )
          .then(data => {
            shopby.shipping.content.render(data);
            shopby.shipping.addresses = data; // updateAddress 용도로 저장

            return data;
          })
          .then(data => this.pagination.render(data.length));
      },
      async fetchProfileShippingAddress() {
        return await shopby.api.order
          .getProfileShippingAddresses()
          .then(({ data: { bookedAddresses } }) => bookedAddresses);
      },
      setCurrentPage() {
        this.pagination.pageNumber = shopby.shipping.pageNumber;
      },
    },

    content: {
      initiate() {
        this._bindEvents();
      },
      render(data) {
        this.renderAddresses(data);
        this.renderTotalCount(data);
      },
      renderAddresses(data) {
        const $addresses = $('#addresses');
        const compiled = Handlebars.compile($addresses.html());
        const pageNumber = Number(shopby.shipping.pageNumber);
        const viewRange = [(pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE]; // tuple: [number, number]
        const displayData = data.slice(...viewRange);

        $addresses.next().remove();
        $addresses.parent().append(compiled(displayData));
      },
      renderTotalCount(data) {
        $('#totalCount').text(data.length);
      },
      _bindEvents() {
        $('#contents')
          .on('click', '[data-id="shippingAddressUpdate"]', this.updateAddressHandler.bind(this))
          .on('click', '[data-id="shippingAddressDelete"]', this.deleteAddressHandler.bind(this));
      },
      updateAddressHandler(event) {
        const addressNo = Number(event.currentTarget.dataset['addressNo']);
        shopby.shipping.add.openRegisterShippingAddressPopup(addressNo);
      },
      deleteAddressHandler(event) {
        event.preventDefault();

        const isDefault = event.currentTarget.dataset['defaultYn'] === 'Y';
        if (isDefault) return shopby.alert('기본 배송지는 삭제할 수 없습니다.<br />변경 후 삭제해주세요.');

        const addressName = event.currentTarget.dataset['addressName'];

        shopby.confirm({ message: `${addressName} 삭제하시겠습니까?` }, ({ state }) => {
          if (state !== 'ok') return;
          const addressNo = event.currentTarget.dataset['addressNo'];
          this.deleteAddress(addressNo).then(() => {
            shopby.shipping.search.search.call(shopby.shipping.search); // 데이터 갱신
          });
        });
      },
      deleteAddress(addressNo) {
        const request = {
          pathVariable: {
            addressNo,
          },
        };
        return shopby.api.order.deleteProfileShippingAddressesAddressNo(request).then(() => {
          shopby.alert('삭제 되었습니다.');
        });
      },
    },
  };

  shopby.start.initiate(shopby.shipping.initiate.bind(shopby.shipping));
});

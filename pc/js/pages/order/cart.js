$(() => {
  let editOptionData = null;
  let cartOptionsCompiled = null;
  let cartTextOptionsCompiled = null;
  let $originOptions = null;
  let prevProductOrderCnt = null;

  const _getTextOptions = $tr => {
    return $tr
      .find('[name=textOptionItem]')
      .get()
      .map(textOptionItem => {
        const $textOptionItem = $(textOptionItem);

        return {
          inputLabel: $textOptionItem.data('label'),
          inputValue: $textOptionItem.val().trim().length === 0 ? null : $textOptionItem.val().trim(),
          isRequired: $textOptionItem.data('reqired') === 'yes',
        };
      });
  };

  const _cancelChangeOption = $tr => {
    if ($tr.find('.btnChangeOption').data('editStatus') !== 'editing') {
      return;
    }

    $tr.find('.pick_add_info dl').remove();
    $tr.find('.pick_add_info').append($originOptions);

    $tr.find('.btnChangeOption').removeClass('comp').data('editStatus', 'complete').html('옵션/수량 변경');
    $tr.find('[can-change-option=true]').prop('disabled', true);
  };

  const _validateEditOption = $tr => {
    if (editOptionData.selectedOptions.length === 0) {
      shopby.alert({ message: '옵션을 선택해주세요.', iconType: 'fail' });
      return false;
    }

    const textOptions = _getTextOptions($tr);

    if (textOptions.length > 0 && textOptions.some(item => item.isRequired && !item.inputValue)) {
      shopby.alert({ message: '텍스트옵션(필수)을 입력해주세요.', iconType: 'fail' });
      return false;
    }

    return true;
  };

  /**
   * 카트 옵션 변경 로직
   *
   * 1. 기존 옵션 삭제
   * 2. 신규 옵션 추가
   * 3. 리렌더링
   *
   * @param $tr
   * @private
   */
  const _changeOption = $tr => {
    const cartNo = $tr.data('cartNo');
    const productNo = $tr.data('productNo');
    const orderCnt = $tr.find('[name=orderCnt]').val();

    const optionInputs = _getTextOptions($tr);

    shopby.helper.cart
      .removeCarts([cartNo])
      .then(success => {
        if (!success) {
          return Promise.reject();
        }

        // 변경된 수량으로 카트 추가
        return shopby.helper.cart
          .addCart([
            {
              productNo: productNo,
              optionNo: editOptionData.selectedOptions.length > 0 && editOptionData.selectedOptions[0].optionNo,
              orderCnt: orderCnt,
              optionInputs: optionInputs.map(input => ({
                inputLabel: input.inputLabel,
                inputValue: input.inputValue || '',
              })),
            },
          ])
          .catch(() => {
            // 기존 수량으로 다시 변경
            return shopby.helper.cart.addCart([
              {
                productNo: productNo,
                optionNo: editOptionData.selectedOptions.length > 0 && editOptionData.selectedOptions[0].optionNo,
                orderCnt: prevProductOrderCnt,
                optionInputs: optionInputs.map(input => ({
                  inputLabel: input.inputLabel,
                  inputValue: input.inputValue || '',
                })),
              },
            ]);
          });
      })
      .finally(() => {
        // 이전 수량 초기화
        prevProductOrderCnt = null;

        shopby.cart.initiate(true);
      });
  };

  /**
   * 카트의 상품 옵션 변경
   *
   * @param e
   * @return {Promise<void>}
   * @private
   */
  const _onChangeOptionButton = async e => {
    const $button = $(e.target);
    const $tr = $button.parents('tr');
    const isComplete = $button.data('editStatus') === 'complete';

    const cartNo = $tr.data('cartNo');
    const productNo = $tr.data('productNo');
    const optionNo = $tr.data('optionNo');
    // 다른 카트 옵션 변경 취소
    $(`#cartContents tbody tr[data-cart-no!=${cartNo}]`)
      .get()
      .map(el => {
        _cancelChangeOption($(el));
      });
    if (isComplete) {
      /**
       * 카트 옵션 변경 모드 세팅
       *
       * 1. get product option
       * 2. 기존 select box hide
       * 3. 새로운 select box rendering
       */

      // 기존 수량 저장
      prevProductOrderCnt = $tr.find('[name=orderCnt]').val();

      const { data } = await shopby.api.product.getProductsProductNoOptions({ pathVariable: { productNo: productNo } });
      const { data: productData } = await shopby.api.product.getProductsProductNo({
        pathVariable: { productNo: productNo },
      });
      const textOptions = _getTextOptions($tr);
      editOptionData = shopby.helper.option(data, productData.reservationData, optionNo, textOptions);
      $originOptions = $tr.find('.pick_add_info dl').remove();
      if (data.type === 'COMBINATION' || data.type === 'MAPPING') {
        cartOptionsCompiled = cartOptionsCompiled || Handlebars.compile($('#cartOptionsTemplate').html());
        $tr.find('.pick_add_info').append($(cartOptionsCompiled({ options: editOptionData.options })));
      }

      const orderCnt = Number($tr.find('input[name="orderCnt"]').val());
      const textInputNo = Number($tr.find('input[name="textOptionItem"]').data('text-input-no'));
      const hasOptionalTextOption = editOptionData.textOptions.some(option => option.inputMatchingType === 'OPTION');
      if (orderCnt > 1 && hasOptionalTextOption) {
        editOptionData.drawAmountTextOption(optionNo, textInputNo, orderCnt);
      }
      cartTextOptionsCompiled = cartTextOptionsCompiled || Handlebars.compile($('#cartTextOptionsTemplate').html());
      $tr.find('.pick_add_info').append(
        $(
          cartTextOptionsCompiled({
            textOptions: editOptionData.textOptions,
            optionalTextOptions:
              editOptionData.selectedOption.options.length > 0 && editOptionData.selectedOption.options[0].textOptions,
          }),
        ),
      );
    } else {
      if (!_validateEditOption($tr)) {
        return;
      }

      _changeOption($tr);
    }

    $button
      .toggleClass('comp')
      .data('editStatus', isComplete ? 'editing' : 'complete')
      .html(isComplete ? '변경 완료' : '옵션/수량 변경');

    $tr.find('[can-change-option=true]').prop('disabled', !isComplete);
  };

  /**
   * select box 옵션 변경
   *
   * @param e
   * @private
   */
  const _changeOptionSelect = e => {
    const $select = $(e.target);
    const $dl = $select.parents('dl');
    const $tr = $dl.parents('tr');

    const depth = $dl.data('depth');
    const selectedIndex = $select.find('option').index($select.find('option:selected'));
    const displayStock = editOptionData.option._displayableStock;

    editOptionData.changeSelectOption(depth, selectedIndex, true);

    // 미 노출일 경우 변경 완료 버튼 클릭 시 체크한다.
    if (displayStock && editOptionData.selectedOptions.length > 0) {
      const $input = $tr.find('input[name=orderCnt]');
      const orderCnt = Number($input.val());
      if (orderCnt > editOptionData.selectedOptions[0].stockCnt) {
        $input.val(editOptionData.selectedOptions[0].stockCnt);
      }
    }

    $tr.find('.pick_add_info dl').remove();
    $tr
      .find('.pick_add_info')
      .append($(cartOptionsCompiled({ options: editOptionData.options })))
      .append(
        $(
          cartTextOptionsCompiled({
            textOptions: editOptionData.textOptions,
            optionalTextOptions:
              editOptionData.selectedOption.options.length > 0 && editOptionData.selectedOption.options[0].textOptions,
          }),
        ),
      );
  };

  /**
   * 카트 수량 변경 (+, - 버튼)
   *
   * @param e
   * @private
   */
  const _changeCartCntByButton = e => {
    // 각 옵션별 수량 +, - 버튼
    const $button = $(e.target);
    const $tr = $button.parents('tr');
    const $input = $tr.find('input[name=orderCnt]');

    const type = $button.data('type');

    const displayStock = editOptionData.option._displayableStock;
    const isPreSalePeriod = editOptionData.option.isPreSalePeriod;
    const stockCnt = isPreSalePeriod
      ? editOptionData.selectedOptions[0].reservationStockCnt
      : editOptionData.selectedOptions[0].stockCnt;
    let orderCnt = Number($input.val());

    if (type === 'increase') {
      // 재고 노출 상태일 경우 재고 수량까지만 추가 가능
      // 재고 미노출 상태일 경우 99999999 까지 입력 가능
      if (orderCnt < stockCnt || (!displayStock && orderCnt < 99999999)) {
        orderCnt += 1;
      }
    } else {
      if (orderCnt > 1) {
        orderCnt -= 1;
      }
    }

    $input.val(orderCnt);
  };

  /**
   * 카트 수량 변경 (인풋)
   *
   * @param e
   * @private
   */
  const _changeCartCntByInput = e => {
    // 각 옵션별 수량 인풋
    const $input = $(e.target);
    const displayStock = editOptionData.option._displayableStock;

    if (!displayStock) return; // 미 노출일 경우 변경 완료 버튼 클릭 시 체크한다.

    const stockCnt = editOptionData.selectedOptions[0].stockCnt;
    let orderCnt = Number($input.val()) || 1;
    if (orderCnt < 1) {
      orderCnt = 1;
    }

    $input.val(orderCnt >= stockCnt ? stockCnt : orderCnt);
  };

  const _order = async e => {
    const $button = $(e.target);
    const type = $button.data('orderType');

    const cartNos = [];
    const products = [];

    $('tbody tr')
      .get()
      .filter(el => (type === 'part' ? $(el).find('input[type="checkbox"]').is(':checked') : true))
      .map(el => {
        const $el = $(el);

        cartNos.push($el.data('cartNo'));
        products.push({
          productNo: $el.data('productNo'),
          optionNo: $el.data('optionNo'),
          orderCnt: $el.data('orderCnt'),
          optionInputs: _getTextOptions($el),
        });
      });

    if (cartNos.length === 0) {
      shopby.alert('선택된 상품이 없습니다.');
      return;
    }

    const requestBody = {
      cartNos: cartNos,
      products: products,
      productCoupons: null,
      trackingKey: null,
      channelType: null,
    };

    const { status, data } = await shopby.api.order.postOrderSheets({ requestBody });

    if (status === 200) {
      // 비회원인 경우 로그인 페이지로 돌린다
      const orderPage = `/pages/order/order.html?ordersheetno=${data.orderSheetNo}`;
      if (shopby.logined()) {
        window.location.href = orderPage;
      } else {
        shopby.goLogin(orderPage);
      }
    } else {
      if (data && data.code === 'ODSH0002') {
        shopby.confirm(
          '선택하신 상품에 성인인증 상품이 있습니다. 성인인증 후 상품을 구매하시겠습니까?',
          ({ state }) => {
            if (state === 'ok') {
              shopby.goAdultCertification(location.href);
            }
          },
        );
      } else {
        shopby.alert(data && data.message ? data.message : '');
      }
    }
  };

  /**
   * 선택된 카트 제거
   * @private
   */
  const _removeCarts = () => {
    const cartNos = $('table tbody input[type="checkbox"]:checked')
      .get()
      .map(elem => Number($(elem).closest('tr').attr('data-cart-no')));

    if (shopby.utils.isArrayEmpty(cartNos)) {
      shopby.alert('선택된 상품이 없습니다.');
      return;
    }

    shopby.confirm({ message: `선택하신 ${cartNos.length}개의 상품을 장바구니에서 삭제하시겠습니까?` }, status => {
      if (status && status.state === 'ok') {
        shopby.helper.cart.removeCarts(cartNos).then(success => {
          if (success) {
            shopby.cart.initiate(true);
            shopby.helper.cart.updateCartCount(true);
          }
        });
      }
    });
  };

  shopby.cart = {
    async initiate(isRefresh = false) {
      // redering 초기화 (handlbar template 미노출 처리)
      this.calculatePrice();
      $('#removeButtonArea').hide();
      $('#orderBoxArea').hide();

      const cartData = await shopby.helper.cart.getCartData(true);

      // 재고 노출
      let displayStock = true;
      if (cartData && cartData.list.length > 0) {
        const productNo = cartData.list[0].product.productNo;
        const productOptions = await shopby.api.product.getProductsProductNoOptions({
          pathVariable: { productNo: productNo },
        });

        displayStock = productOptions.data.displayableStock;
      }

      this.render(cartData, displayStock);

      this.naverPay = await this.generateNaverPay();
      this.naverPay && this.naverPay.applyNaverPayButton(this.loadNaverPayOrder.bind(this));

      if (!isRefresh) {
        this.bindEvents();
      }

      this.calculatePrice();
    },
    render(cartData, displayStock) {
      // list render
      // todo cartData.list  selectType => 일체형 / 분리형 구분

      const compiled = Handlebars.compile($('#cartContentsTemplate').html());
      const html = $(compiled({ carts: cartData.list, displayStock: displayStock }));
      $('#cartContents').html(html);

      $('#removeButtonArea')
        .render({ hasProducts: shopby.utils.isArrayNotEmpty(cartData.list) })
        .show();

      // etc render
      $('#orderBoxArea')
        .render({ hasProducts: shopby.utils.isArrayNotEmpty(cartData.list) })
        .show();
    },
    bindEvents() {
      const allCheckedSelector = '#allChecked';
      const checkedSelector = '[name=checked]';

      $('body')
        .on('change', checkedSelector, () => {
          // 각 카트 체크박스
          $(allCheckedSelector).get(0).checked = $(checkedSelector)
            .get()
            .every(el => el.checked);

          this.calculatePrice();
        })
        .on('change', allCheckedSelector, ({ currentTarget: { checked: checked } }) => {
          // 전체 선택 체크박스
          $(checkedSelector).prop('checked', checked);
          this.calculatePrice();
        })
        .on('click', '.btnChangeOption', _onChangeOptionButton)
        .on('click', '.goods_cnt', _changeCartCntByButton)
        .on('change', 'input[name=orderCnt]', _changeCartCntByInput)
        .on('change', 'select', _changeOptionSelect)
        .on('click', '#removeButtonArea button', _removeCarts)
        .on('click', '.btn_order', _order)
        .on('keyup', 'input[name="textOptionItem"]', this.onKeyUpTextOptionInput);
    },
    calculatePrice() {
      const $cartPriceArea = $('#cartPriceArea');

      const cartNos = $('table tbody input[type="checkbox"]:checked')
        .get()
        .map(elem => parseInt($(elem).closest('tr').attr('data-cart-no')));

      shopby.helper.cart.getCartsCalculate(cartNos).then(price => {
        $cartPriceArea.render({
          checkedCount: cartNos.length,
          price: price,
        });
      });
    },

    async generateNaverPay() {
      const {
        data: { naverPay },
      } = await shopby.api.order.getOrderConfigs(); // 네이버페이 버튼은 어드민설정과 동일하게 실시간으로 반영되어야 한다.
      const isNaverElExists = $('#naverPay').length > 0;

      if (!naverPay || !isNaverElExists) {
        return null;
      }

      return shopby.helper.naverPay({
        EMBED_ID: 'naverPay',
        BUTTON_KEY: naverPay.buttonKey,
        BUTTON_COUNT: 1,
        ENABLE: 'Y',
      });
    },

    loadNaverPayOrder() {
      try {
        const products = $('tbody tr')
          .get()
          .filter(el => $(el).find('input[type="checkbox"]').is(':checked'))
          .map(el => {
            const $el = $(el);

            return {
              productNo: $el.data('productNo'),
              optionNo: $el.data('optionNo'),
              orderCnt: $el.data('orderCnt'),
              optionInputs: _getTextOptions($el),
            };
          });

        this.validateNaverPayOrder(products);
        this.naverPay.requestNaverPayOrder(products);
      } catch (e) {
        alert(e.message);
      }
    },

    validateNaverPayOrder(products) {
      if (products.length === 0) {
        throw new Error('선택된 상품이 없습니다.');
      }
    },

    onKeyUpTextOptionInput({ target }) {
      if (target.value.length > 100) {
        shopby.alert('텍스트옵션 입력글자수를 초과하였습니다.');
        target.value = target.value.substring(0, 100);
      }
    },
  };

  shopby.start.initiate(shopby.cart.initiate.bind(shopby.cart));
});

/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Daejoong Son
 * @since 2021.8.6
 */

$(() => {
  let editOptionData = null;
  let cartOptionsCompiled = null;
  let cartTextOptionsCompiled = null;
  let $originOptions = null;
  let hasProducts = null; // boolean

  const _getTextOptions = $li => {
    return $li
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

  const _cancelChangeOption = $li => {
    if ($li.find('.btnChangeOption').data('editStatus') !== 'editing') {
      return;
    }

    $li.find('.pick_add_info').append($originOptions);

    $li.find('.btnChangeOption').removeClass('on').data('editStatus', 'complete').html('옵션/수량 변경');
    $li.find('[data-can-change-option=true]').prop('disabled', true);
  };

  const getSelectedCartNos = () => {
    return $('#cart li input[type="checkbox"]:checked')
      .get()
      .map(elem => parseInt($(elem).closest('li').attr('data-cart-no')));
  };

  const _validateEditOption = $li => {
    if (editOptionData.selectedOptions.length === 0) {
      shopby.alert({ message: '옵션을 선택해주세요.', iconType: 'fail' });
      return false;
    }

    const textOptions = _getTextOptions($li);

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
   * @param $li
   * @private
   */
  const _changeOption = $li => {
    const cartNo = $li.data('cartNo');
    const productNo = $li.data('productNo');
    const orderCnt = $li.find('[name=orderCnt]').val();

    const optionInputs = _getTextOptions($li);

    shopby.helper.cart
      .removeCarts([cartNo])
      .then(success => {
        if (!success) {
          return Promise.reject();
        }

        return shopby.helper.cart.addCart([
          {
            productNo: productNo,
            optionNo: editOptionData.selectedOptions.length > 0 && editOptionData.selectedOptions[0].optionNo,
            orderCnt: orderCnt,
            optionInputs: optionInputs.map(input => ({
              inputLabel: input.inputLabel,
              inputValue: input.inputValue || '',
            })),
          },
        ]);
      })
      .finally(() => {
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
    const isComplete = $(e.currentTarget).data('editStatus') === 'complete';
    isComplete ? _renderOption(e) : _updateOption(e);
  };

  const _renderOption = async e => {
    const $button = $(e.currentTarget);
    const $li = $button.parents('li');

    const { cartNo, productNo, optionNo } = $li.data();

    _cancelOtherOptionEditing(cartNo);

    const { data } = await shopby.api.product.getProductsProductNoOptions({ pathVariable: { productNo } });
    const { data: productData } = await shopby.api.product.getProductsProductNo({
      pathVariable: { productNo: productNo },
    });
    const textOptions = _getTextOptions($li);
    editOptionData = shopby.helper.option(data, productData.reservationData, optionNo, textOptions);

    $originOptions = $li.find('[data-id="cartOptionsArea"]').html('');

    const $cartOptionsArea = $li.find('[data-id="cartOptionsArea"]');
    if (data.type === 'COMBINATION' || data.type === 'MAPPING') {
      cartOptionsCompiled = cartOptionsCompiled || Handlebars.compile($('#cartOptionsTemplate').html());
      $cartOptionsArea.append($(cartOptionsCompiled({ options: editOptionData.options })));
    }
    $cartOptionsArea.parent().addClass('on');

    const orderCnt = Number($li.find('input[name="orderCnt"]').val());
    const textInputNo = Number($li.find('input[name="textOptionItem"]').data('text-input-no'));
    const hasOptionalTextOption = editOptionData.textOptions.some(option => option.inputMatchingType === 'OPTION');
    if (orderCnt > 1 && hasOptionalTextOption) {
      editOptionData.drawAmountTextOption(optionNo, textInputNo, orderCnt);
    }

    cartTextOptionsCompiled = cartTextOptionsCompiled || Handlebars.compile($('#cartTextOptionsTemplate').html());
    $cartOptionsArea.append(
      $(
        cartTextOptionsCompiled({
          textOptions: editOptionData.textOptions,
          optionalTextOptions:
            editOptionData.selectedOption.options.length > 0 && editOptionData.selectedOption.options[0].textOptions,
        }),
      ),
    );

    $button.addClass('on').data('editStatus', 'editing');
    $button.text('변경 완료');

    const $quantity = $li.find('[data-can-change-option=true]');
    $quantity.prop('disabled', false);
  };

  /**
   * @fixme
   * 이 메서드 탈때 옵션이 변경되는게 아니라 상품이 하나 더 담깁니다.
   * pc 에도 재현되는 문제인데 pc와 같이 수정필요합니다.
   */
  const _updateOption = e => {
    const $button = $(e.currentTarget);
    const $li = $button.parents('li');
    if (!_validateEditOption($li)) return;
    _changeOption($li);
    const $quantity = $li.find('[data-can-change-option=true]');
    $quantity.prop('disabled', true);
    $li.find('.btnChangeOption').removeClass('on').data('editStatus', 'complete').html('옵션/수량 변경');
  };

  const _cancelOtherOptionEditing = cartNo => {
    const otherCarts = $(`#cart li[data-cart-no!=${cartNo}]`);
    otherCarts.get().map(el => {
      _cancelChangeOption($(el));
    });
  };

  /**
   * select box 옵션 변경
   *
   * @param e
   * @private
   */
  const _changeOptionSelect = e => {
    const $select = $(e.currentTarget);
    const $li = $select.parents('li');
    const depth = $select.data('depth');
    const selectedIndex = $select.find('option').index($select.find('option:selected'));

    editOptionData.changeSelectOption(depth, selectedIndex, true);

    if (editOptionData.selectedOptions.length > 0) {
      const $input = $li.find('input[name=orderCnt]');
      const orderCnt = Number($input.val());
      if (orderCnt > editOptionData.selectedOptions[0].stockCnt) {
        $input.val(editOptionData.selectedOptions[0].stockCnt);
      }
    }

    $li.find('.cart_options_area .inp_sel').remove();
    $li
      .find('.cart_options_area')
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
    const $li = $button.parents('li');
    const $input = $li.find('input[name=orderCnt]');

    const type = $button.data('type');

    const isPreSalePeriod = editOptionData.option.isPreSalePeriod;
    const stockCnt = isPreSalePeriod
      ? editOptionData.selectedOptions[0].reservationStockCnt
      : editOptionData.selectedOptions[0].stockCnt;
    let orderCnt = Number($input.val());

    if (type === 'increase') {
      if (orderCnt < stockCnt) {
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

    const stockCnt = editOptionData.selectedOptions[0].stockCnt;
    let orderCnt = Number($input.val()) || 1;
    if (orderCnt < 1) {
      orderCnt = 1;
    }

    $input.val(orderCnt >= stockCnt ? stockCnt : orderCnt);
  };

  const _order = async () => {
    const cartNos = [];
    const products = [];

    $('#cart li')
      .get()
      .filter(el => $(el).find('input[type="checkbox"]').is(':checked'))
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

  const _removeCart = event => {
    event.preventDefault();

    const cartNoString = event.currentTarget.dataset.cartNo;
    if (!cartNoString) return;
    const cartNos = [Number(cartNoString)];

    shopby.confirm({ message: '선택된 상품을 장바구니에서 삭제하시겠습니까?' }, status => {
      if (status && status.state === 'ok') {
        shopby.helper.cart.removeCarts(cartNos).then(success => {
          if (success) {
            shopby.cart.initiate();
            shopby.helper.cart.updateCartCount(true);
          }
        });
      }
    });
  };

  const _removeSelectedCarts = () => {
    const cartNos = getSelectedCartNos();

    if (cartNos.length < 1) {
      shopby.alert('선택된 상품이 없습니다.');
      return;
    }

    shopby.confirm({ message: `선택하신 ${cartNos.length}개의 상품을 장바구니에서 삭제하시겠습니까?` }, status => {
      if (status && status.state === 'ok') {
        shopby.helper.cart.removeCarts(cartNos).then(success => {
          if (success) {
            shopby.cart.initiate();
            shopby.helper.cart.updateCartCount(true);
          }
        });
      }
    });
  };

  shopby.cart = {
    async initiate(isRefresh = false) {
      // redering 초기화 (handlbar template 미노출 처리)
      $('#selectRemoveArea').hide();
      $('#orderBoxArea').hide();

      const cartData = await shopby.helper.cart.getCartData(true);
      this.setHasProducts(cartData);
      this.calculatePrice();
      this.render(cartData);

      this.naverPay = await this.generateNaverPay();
      this.naverPay && this.naverPay.applyNaverPayButton(this.loadNaverPayOrder.bind(this));

      if (!isRefresh) {
        this.bindEvents();
      }

      this.calculatePrice();
    },
    setHasProducts(cartData) {
      hasProducts = shopby.utils.isArrayNotEmpty(cartData.list);
    },
    render(cartData) {
      // list render
      const compiled = Handlebars.compile($('#cartContentsTemplate').html());
      const html = $(compiled({ carts: cartData.list }));
      $('#cartContents').html(html);

      $('#selectRemoveArea').render({ hasProducts }).show();
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
        .on('click', '#selectRemoveArea button', _removeSelectedCarts)
        .on('click', '[data-action="deleteItem"]', _removeCart)
        .on('click', '.btn_order', _order)
        .on('keyup', 'input[name="textOptionItem"]', this.onKeyUpTextOptionInput);
    },
    calculatePrice() {
      const $cartPriceArea = $('#cartPriceArea');
      const $cartSubmitArea = $('#cartSubmitArea');

      const cartNos = getSelectedCartNos();
      const {
        accumulationConfig: { accumulationUnit },
      } = shopby.cache.getMall();

      shopby.helper.cart.getCartsCalculate(cartNos).then(price => {
        $cartPriceArea.render({
          hasProducts,
          checkedCount: cartNos.length,
          accumulationUnit,
          price,
        });
        $cartSubmitArea.render({
          hasProducts,
          price,
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
        const products = $('#cart li')
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

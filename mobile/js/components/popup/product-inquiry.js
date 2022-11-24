/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @author Bomee Yoon
 *  @since 2021.8.20
 */

(() => {
  class ProductInquiry {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#productInquiryPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);

      this.option = option;
      this.callback = callback;
      this.originData = null;
      this.contentData = null;
      this.initiate();
    }
    get modeFlag() {
      const mode = this.option && this.option.mode ? this.option.mode : null;
      const isEditMode = mode === 'modification';
      return {
        isEditMode,
        mode: isEditMode ? mode : 'registration',
        label: '저장',
      };
    }
    initiate() {
      const { guestPostingUsed, secretPostingUsed, name } = shopby.cache.getBoardsConfig().productInquiryConfig;
      this.setData(secretPostingUsed, guestPostingUsed);
      this.render(name);
      this.bindEvents();
    }
    setData(secretPostingUsed, guestPostingUsed) {
      this.contentData = this._generateProductInquiryContent(secretPostingUsed, guestPostingUsed);
    }
    render(name) {
      $('.h_tit').text(name);
      this._renderInquiryContent();
      this.originData = this._getUpdatedProductInquiryContent();
    }
    _renderInquiryContent(selectedProducts) {
      selectedProducts = selectedProducts ? this._mergeSelectedProductsData(selectedProducts) : this.contentData;
      selectedProducts.notice = `답변완료된 문의는 유형 및 내용 수정이 불가합니다.\n \n \n${selectedProducts.content}`;
      $('#productInquiryContent').render(selectedProducts);
      $('#editor').val(selectedProducts.replied ? selectedProducts.notice : selectedProducts.content);
    }
    bindEvents() {
      this.$el
        .on('input paste', 'textarea[name="content"]', this._onInputInquiryContent)
        .on('click', 'button', this._onClickHandler.bind(this));
    }
    _onInputInquiryContent({ target }) {
      const pattern = shopby.regex.noCommonSpecial;
      const value = target.value.replace(pattern, '');
      const valueLength = value.length;
      const maxLength = this.getAttribute('maxlength');

      $(target).val(value);
      $(this).siblings('.textarea_box_length').text(`${valueLength}/${maxLength}`);
    }
    _onClickHandler({ target }) {
      const $target = $(target);
      const actionType = $target.data('actionType') || $target.parent().data('actionType');
      if (!actionType) return;

      switch (actionType) {
        case 'searchProduct':
          this._openSearchProductLayer();
          break;
        case 'submit':
          this._submitHandler();
          break;
        case 'close':
          this._closePopup();
          break;
        default:
          break;
      }
    }
    _openSearchProductLayer() {
      const afterSearchingProducts = result => {
        if (result.state !== 'ok') return;
        const imageUrl = result.data.imageUrls && result.data.imageUrls.length > 0 ? result.data.imageUrls.shift() : '';
        this._renderInquiryContent({
          ...result.data,
          mode: this.modeFlag.mode,
          imageUrl,
        });
      };
      shopby.popup('select-product', null, afterSearchingProducts.bind(this));
    }
    async _submitHandler() {
      try {
        this.modeFlag.isEditMode
          ? await this._putProductInquiry(this.requestBody)
          : await this._postProductInquiry(this.requestBody);

        shopby.alert(`${this.modeFlag.label}이 완료되었습니다.`, () => this.close({ state: 'ok' }));
      } catch (error) {
        shopby.alert(error.message || error.result.message);
      }
    }
    get requestBody() {
      const requestBody = this._getUpdatedProductInquiryContent();
      if (!requestBody.productNo) {
        throw new Error('상품을 선택해주세요.');
      }
      if (!requestBody.content.trim()) {
        throw new Error('내용을 입력해주세요.');
      }
      return requestBody;
    }
    async _postProductInquiry(requestBody) {
      return await shopby.api.display.postProductsProductNoInquires({
        pathVariable: { productNo: requestBody.productNo },
        requestBody,
      });
    }
    async _putProductInquiry(requestBody) {
      requestBody.content =
        this.contentData && this.contentData.replied ? this.contentData.content || '' : requestBody.content;

      return await shopby.api.display.putProductsInquiresInquiryNo({
        pathVariable: { inquiryNo: requestBody.inquiryNo },
        requestBody,
      });
    }
    _closePopup() {
      const currentData = this._getUpdatedProductInquiryContent();
      if (!shopby.utils.isEqual(this.originData, currentData)) {
        shopby.confirm({ message: '변경된 정보를 저장하지 않고 이동하시겠습니까?' }, ({ state }) => {
          if (state !== 'ok') return;
          this.close(state);
        });
      } else {
        this.close();
      }
    }
    _getUpdatedProductInquiryContent() {
      const { productNo, productName, imageUrl } = this.$el.find('#selectedProduct').data();
      return {
        type: this.$el.find('select[name="type"] option:selected').val(),
        inquiryNo: this.option && this.option.inquiryNo ? this.option.inquiryNo : null,
        productNo,
        productName,
        imageUrl,
        title: null,
        email: null,
        content: this.$el.find('textarea[name="content"]').val(),
        secreted: this.$el.find('#secreted').is(':checked'),
      };
    }
    _generateProductInquiryContent(secretPostingUsed, guestPostingUsed) {
      const { productInquiryType: inquiryTypes } = shopby.cache.getMall();
      const hasOption = this.option && this.option.productNo > 0;
      const defaultProductInquiryContent = {
        mode: this.modeFlag.mode,
        inquiryTypes,

        type: inquiryTypes[0].value,
        inquiryNo: null,
        productNo: null,
        productName: null,
        imageUrl: null,
        title: null,
        email: null,
        content: '',
        secreted: false,
        unchangeable: this.modeFlag.isEditMode || hasOption,

        displayOption: {
          secretPostingUsed,
          guestPostingUsed,
        },
      };
      return hasOption ? { ...defaultProductInquiryContent, ...this.option } : { ...defaultProductInquiryContent };
    }
    _mergeSelectedProductsData(selectedProducts) {
      return {
        ...this.contentData,
        ...selectedProducts,
        type: this.$el.find('select[name="type"] option:selected').val(),
      };
    }
  }
  shopby.registerPopupConstructor('product-inquiry', ProductInquiry);
})();

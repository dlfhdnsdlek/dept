/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.8.20
 */

(() => {
  class ProductReview {
    constructor($parent, option, callback) {
      Promise.all([this.setProductReviewsConfigurations()]).then(() => {
        const compiled = Handlebars.compile($('#productReviewPopupTemplate').html());
        this.optionInrercepter(option);
        this.$el = $(compiled(option));
        this.option = option;
        this.callback = callback;
        this.attachedImages = [];
        this.originData = null;
        $parent.append(this.$el);
        this.render();
        this.bindEvents();
      });
    }

    optionInrercepter(option) {
      option.canSelectProduct = !option.myProductReview && !option.notSelectProduct;
      option.needsSelectProductBtn = option.canSelectProduct || (option && option.needsSelectProductBtn) || null;
      option.expandedReviewConfig = this.expandedReviewConfig;
      option.reviewAccumulationInfo = this.reviewAccumulationInfo;
    }

    async getProductReviewsConfigurations() {
      const { data } = await shopby.api.display.getProductReviewsConfigurations();
      return data;
    }

    async setProductReviewsConfigurations() {
      const { expandedReviewConfig, reviewAccumulationInfo } = await this.getProductReviewsConfigurations();
      this.expandedReviewConfig = expandedReviewConfig;
      this.reviewAccumulationInfo = reviewAccumulationInfo;
    }

    get reviewData() {
      return {
        productNo: $('input[name="productNo"]').data('product-no'),
        optionNo: $('input[name="optionNo"]').data('option-no'),
        orderOptionNo: $('input[name="orderOptionNo"]').data('order-option-no'),
        content: $('textarea[name="content"]').val(),
        rate: this.selectedRate,
        images: this.attachedImages.map(image => {
          return image.imageUrl;
        }),
      };
    }

    render() {
      const { myProductReview: isOriginData, product, options, canSelectProduct, isProductViewPage } = this.option;

      if (isProductViewPage) {
        $('#selectOrderProduct').text('다른 상품 선택');
      }

      if (!canSelectProduct) {
        this.renderOrderedProduct({ product, options, canSelectProduct });
      }

      if (isOriginData) {
        this._drawRate(isOriginData.rate);
        this._fetchAttachImages(isOriginData);
        this.renderImages(this.attachedImages);
        $('#editor').val(isOriginData.content);
      } else {
        this._drawRate(5);
      }

      this.originData = this.reviewData;
      this._checkAttachmentConfig(isOriginData);
    }

    _checkAttachmentConfig(isOriginData) {
      const { productReviewConfig, accumulationRewardNoticeText } = this.option;
      this.accumulationRewardNoticeText = accumulationRewardNoticeText;

      if (productReviewConfig.attachmentUsed) return;
      if (!isOriginData) {
        $('#attachmentBox').remove();
      } else {
        $('.file_upload_sec').remove();
      }
    }

    bindEvents() {
      this.$el
        .on('paste input', 'textarea[name="content"]', this.onInputText)
        .on('change', 'input[type="file"]', this.openAttachment.bind(this))
        .on('click', '#deleteAttachImage', this.deleteAttachment.bind(this))
        .on('click', '#btnAddReview', this.writeReview.bind(this))
        .on('click', '.rating_star li', this.fillRate.bind(this))
        .on('click', '#selectOrderProduct', this.openSelectOrderProduct.bind(this))
        .on('click', '.ly_btn_close', this.closeButton.bind(this));
    }

    onInputText({ target }) {
      const pattern = shopby.regex.noCommonSpecial;
      const { value } = target;
      const valueLength = this.value.length;
      const maxLength = this.getAttribute('maxlength');

      if (value.match(pattern)) {
        $(target).val(value.replace(pattern, ''));
      }

      $(target).next().text(`${valueLength}/${maxLength}`);
    }

    openAttachment(event) {
      const uploadImageCallback = data => {
        this.attachedImages.push(data);
        this.renderImages(this.attachedImages);
      };
      shopby.helper.attachments.onChangeAttachments(event, uploadImageCallback, this.attachedImages.length);
    }

    deleteAttachment({ target }) {
      shopby.confirm({ message: '첨부파일을 삭제하시겠습니까?' }, callback => {
        if (callback.state === 'ok') {
          const deleteImageId = $(target).closest('li').data('image-id');
          this.attachedImages.splice(deleteImageId, 1);
          this.renderImages(this.attachedImages);
        }
      });
    }

    async _checkValidation(articleData) {
      const reviewTextLength =
        this.attachedImages.length > 0
          ? this.reviewAccumulationInfo.photoReviewsLength
          : this.reviewAccumulationInfo.reviewsLength;
      if (!articleData.productNo) {
        shopby.alert({ message: '주문상품을 선택해주세요.' });
        return;
      }

      if (!articleData.content) {
        shopby.alert({ message: '내용을 입력해주세요.' });
        return;
      }
      if (
        articleData.content.length < reviewTextLength &&
        this.expandedReviewConfig.accumulationRewardNoticeText !== ''
      ) {
        shopby.confirm({ message: this.expandedReviewConfig.accumulationRewardNoticeText }, ({ state }) => {
          if (state !== 'ok') {
            shopby.alert('작성을 취소하였습니다.');
            return;
          }

          this._checkBuyConfirm();
        });
      } else {
        this._checkBuyConfirm();
      }
    }

    async writeReview() {
      const reviewData = this.reviewData;
      const { myProductReview: isOriginData } = this.option;
      try {
        if (isOriginData) {
          this._checkModifyCondition(reviewData);
          this._updateProductReview(isOriginData, reviewData);
        } else {
          await this._checkValidation(reviewData);
        }
      } catch (e) {
        if (isOriginData) {
          this._reviewContentsCheckMessage(e.message, isOriginData, reviewData);
        }
      }
    }

    async _addProductReview(reviewData) {
      const postReviewRequest = {
        pathVariable: { productNo: reviewData.productNo },
        requestBody: {
          optionNo: reviewData.optionNo,
          orderOptionNo: reviewData.orderOptionNo,
          content: reviewData.content,
          rate: reviewData.rate,
          urls: reviewData.images,
        },
      };
      await shopby.api.display.postProductsProductNoProductReviews(postReviewRequest);
      shopby.alert('저장되었습니다', () => {
        this.close({ state: 'ok' });
      });
    }

    async _updateProductReview(originData, reviewData) {
      const { productNo, reviewNo } = originData;
      const { content, rate, images } = reviewData;
      const filteredImages = images.filter(img => img !== null);
      const request = {
        pathVariable: { productNo, reviewNo },
        requestBody: { content, rate, urls: filteredImages || [] },
      };
      await shopby.api.display.putProductsProductNoProductReviewsReviewNo(request);
      shopby.alert('저장되었습니다', () => {
        this.close({ state: 'ok' });
      });
    }

    fillRate({ currentTarget }) {
      this.selectedRate = $(currentTarget).index() + 1;
      $('.rating_star li').removeClass('on');
      this._drawRate(this.selectedRate);
    }

    _drawRate(rates) {
      $('.rating_star li')
        .filter(index => rates >= index + 1)
        .addClass('on');
      this.selectedRate = rates;
    }

    openSelectOrderProduct() {
      const optionOrderNo = $('#selectedProductBox input[name="orderOptionNo"]').data('order-option-no');
      const productNo = this.option.product && this.option.product.productNo ? this.option.product.productNo : null;
      shopby.popup(
        'select-order-product',
        {
          isProductViewPage: this.option.isProductViewPage,
          productNo,
          orderOptionNo: optionOrderNo || null, //todo pc
          //orderOptionNo: this.option.options?.find(option => option.orderOptionNo)?.orderOptionNo ?? null,
        },
        callback => {
          if (callback.state === 'close') return;
          $('.js_selected_info_text').css('display', 'none');
          $('#selectOrderProduct').text('다른 상품 선택');
          const { selectedProductNo, selectedProductOptions } = callback;
          this._getProduct(selectedProductNo, selectedProductOptions);
        },
      );
    }

    closeButton() {
      const isNotChanged = shopby.utils.isEqual(this.originData, this.reviewData);

      if (isNotChanged) {
        this.$el.remove();
      } else {
        shopby.confirm({ message: '변경된 정보를 저장하지 않고 이동하시겠습니까?' }, callback => {
          if (callback.state === 'close') return;
          this.$el.remove();
        });
      }
      $('body').removeClass('popup-open');
    }

    async _getProduct(selectedProductNo, selectedProductOptions) {
      const { data: selectedProduct } = await shopby.api.product.getProductsProductNo({
        pathVariable: { productNo: selectedProductNo },
      });
      const { imageUrls, productName, productNo } = selectedProduct.baseInfo;
      const product = { imageUrls, productName, productNo };
      this.renderOrderedProduct({ product, options: [selectedProductOptions] });
    }

    renderOrderedProduct(data) {
      $('#selectedProductBox').render(data);
    }

    _fetchAttachImages(isOriginData) {
      if (!isOriginData || !isOriginData.fileUrls || isOriginData.fileUrls.length === 0) return;
      this.attachedImages = isOriginData.fileUrls.map(articleAttachment => ({
        imageUrl: articleAttachment,
        originName: '',
      }));
    }

    renderImages(attachedImages) {
      $('#attachImages').render({ attachedImages });
    }

    _checkBuyConfirm() {
      if (this.option.orderStatusType === 'BUY_CONFIRM') {
        this._addProductReview(this.reviewData);
        return;
      }
      shopby.confirm({ message: '후기 작성과 함께 구매확정 처리하시겠습니까?' }, ({ state }) => {
        if (state !== 'ok') return;
        this._addProductReview(this.reviewData);
      });
    }

    _checkModifyCondition(reviewData) {
      const attachImagesLength = this.reviewData.images.length;
      const contentLength = reviewData.content.length;
      const contentConfig = (productReviewConfig => key => {
        if (
          !productReviewConfig ||
          !productReviewConfig.reviewAccumulation ||
          !productReviewConfig.reviewAccumulation[key] ||
          !productReviewConfig.reviewAccumulation[key].contentLength
        )
          return;
        return productReviewConfig.reviewAccumulation[key].contentLength;
      })(this.option.productReviewConfig);
      const photoReviewContentConfig = contentConfig('photoReview');
      const normalReviewContentConfig = contentConfig('normalReview');
      const message =
        '상품후기 적립금 지급조건에 충족되지 않습니다.<br>수정 시 지급된 적립금이 차감됩니다. 수정하시겠습니까?';
      if (attachImagesLength > 0 && contentLength < photoReviewContentConfig) {
        throw new Error(message);
      }
      if (attachImagesLength === 0 && contentLength < normalReviewContentConfig) {
        throw new Error(message);
      }
    }

    _reviewContentsCheckMessage(message, isOriginData, reviewData) {
      shopby.confirm({ message }, callback => {
        if (callback.state === 'ok') {
          this._updateProductReview(isOriginData, reviewData);
        }
      });
    }
  }

  shopby.registerPopupConstructor('product-review', ProductReview);
})();

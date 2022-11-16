/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.15
 */

$(() => {
  const productNo = shopby.utils.getUrlParam('productNo');
  const inquiryNo = shopby.utils.getUrlParam('inquiryNo');
  shopby.my.productInquiry = {
    productInquiryConfig: shopby.cache.getBoardsConfig().productInquiryConfig,
    myProductInquiry: null,
    initiate() {
      this._getMyProductInquiry().then(() => {
        this.render();
        this.bindEvents();
      });
    },

    render() {
      $('#productInquiryName').render({ productInquiryConfig: this.productInquiryConfig });
      $('#boardViewPage').render({ myProductInquiry: this.myProductInquiry });
    },

    bindEvents() {
      $('.btn_bx')
        .on('click', '.view_modify_btn', this.openProductInquiryPopupWithModificationMode.bind(this))
        .on('click', '.view_del_btn', this.onDelete.bind(this));
    },

    openProductInquiryPopupWithModificationMode() {
      const optionForProductInquiryPopup = shopby.utils.pickObjectByKeys(this.myProductInquiry, [
        'inquiryNo',
        'type',
        'productNo',
        'productName',
        'imageUrl',
        'title',
        'content',
        'secreted',
        'modifiable',
        'myInquiry',
        'replied',
      ]);
      shopby.popup(
        'product-inquiry',
        {
          mode: 'modification',
          ...optionForProductInquiryPopup,
        },
        result => {
          if (result && result.state === 'ok') {
            this._getMyProductInquiry().then(() => this.render());
          }
        },
      );
    },

    onDelete() {
      shopby.confirm({ message: '문의글을 삭제하시겠습니까?' }, ({ state }) => {
        if (state !== 'ok') return;
        this.deleteProductInquiry();
      });
    },

    async deleteProductInquiry() {
      await shopby.api.display.deleteProductsInquiresInquiryNo({ pathVariable: { inquiryNo } });
      shopby.alert('삭제되었습니다.', () => {
        location.replace('/pages/my/product-inquiries.html');
      });
    },

    async _getMyProductInquiry() {
      const { data } = await shopby.api.display.getProductsProductNoInquiresInquiryNo({
        pathVariable: { productNo, inquiryNo },
      });
      this.myProductInquiry = data;
    },
  };

  shopby.start.initiate(shopby.my.productInquiry.initiate.bind(shopby.my.productInquiry));
});

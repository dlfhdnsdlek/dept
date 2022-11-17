/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.14
 */

$(() => {
  const productNo = shopby.utils.getUrlParam('productNo');
  const reviewNo = shopby.utils.getUrlParam('reviewNo');
  shopby.my.productReview = {
    productReviewConfig: shopby.cache.getBoardsConfig().productReviewConfig,
    myProductReview: null,
    initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      this._getMyProductReview().then(() => {
        this.render();
      });
      this.bindEvents();
    },

    render() {
      $('#myProductReviewPage').render({
        productReviewConfig: this.productReviewConfig,
        myProductReview: this.myProductReview,
      });
    },

    bindEvents() {
      $('#myProductReviewPage')
        .on('click', '.add_file_area', this.mapAttachments.bind(this))
        .on('click', '.btn_right_box', this.delOrEditBtn.bind(this));
    },

    mapAttachments({ target }) {
      const { fileUrls } = this.myProductReview;
      const attachImages = fileUrls.map(fileUrl => ({
        imageUrl: fileUrl,
      }));
      this.openSlideImagesPopup(attachImages, target);
    },

    openSlideImagesPopup(attachImages, target) {
      shopby.popup('slide-images', {
        title: '첨부파일',
        imageObjectList: attachImages,
        clickedImageIndex: $(target.closest('li')).index(),
      });
    },

    delOrEditBtn({ target }) {
      const clicked = $(target).data('mode');
      switch (clicked) {
        case 'del':
          this._deleteReview();
          break;
        case 'edit':
          this._openReviewPopup();
          break;
        default:
          break;
      }
    },

    _deleteReview() {
      const deleteReview = async ({ state }) => {
        if (state !== 'ok') return;
        await shopby.api.display.deleteProductsProductNoProductReviewsReviewNo({
          pathVariable: { productNo, reviewNo },
        });
        shopby.alert('삭제되었습니다.', () => {
          location.replace('/pages/my/product-reviews.html');
        });
      };
      if (this.myProductReview.givenAccumulationYn === 'Y') {
        shopby.confirm(
          { message: '삭제 시 재작성이 불가하며, 지급된 적립금이 차감됩니다. 삭제하시겠습니까?' },
          deleteReview,
        );
      } else {
        shopby.confirm({ message: '삭제 시 재작성이 불가합니다. 상품후기를 삭제하시겠습니까?' }, deleteReview);
      }
    },

    _openReviewPopup() {
      const { productName, productNo, imageUrl: imageUrls, orderedOption } = this.myProductReview;
      shopby.popup(
        'product-review',
        {
          productReviewConfig: this.productReviewConfig,
          myProductReview: this.myProductReview,
          product: { productName, productNo, imageUrls },
          options: [{ ...orderedOption }],
        },
        callback => {
          if (callback.state === 'ok') {
            this._getMyProductReview().then(() => {
              this.render();
            });
          }
        },
      );
    },

    async _getMyProductReview() {
      const { data } = await shopby.api.display.getProductsProductNoProductReviewsReviewNo({
        pathVariable: { productNo, reviewNo },
      });
      this.myProductReview = data;
    },
  };

  shopby.start.initiate(shopby.my.productReview.initiate.bind(shopby.my.productReview));
});

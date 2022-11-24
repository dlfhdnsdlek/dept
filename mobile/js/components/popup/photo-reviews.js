/*
 *  © 2022. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author Eunbi Kim
 *  @since 2022.6.16
 *
 */

(() => {
  class PhotoReviews {
    constructor($parent, option, callback) {
      this.callback = callback;
      this.$el = $parent;
      this.option = option; // {productNo}
      this.page = 1;
      this.PAGE_SIZE = 24;
      this.photoReviewData = {};
      this.photoReviewParam = {};
      this.$reviewImages = null;
      this.$scrollBox = null;
      this.initiate();
    }

    async initiate() {
      await this.setPhotoReviewData();
      this.render(this.$el, this.option);
      this.bindEvents();
    }

    render($parent) {
      const compiled = Handlebars.compile($('#photoReviewsTemplate').html());
      this.$el = $(compiled(this.photoReviewData));
      $parent.append(this.$el);
      this.$reviewImages = $('#reviewImages');
      this.$scrollBox = $('.scroll_box');
    }

    bindEvents() {
      this.$el.find('.reviewImg').off('click');
      this.$el.find('.reviewImg').on('click', this.handleImageClick.bind(this));
      this.$reviewImages.on('touchmove', shopby.utils.throttleUsingRaf(this.scrollPhotoReviews.bind(this)));
    }

    handleImageClick({ target }) {
      const totalPage = $('.img-frame.reviewImg').length;
      const reviewNo = $(target).closest('button').data('review-no');
      this.close();
      this.photoReviewParam.queryString.pageSize = this.page * this.PAGE_SIZE;
      this.photoReviewParam.queryString.pageNumber = 1;

      shopby.popup('photo-review-detail', {
        productReviewConfig: { name: '상세 후기' },
        reviewNo,
        productNo: this.option.productNo,
        hasCloseBtn: false,
        type: 'photoReviews',
        parameter: this.photoReviewParam,
        onlyDisplayedReviews: true,
        totalPage,
      });
    }

    async getPhotoReviews() {
      this.photoReviewParam = {
        pathVariable: { productNo: this.option.productNo },
        queryString: { hasTotalCount: true, pageNumber: this.page, pageSize: this.PAGE_SIZE },
      };
      const { data } = await shopby.api.display.getProductsProductNoPhotoReviews(this.photoReviewParam);
      return data;
    }

    async setPhotoReviewData() {
      this.photoReviewData = await this.getPhotoReviews();
    }

    renderReviewImages() {
      const reviewImagesTemplate = this.photoReviewData.contents.reduce((acc, content) => {
        acc += this.getReviewImagesTemplate(content);
        return acc;
      }, '');
      this.$reviewImages.append(reviewImagesTemplate);
    }

    async scrollPhotoReviews() {
      const scrollHeight = this.$scrollBox.scrollTop();
      const outerHeight = this.$scrollBox.outerHeight();
      const innerHeight = this.$reviewImages.innerHeight();
      const isBottom = scrollHeight + outerHeight > innerHeight;

      if (isBottom) {
        this.$reviewImages.off('touchmove');
        this.page += 1;
        await this.setPhotoReviewData();
        this.renderReviewImages();
        this.bindEvents();
      }
    }

    getReviewImagesTemplate({ attachedFileCount, urls, reviewNo }) {
      return `
       <button class='img-frame reviewImg' data-review-no='${reviewNo}'>
           <img src='${urls[0]}' alt='포토리뷰' />
           <span class='p-grid-file-count'>
               ${attachedFileCount}
           </span>
       </button>
      `;
    }
  }

  shopby.registerPopupConstructor('photo-reviews', PhotoReviews);
})();

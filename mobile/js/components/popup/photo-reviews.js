/*
 *  © 2022. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author Eunbi Kim
 *  @since 2022.6.8
 *
 */

(() => {
  class PhotoReviews {
    constructor($parent, option, callback) {
      this.callback = callback;
      this.$el = $parent;
      this.option = option;
      this.page = 1;
      this.PAGE_SIZE = 28;
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
      this.$scrollBox = $('.p-grid-wrap');
    }

    bindEvents() {
      //이벤트를 풀었다 다시 켜는 이유가
      //스크롤시 새로운 이미지에 이벤트를 걸어야하는데 bindEvents를 실행하면 기존의 이미지에도 이벤트가 다시 걸려
      //이벤트가 중복으로 걸려져 버그가 발생함
      //그래서 모든 이미지의 이벤트를 풀고 다시 검
      this.$el.find('.reviewImg').off('click');
      this.$el.find('.reviewImg').on('click', this.handleImageClick.bind(this));
      this.$scrollBox.on('scroll', shopby.utils.throttleUsingRaf(this.scrollPhotoReviews.bind(this)));
    }

    handleImageClick({ target }) {
      const totalPage = $('.img-frame').length;
      const reviewNo = $(target).closest('button').data('review-no');
      this.close();
      this.photoReviewParam.queryString.pageSize = this.page * this.PAGE_SIZE;
      this.photoReviewParam.queryString.pageNumber = 1;

      shopby.popup('photo-review-detail', {
        reviewNo,
        productNo: this.option.productNo,
        hasCloseBtn: false,
        type: 'photoReviews',
        parameter: this.photoReviewParam,
        totalPage,
        isView: true,
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
        this.$scrollBox.off('scroll');
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
           <p class='add_img_length'>
               ${attachedFileCount}
           </p>
       </button>
      `;
    }
  }

  shopby.registerPopupConstructor('photo-reviews', PhotoReviews);
})();

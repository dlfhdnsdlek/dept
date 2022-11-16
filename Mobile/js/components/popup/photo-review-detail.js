/*
 *  © 2022. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author Eunbi Kim
 *  @since 2022.6.17
 *
 */

(() => {
  const COMMENT_PAGE_SIZE = 20;
  class PhotoReviewDetail {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;
      this.reviewComment = { page: 1, contents: [] };
      this.review = {};
      this.reviewsInfo = { currentReviewIndex: 0, reviewNos: [], maxPageNumber: 0 };
      this.isFirstRequest = true;
      this.touchCoordinate = {
        touchstartX: 0,
        touchendX: 0,
      };
      this.initiate($parent, option);
    }

    async initiate($parent, option) {
      await this.render($parent, option);
      this.setPrevAndNextReviewData(true);
      this.bindEvents();
    }

    getReviewsConfigurations() {
      return shopby.api.display.getProductReviewsConfigurations();
    }

    getReview() {
      const { productNo, reviewNo } = this.option;
      return shopby.api.display.getProductsProductNoProductReviewsReviewNo({
        pathVariable: { productNo, reviewNo },
      });
    }

    async setData() {
      const reviewData = await Promise.all([this.getReviewsConfigurations(), this.getReview()]);
      this.review = reviewData.reduce((acc, { data }) => ({ ...acc, ...data }), {});
      this.review.isLogin = shopby.logined();
    }

    getReviewNos(reviews) {
      return reviews.map(({ reviewNo }) => reviewNo);
    }

    get findCurrentReviewIndex() {
      return this.reviewsInfo.reviewNos.findIndex(reviewNo => reviewNo === this.option.reviewNo);
    }

    getMaxPageNumber(totalCount) {
      if (this.option.onlyDisplayedReviews) return this.option.totalPage;
      if (this.option.type === 'productReviews') return totalCount;
      return Math.ceil(totalCount / this.option.parameter.queryString.pageSize);
    }

    setReviewsInfo(reviews, totalCount) {
      this.reviewsInfo.reviewNos = this.getReviewNos(reviews);
      this.reviewsInfo.currentReviewIndex = this.findCurrentReviewIndex;
      if (this.isFirstRequest) this.reviewsInfo.maxPageNumber = this.getMaxPageNumber(totalCount);
    }

    async setPhotoReviewsData() {
      const { data } = await shopby.api.display.getProductsProductNoPhotoReviews(this.option.parameter);
      this.setReviewsInfo(data.contents, data.totalCount);
    }

    async setProductReviewsData() {
      const { data } = await shopby.api.display.getProductsProductNoProductReviews(this.option.parameter);
      this.setReviewsInfo(data.items, data.totalCount);
    }

    async setReviewsBoardsData() {
      const { data } = await shopby.api.display.getReviewBoards(this.option.parameter);
      this.setReviewsInfo(data.items, data.totalCount);
    }

    async setPrevAndNextReviewData(isFirstRequest = false) {
      this.isFirstRequest = isFirstRequest;
      switch (this.option.type) {
        case 'photoReviews':
          await this.setPhotoReviewsData();
          break;
        case 'productReviews':
          await this.setProductReviewsData();
          break;
        case 'boards':
          await this.setReviewsBoardsData();
          break;
      }
    }

    async render($parent, option) {
      const compiled = Handlebars.compile($('#photoReviewDetailTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
      await this.renderReviewContent();
    }

    async renderReviewContent() {
      await this.setData();
      const data = { ...this.option, ...this.review };
      if (data.fileUrls.length === 0) data.fileUrls = ['//rlyfaazj0.toastcdn.net/no_img.png'];
      this.$el.find('#photoReviewDetailContent').render(data);
    }

    async renderComment() {
      const commentData = await this.getReviewComments();
      this.$el.find('#moreComments').remove();
      this.$el.find('#reviewComment').render(commentData);
    }

    bindEvents() {
      this.$el.on('click', this.handlePhotoReviewDetailClick.bind(this));
      this.$el.on('touchstart', this.handleTouchstart.bind(this));
      this.$el.on('touchend', this.handleTouchend.bind(this));
    }

    checkDirection() {
      const startX = this.touchCoordinate.touchstartX;
      const endX = this.touchCoordinate.touchendX;
      const num = startX - endX < 0 ? (startX - endX) * -1 : startX - endX;

      if (num > 60) {
        if (endX < startX) this.handleNextReviewClick();
        if (endX > startX) this.handlePrevReviewClick();
      }
    }

    handleTouchstart(event) {
      this.touchCoordinate.touchstartX = event.changedTouches[0].screenX;
    }

    handleTouchend(event) {
      this.touchCoordinate.touchendX = event.changedTouches[0].screenX;
      this.checkDirection();
    }

    handlePhotoReviewDetailClick({ target }) {
      const $target = $(target);
      const actionType = $target.data('action-type') || $target.parents().data('action-type');
      switch (actionType) {
        case 'moreComments':
          this.showMoreComments($target);
          break;
        case 'showComments':
          this.showComments($target);
          break;
        case 'reviewRecommend':
          this.handleReviewRecommendClick($target);
          break;
        case 'closePopup':
          this.option.hasCloseBtn ? this.close() : this.handleOpenPhotoReviewsClick();
          break;
        case 'prevReview':
          this.handlePrevReviewClick();
          break;
        case 'nextReview':
          this.handleNextReviewClick();
          break;
        default:
          break;
      }
    }

    async postReviewRecommend(request) {
      await shopby.api.display.postProductsProductNoProductReviewsReviewNoRecommend(request);
    }

    async deleteReviewRecommend(request) {
      await shopby.api.display.deleteProductsProductNoProductReviewsReviewNoRecommend(request);
    }

    async changeReviewRecommendStatus(isRecommend) {
      const { productNo, reviewNo } = this.option;
      const request = {
        pathVariable: {
          productNo,
          reviewNo,
        },
      };
      isRecommend ? await this.postReviewRecommend(request) : await this.deleteReviewRecommend(request);
      const { data } = await this.getReview();
      this.$el.find('#recommendCnt').text(data.recommendCnt);
    }

    removeSecondFromYdmt(ydmt) {
      const SECONDS_LENGTH = 3;
      return ydmt.substring(0, ydmt.length - SECONDS_LENGTH);
    }

    generateCommentData(contents, totalCount) {
      const hasMoreCommentsBtn = totalCount - contents.length > 0;
      return {
        hasMoreCommentsBtn,
        contents: contents.map(content => ({
          date: this.removeSecondFromYdmt(content.registerYmdt),
          ...content,
        })),
      };
    }

    async getReviewComments() {
      const { page, contents } = this.reviewComment;
      const { productNo, reviewNo } = this.option;
      const request = {
        pathVariable: {
          productNo,
          reviewNo,
        },
        queryString: {
          size: COMMENT_PAGE_SIZE,
          page,
          hasTotalCount: true,
        },
      };
      const { data } = await shopby.api.display.getProductsProductNoProductReviewsReviewNoComments(request);
      this.reviewComment.contents.push(...data.contents);
      return this.generateCommentData(contents, data.totalCount);
    }

    isCheckedElement($target) {
      return $target.hasClass('on');
    }

    showMoreComments() {
      this.reviewComment.page += 1;
      this.renderComment();
    }

    resetReviewComments() {
      this.reviewComment.page = 1;
      this.reviewComment.contents = [];
    }

    showComments($target) {
      this.$el.find('#reviewComment').toggle();
      $target.toggleClass('on');
      const checked = this.isCheckedElement($target);
      if (!checked) return;
      this.resetReviewComments();
      this.renderComment();
    }

    handleReviewRecommendClick($target) {
      if (!shopby.logined()) {
        shopby.alert({ message: '로그인 후 이용할 수 있습니다.' });
        return;
      }

      const $targetParents = $target.closest('#reviewRecommendParents');
      $targetParents.closest('#reviewRecommendParents').toggleClass('on');
      const isRecommend = this.isCheckedElement($targetParents);
      this.changeReviewRecommendStatus(isRecommend);
    }

    async handleOpenPhotoReviewsClick() {
      shopby.popup('photo-reviews', {
        productNo: this.option.productNo,
      });
      this.close();
    }

    updateCurrentReviewNo(currentReviewIndex) {
      this.reviewsInfo.currentReviewIndex = currentReviewIndex;
      this.option.reviewNo = this.reviewsInfo.reviewNos[this.reviewsInfo.currentReviewIndex];
      this.renderReviewContent();
    }

    async handlePrevReviewClick() {
      const isFirstReview = this.reviewsInfo.currentReviewIndex === 0;
      const isFirstPageNumber = this.option.parameter.queryString.pageNumber === 1;

      if (isFirstReview && isFirstPageNumber) return;
      if (isFirstReview) {
        this.option.parameter.queryString.pageNumber -= 1;
        await this.setPrevAndNextReviewData();
        this.updateCurrentReviewNo(this.reviewsInfo.reviewNos.length - 1);
      } else {
        this.updateCurrentReviewNo((this.reviewsInfo.currentReviewIndex -= 1));
      }
    }

    async handleNextReviewClick() {
      if (this.option.type === 'boards' && this.option.onlyDisplayedReviews !== true) {
        const isLastReview = this.reviewsInfo.currentReviewIndex === this.reviewsInfo.reviewNos.length - 1;
        const isLastPageNumber = this.option.parameter.queryString.pageNumber >= this.reviewsInfo.maxPageNumber;
        if (isLastReview && isLastPageNumber) return;
        if (isLastReview) {
          this.option.parameter.queryString.pageNumber += 1;
          await this.setPrevAndNextReviewData();
          this.updateCurrentReviewNo(0);
        } else {
          this.updateCurrentReviewNo((this.reviewsInfo.currentReviewIndex += 1));
        }
      } else {
        const isLastReview = this.reviewsInfo.maxPageNumber === this.reviewsInfo.currentReviewIndex + 1;
        if (isLastReview) return;
        this.updateCurrentReviewNo((this.reviewsInfo.currentReviewIndex += 1));
      }
    }
  }

  shopby.registerPopupConstructor('photo-review-detail', PhotoReviewDetail);
})();

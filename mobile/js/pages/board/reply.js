$(() => {
  const boardId = shopby.utils.getUrlParam('boardId');
  const boardName = shopby.utils.getUrlParam('boardName');
  const articleNo = Number(shopby.utils.getUrlParam('articleNo'));
  const replyNo = Number(shopby.utils.getUrlParam('replyNo'));
  const registerName = shopby.utils.getUrlParam('register');
  const registerYmdt = shopby.utils.getUrlParam('registerYmdt');

  shopby.board.reply = {
    secreted: false,
    async initiate() {
      this.render(await this.fetchData());
      this.bindEvents();
    },

    render([article, replyDetail]) {
      $('.sub_top').render({ boardName, boardId });
      $('#boardViewPage').render({
        articles: article,
        reply: replyDetail,
        boardId,
      });
    },
    bindEvents() {
      $('#boardViewPage')
        .on('click', '.vis_mode', this.mapAttachments.bind(this))
        .on('click', '.openBoard', this.toggleBoard.bind(this));
    },
    mapAttachments({ currentTarget }) {
      const { attachments } = this.articles;
      const attachImages = attachments.map(({ uploadedFileName, fileName }) => ({
        imageUrl: uploadedFileName,
        fileName,
      }));
      this.openSlideImagesPopup(attachImages, currentTarget);
    },

    openSlideImagesPopup(attachImageList, currentTarget) {
      shopby.popup('slide-images', {
        title: '첨부파일',
        imageObjectList: attachImageList,
        clickedImageIndex: $(currentTarget).index(),
      });
    },
    toggleBoard({ target }) {
      const $btn = $(target.closest('.openBoard') || target);
      const $img = $btn.children('img');
      const $boardContent = $('.boardContent');

      if ($btn.hasClass('up')) {
        $btn.text('본문 열기');
        $btn.removeClass('up');
        $img.removeClass('board-arrow_up');
        $img.addClass('board-arrow_down');
        $boardContent.hide();
      } else {
        $btn.text('본문 닫기');
        $btn.addClass('up');
        $img.addClass('board-arrow_up');
        $img.removeClass('board-arrow_down');
        $boardContent.show();
      }
    },
    async fetchData() {
      try {
        const result = await shopby.utils.allSettled([
          shopby.api.manage.getBoardsBoardNoArticlesArticleNo(this._requestCreator(articleNo)),
          shopby.api.manage.getBoardsBoardNoArticlesArticleNo(this._requestCreator(replyNo)),
        ]);
        return result.map(({ value }) => this._mapResult(value));
      } catch (error) {
        console.error(error);
      }
    },
    _mapResult(value) {
      const code = value.data && value.data.code;
      switch (code) {
        case 'B0010':
          // 비공개로 전환된 답글 클릭 시 상위게시판으로 리다이렉트
          shopby.alert(value.data.message, () => {
            location.href = `/pages/board/view.html?boardId=${boardId}&articleNo=${articleNo}&secreted=${this.secreted}`;
          });
          return;
        case 'B0006':
          // 상위게시글이 비공개로 전환B0006
          this.secreted = true;
          return {
            title: '비밀글 입니다.',
            content: '비밀글로 전환된 글입니다.',
            registerName,
            registerYmdt,
          };
        default:
          return value.data;
      }
    },
    _requestCreator(articleNo) {
      return {
        pathVariable: { boardNo: boardId, articleNo },
        queryString: { password: shopby.localStorage.getItem('SHOPBYPRO_GUEST_SECRET') },
      };
    },
  };
  shopby.start.initiate(shopby.board.reply.initiate.bind(shopby.board.reply));
})();

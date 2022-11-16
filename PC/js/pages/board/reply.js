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
      $('#boardViewPage').render({
        articles: article,
        boardName,
        boardId,
      });
      $('#boardReplyDetail').render(replyDetail);
    },
    bindEvents() {
      $('#boardViewPage')
        .on('click', '.vis_mode', this.mapAttachments.bind(this))
        .on('click', '.btn_board_list', this.onClickBoardBtn.bind(this));
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
    onClickBoardBtn({ target }) {
      const mode = target.closest('.btn_board_list').dataset.mode;
      switch (mode) {
        case 'view':
          location.href = `/pages/board/view.html?boardId=${boardId}&articleNo=${articleNo}&secreted=${this.secreted}`;
          break;
        case 'list':
          location.href = `/pages/board/list.html?boardId=${boardId}`;
          break;
        default:
          break;
      }
    },
    async fetchData() {
      try {
        const result = await shopby.utils.allSettled([
          shopby.api.manage.getBoardsBoardNoArticlesArticleNo(this._requestCreator(articleNo)),
          shopby.api.manage.getBoardsBoardNoArticlesArticleNo(this._requestCreator(replyNo)),
        ]);
        return result.map(({ value }) => {
          console.log(value);
          if (value.data && value.data.code && value.data.code === 'B0006') {
            // 게시글이 비공개로 전환된 경우
            this.secreted = true;
            return {
              title: '비밀글 입니다.',
              content: '비밀글로 전환된 글입니다.',
              registerName,
              registerYmdt,
            };
          }
          if (value.data && value.data.code && value.data.code === 'B0010') {
            // 비공개 답글 접근 시
            shopby.alert(value.data.message, () => {
              location.href = `/pages/board/view.html?boardId=${boardId}&articleNo=${articleNo}`;
            });
            return;
          }
          return value.data;
        });
      } catch (error) {
        console.error(error);
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

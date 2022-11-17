/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.6.29
 */
$(() => {
  const boardId = shopby.utils.getUrlParam('boardId');
  const articleNo = shopby.utils.getUrlParam('articleNo');
  shopby.board.view = {
    page: shopby.pagination,
    boardInfo: null,
    articles: null,
    memberName: null,
    repliesInfo: null,

    initiate() {
      window.onpopstate = this.goToListPage.bind(this);
      this.page = new shopby.pagination(this._getBoardReplies.bind(this), '#pagination', 10);

      Promise.all([
        this._fetchBoardConfig(),
        this._fetchBoardViewData(),
        this._getBoardReplies(this.getCurrentPageNumber()),
      ]).then(() => {
        this.render();
        this.bindEvents();
      });
    },

    render() {
      $('#boardViewPage').render({
        articles: this.articles,
        boardName: this.boardInfo.name,
        boardId: this.boardInfo.boardId,
      });
      $('#replies').render({
        isReplyExposure: this.boardInfo.replyUsed && this.repliesInfo.items.length,
        repliesInfo: this.repliesInfo.items,
      });
    },

    bindEvents() {
      $('#boardViewPage')
        .on('click', '.vis_mode', this.mapAttachments.bind(this))
        .on('click', '#articleDel', this.deleteArticle.bind(this))
        .on('click', '#articleEdit', this.modifyArticle.bind(this));
      $('#replies').on('click', '.board_tit', this.goToReplyDetailPage.bind(this));
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

    _fetchBoardConfig() {
      const thisBoardId = boardId;
      const { boardConfigs } = shopby.cache.getBoardsConfig();
      this.boardInfo = boardConfigs.find(({ boardId }) => boardId === thisBoardId);
    },

    goToListPage() {
      history.pushState(null, null, `/pages/board/list.html?boardId=${boardId}`);
      location.reload();
    },

    getCurrentPageNumber() {
      return this.page.pageNumber;
    },

    async _getBoardReplies(pageNumber) {
      const request = {
        pathVariable: { boardNo: boardId, articleNo },
        queryString: {
          page: pageNumber || this.page.pageNumber,
          pageSize: this.page.pageSize,
        },
      };
      const { data: repliesInfo } = await shopby.api.manage.getBoardsBoardNoArticlesArticleNoReplies(request);
      this.repliesInfo = repliesInfo;

      const today = dayjs();
      repliesInfo &&
        this._renderReplies(
          repliesInfo.items.map((item, idx) => ({
            ...item,
            displayOrder: repliesInfo.totalCount - ((this.page.pageNumber - 1) * this.page.pageSize + idx),
            new: today.diff(item.registerYmdt, 'day') <= 7,
            hot: null,
            registerYmd: item.registerYmdt.split(' ')[0],
            mustHidden: item.secreted,
          })),
        );

      shopby.utils.pushState({
        boardId,
        articleNo,
        page: this.page.pageNumber,
      });
    },

    _renderReplies(replyArticles) {
      const isReplyExposure = this.boardInfo.replyUsed && this.repliesInfo.items.length;
      if (isReplyExposure) {
        this.page.render(this.repliesInfo.totalCount, this.page.pageNumber);
        $('#replyBox').render({
          replyArticles,
        });
      }
    },

    async _fetchBoardViewData() {
      const request = {
        pathVariable: { boardNo: boardId, articleNo },
        queryString: { password: shopby.localStorage.getItem('SHOPBYPRO_GUEST_SECRET') },
      };
      const { data: articles } = await shopby.api.manage.getBoardsBoardNoArticlesArticleNo(request);

      if (articles && articles.code === 'B0006') {
        shopby.alert(articles.message, () => {
          location.href = `/pages/board/list.html?boardId=${boardId}`;
        });
        return;
      }
      this.articles = articles;
    },

    deleteArticle() {
      if (shopby.logined()) {
        this._openMemberDeletePopup();
      } else {
        this._openGuestDeletePopup();
      }
    },

    _openMemberDeletePopup() {
      shopby.confirm(
        {
          message: '게시물이 삭제하시겠습니까?',
          boardId,
          articleNo,
        },
        callback => this.deleteArticleCallback(callback),
      );
    },

    _openGuestDeletePopup() {
      shopby.popup(
        'check-article-password',
        {
          message: '게시물을 삭제하시겠습니까? <br> 비밀번호를 입력해주시기 바랍니다.',
          boardId,
          articleNo,
        },
        callback => this.deleteArticleCallback(callback),
      );
    },

    async deleteArticleCallback(callback) {
      if (callback.state === 'ok') {
        const request = {
          pathVariable: { boardNo: boardId, articleNo },
          requestBody: { password: callback.password },
        };
        await shopby.api.manage.deleteBoardsBoardNoArticlesArticleNo(request);
        location.href = '/pages/board/list.html?boardId=' + boardId;
      }
    },

    modifyArticle() {
      if (shopby.logined()) {
        this._openMemberModifyPopup();
      } else {
        this._openGuestModifyPopup();
      }
    },

    async _openMemberModifyPopup() {
      await this._getProfile();
      shopby.confirm({ message: '게시물을 수정하시겠습니까?' }, callback => {
        if (callback.state === 'ok') {
          shopby.popup(
            'board-article',
            {
              boardInfo: this.boardInfo,
              writer: this.memberName,
              articles: this.articles,
            },
            callback => {
              if (callback.state === 'ok') {
                this._fetchBoardViewData().then(() => this.render());
              }
            },
          );
        }
      });
    },

    _openGuestModifyPopup() {
      shopby.popup(
        'check-article-password',
        {
          message: '게시물을 수정하시겠습니까? <br> 비밀번호를 입력해주시기 바랍니다.',
          boardId,
          articleNo,
        },
        callback => {
          if (callback.state === 'ok') {
            shopby.popup(
              'board-article',
              {
                boardInfo: this.boardInfo,
                writer: this.articles.registerName,
                articles: this.articles,
              },
              callback => {
                if (callback.state === 'ok') {
                  this._fetchBoardViewData().then(() => this.render());
                }
              },
            );
          }
        },
      );
    },

    async _getProfile() {
      if (shopby.logined()) {
        const { data: profileInfo } = await shopby.api.member.getProfile();
        this.memberName = profileInfo.memberName;
      }
    },

    goToReplyDetailPage({ target }) {
      const data = target.closest('tr').dataset;
      const replyNo = Number(data.articleNo);
      if (data.mustHidden === 'true') {
        alert('비밀글 입니다.');
        return;
      }
      location.href = `/pages/board/reply.html?boardId=${boardId}&boardName=${this.boardInfo.name}&register=${this.articles.registerName}&registerYmdt=${this.articles.registerYmdt}&articleNo=${articleNo}&replyNo=${replyNo}`;
    },
  };

  shopby.start.initiate(shopby.board.view.initiate.bind(shopby.board.view));
});

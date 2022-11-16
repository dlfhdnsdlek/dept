/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.6.24
 */

$(() => {
  Handlebars.registerHelper('IsWriter', (registerType, registerNo, modifierNo, title) => {
    const userInfo = shopby.logined() ? shopby.board.list.userInfo : null;
    const isRegisteredByMe = userInfo && userInfo.memberNo === registerNo;
    const isModifiedByMe = userInfo && userInfo.memberNo === modifierNo;
    const isMemberRegister = registerType === 'MEMBER';
    const isModified = modifierNo !== null;
    const secretMessageCondition =
      !isMemberRegister ||
      (isMemberRegister && !isModified && !isRegisteredByMe) ||
      (isMemberRegister && isModified && !isModifiedByMe);

    return secretMessageCondition ? '비밀글입니다.' : title;
  });
  const boardId = shopby.utils.getUrlParam('boardId');

  shopby.board.list = {
    page: shopby.pagination,
    userInfo: null,
    boardInfo: null,
    searchType: 'ALL',
    keyword: '',
    backPageNumber: null,

    initiate() {
      window.onpopstate = this.onPopState.bind(this);
      this.page = new shopby.pagination(this.onPagination.bind(this), '#pagination', 10);
      Promise.all([this._fetchBoardConfig(), this._getBoardList(this.getCurrentPageNumber()), this._getProfile()]).then(
        () => {
          this.initRender();
          this.bindEvents();
        },
      );
    },

    initRender() {
      $('#boardTitle').render({ boardName: this.boardInfo.name });
    },

    async _getProfile() {
      if (shopby.logined()) {
        const { data: profileInfo } = await shopby.api.member.getProfile();
        this.userInfo = profileInfo;
      }
    },

    bindEvents() {
      $('#articlesPage')
        .on('click', '.board_tit', this.getArticleInfo.bind(this))
        .on('click', '#btnArticleWrite', this.openArticleRegister.bind(this));
      $('#btnArticleSearch').on('click', this.search.bind(this)).enterKeyup('#articleKeyword');
    },

    onPopState() {
      this.searchType = shopby.utils.getUrlParam('searchType');
      this.keyword = shopby.utils.getUrlParam('keyword');
      this.backPageNumber = shopby.utils.getUrlParam('pageNumber');
      this._getBoardList();
    },

    onPagination() {
      this.backPageNumber = null;
      this._getBoardList();
    },

    getArticleInfo(event) {
      const $target = $(event.currentTarget);
      const setArticleData = value => $target.closest('tr').data(value);
      const articleInfo = {
        boardId,
        registerType: setArticleData('register-type'),
        registerNo: setArticleData('register-no'),
        modifierNo: setArticleData('modifier-no'),
        isSecret: setArticleData('secret'),
        articleNo: setArticleData('article-no'),
      };
      this.setCurrentPage();
      this._checkSecretArticle(articleInfo, this.userInfo && this.userInfo.memberNo ? this.userInfo.memberNo : 0);
    },

    setCurrentPage() {
      localStorage.setItem('pageNumber', this.page.pageNumber);
    },

    _checkSecretArticle(articleInfo, memberNo) {
      if (!articleInfo.isSecret) {
        this._goArticlePage(articleInfo);
      } else {
        if (articleInfo.registerType === 'MEMBER') {
          shopby.logined()
            ? this._isWrittenByMe(articleInfo, memberNo)
            : shopby.alert({ message: '비밀글 조회 권한이 없습니다.' });
        } else if (articleInfo.registerType === 'GUEST') {
          this._openPasswordPopup(articleInfo);
        } else if (articleInfo.registerType === 'ADMIN') {
          articleInfo.isSecret && shopby.alert({ message: '비밀글 조회 권한이 없습니다.' });
        }
      }
    },

    _isWrittenByMe(articleInfo, memberNo) {
      const isRegisteredByMe = articleInfo.registerNo === memberNo;
      const isModifiedByMe = articleInfo.modifierNo === memberNo;
      const isModified = articleInfo.modifierNo !== '';
      const ableShow = (!isModified && isRegisteredByMe) || (isModified && isModifiedByMe);
      if (!ableShow) {
        shopby.alert({ message: '비밀글 조회 권한이 없습니다.' });
      } else {
        this._goArticlePage(articleInfo);
      }
    },

    _goArticlePage(articleInfo) {
      location.href = `/pages/board/view.html?boardId=${articleInfo.boardId}&articleNo=${articleInfo.articleNo}&secreted=${articleInfo.isSecret}`;
    },

    _openPasswordPopup(articleInfo) {
      shopby.popup(
        'check-article-password',
        {
          message: '글 작성시 설정한 비밀번호를 입력해주세요.',
          boardId: articleInfo.boardId,
          articleNo: articleInfo.articleNo,
          guestArticle: true,
        },
        callback => {
          if (callback.state === 'ok') {
            location.href = `/pages/board/view.html?boardId=${articleInfo.boardId}&articleNo=${articleInfo.articleNo}&secreted=${articleInfo.isSecret}`;
          }
        },
      );
    },

    _fetchBoardConfig() {
      const thisBoardId = boardId;
      const { boardConfigs } = shopby.cache.getBoardsConfig();
      this.boardInfo = boardConfigs.find(({ boardId }) => boardId === thisBoardId);
    },

    search() {
      this.searchType = $('select[name="searchType"] option:selected').val();
      this.keyword = $('.board_search_box input[name="keyword"]').val();
      this.backPageNumber = null;
      this.page.pageNumber = 1;
      this._getBoardList();
    },

    async _getBoardList(pageNumber) {
      const request = {
        pathVariable: { boardNo: boardId },
        queryString: {
          hasTotalCount: true,
          searchType: this.searchType,
          keyword: this.keyword,
          withReplied: false,
          pageNumber: this.backPageNumber ? this.backPageNumber : pageNumber || this.page.pageNumber,
          pageSize: this.page.pageSize,
        },
      };
      const { data: boardList } = await shopby.api.manage.getBoardsBoardNoArticles(request);
      boardList &&
        this._renderBoardList(
          boardList.items.map((item, idx) => ({
            ...item,
            displayOrder: this.displayOrderCreator(request.queryString.pageNumber, idx),
          })),
          boardList.totalCount,
          request.queryString.pageNumber,
        );
      if (this.backPageNumber) return;
      shopby.utils.pushState({
        boardId,
        pageNumber: this.page.pageNumber,
        searchType: this.searchType,
        keyword: this.keyword,
      });
    },
    displayOrderCreator(pageNumber, idx) {
      return pageNumber * this.page.pageSize + idx + 1 - this.page.pageSize;
    },
    getCurrentPageNumber() {
      const localstoragePageNumber = localStorage.getItem('pageNumber');
      localStorage.removeItem('pageNumber');
      return localstoragePageNumber ? Number(localstoragePageNumber) : this.page.pageNumber;
    },
    _renderBoardList(articles, totalCount, pageNumber) {
      this.page.render(totalCount, pageNumber);

      $('#boardArticles').render({
        articles,
        boardId,
        pageNumber: this.backPageNumber ? this.backPageNumber : this.page.pageNumber,
        pageSize: this.page.pageSize,
      });
      $('#contents').addClass('visible');
    },

    _ableArticleRegister() {
      const memberCanNotWrite = !this.boardInfo.memberPostingUsed && shopby.logined();
      if (memberCanNotWrite) {
        throw new Error('비회원 전용 게시판입니다.');
      }
      const guestCanNotWrite = !this.boardInfo.guestPostingUsed && !shopby.logined();
      if (guestCanNotWrite) {
        throw new Error('로그인하셔야 본 서비스를 이용하실 수 있습니다.');
      }
    },
    openArticleRegister() {
      try {
        this._ableArticleRegister();
        const writer = shopby.logined() ? this.userInfo.memberName : null;
        shopby.popup('board-article', { boardInfo: this.boardInfo, writer }, callback => {
          if (callback.state === 'ok') {
            this._getBoardList();
          }
        });
      } catch (e) {
        shopby.alert(e.message);
      }
    },
  };

  shopby.start.initiate(shopby.board.list.initiate.bind(shopby.board.list));
});

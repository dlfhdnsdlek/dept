/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.26
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
    keyword: shopby.utils.getUrlParam('keyword'),
    initPageSize: 20,
    articles: null,
    btnWriteUsed: null,
    initiate() {
      window.onpopstate = this.onPopState.bind(this);
      this.page = new shopby.readMore(this.onReadMore.bind(this), '#boardMoreButton');
      Promise.all([
        this._fetchBoardConfig(),
        this._getBoardList(this.initPageSize, 1, this.rangeCreator()),
        this._getProfile(),
        this._setBtnWriteUsed(),
      ]).then(() => {
        this._renderBoardList(this.articles.items, this.articles.totalCount);
        this.initRender();
        this.bindEvents();
      });
      $('#articlesPage').removeClass('invisible').addClass('visible');
    },

    initRender() {
      $('.board_name').render({ boardName: this.boardInfo.name });
      $('#btnWriteBox').render({ btnWriteUsed: this.btnWriteUsed });
    },

    async _getProfile() {
      if (shopby.logined()) {
        const { data: profileInfo } = await shopby.api.member.getProfile();
        this.userInfo = profileInfo;
      }
    },

    bindEvents() {
      $('#articlesPage')
        .on('click', '.notice_title', this.getArticleInfo.bind(this))
        .on('click', '#btnArticleWrite', this.openArticleRegister.bind(this));
      $('#btnArticleSearch').on('click', this.search.bind(this)).enterKeyup('#articleKeyword');
    },

    async onPopState() {
      this.searchType = shopby.utils.getUrlParam('searchType');
      this.keyword = shopby.utils.getUrlParam('keyword');
      await this._getBoardList(this.initPageSize, 1);
      this._renderBoardList(this.articles.items, this.articles.totalCount);
    },

    async onReadMore(pageNumber = this.page.pageNumber) {
      this.page.pageNumber = this.pageNumberCreator(pageNumber);
      const boardList = await this._getBoardList(this.page.pageSize, this.page.pageNumber);
      this._appendArticles();
      return boardList;
    },

    _appendArticles() {
      this.page.render(this.articles.totalCount);
      if (this.articles.items.length === 0) return;

      const compiled = Handlebars.compile($('#articlesTemplate').html());
      const appendHtml = $(compiled({ articles: this.articles.items })).find('li');
      $('#boardArticles').append(appendHtml);
    },

    scrollTo() {
      const offset = localStorage.getItem('offset');
      if (!offset) return;
      $('body, html').animate({ scrollTop: Number(offset) }, 200);
      localStorage.removeItem('offset');
    },
    setOffset(boardItem) {
      localStorage.setItem('offset', boardItem.offset().top);
    },
    getArticleInfo(event) {
      const $target = $(event.currentTarget);
      const $li = $target.closest('li');
      const setArticleData = value => $li.data(value);
      const articleInfo = {
        boardId,
        registerType: setArticleData('register-type'),
        registerNo: setArticleData('register-no'),
        modifierNo: setArticleData('modifier-no'),
        isSecret: setArticleData('secret'),
        articleNo: setArticleData('article-no'),
      };

      this.setOffset($li);
      this._checkSecretArticle(articleInfo, this.userInfo && this.userInfo.memberNo ? this.userInfo.memberNo : 0);
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
      localStorage.setItem('pageNumber', this.page.pageNumber);
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

    async search() {
      this.keyword = $('.search_input input[name="keyword"]').val();
      await this._getBoardList(this.initPageSize, 1);
      this._renderBoardList(this.articles.items, this.articles.totalCount);
      shopby.utils.pushState({
        boardId,
        searchType: this.searchType,
        keyword: this.keyword,
      });
    },
    requestCreator(pageSize, pageNumber) {
      return {
        pathVariable: { boardNo: boardId },
        queryString: {
          hasTotalCount: true,
          searchType: this.searchType,
          keyword: this.keyword,
          withReplied: false,
          pageNumber,
          pageSize,
        },
      };
    },
    async _getBoardList(pageSize, pageNumber = this.page.pageNumber, range) {
      const request = this.requestCreator(pageSize, pageNumber);
      const { data: boardList } = await shopby.api.manage.getBoardsBoardNoArticles(request);
      this.articles = boardList;
      range >= 1 && (await this.fetchMoreArticles(range, pageNumber + 1, boardList));
      return boardList;
    },

    async fetchMoreArticles(length, initPageNumber, { totalCount, items }) {
      initPageNumber = this.pageNumberCreator(initPageNumber);
      const promises = Array.from({ length }, (_, idx) => initPageNumber + idx).map(async pageNumber => {
        const result = await this.onReadMore(pageNumber);
        return result.items;
      });
      await Promise.all(promises).then(res => {
        this.articles = {
          totalCount,
          items: items.concat(res.flatMap(r => r)),
        };

        this._appendArticles();
        this.scrollTo();
      });
    },

    _renderBoardList(articles, totalCount) {
      this.page.render(totalCount);

      $('#boardArticles').render({ articles });
      $('#contents').addClass('visible');
    },

    _setBtnWriteUsed() {
      const canWrite = this.boardInfo.guestPostingUsed || this.boardInfo.memberPostingUsed;
      this.btnWriteUsed = canWrite;
    },

    _ableArticleRegister() {
      const memberCanNotWrite = !this.boardInfo.memberPostingUsed && shopby.logined();
      if (memberCanNotWrite) {
        throw new Error('비회원 전용 게시판입니다.');
      }
      const guestCanNotWrite = !this.boardInfo.guestPostingUsed && !shopby.logined();
      if (guestCanNotWrite) {
        if (confirm('로그인하셔야 본 서비스를 이용하실 수 있습니다.')) {
          shopby.goLogin();
        }
        return false;
      }
      return true;
    },
    openArticleRegister() {
      try {
        if (this._ableArticleRegister()) {
          const writer = shopby.logined() ? this.userInfo.memberName : null;
          shopby.popup('board-article', { boardInfo: this.boardInfo, writer }, callback => {
            if (callback.state === 'ok') {
              this._getBoardList(this.initPageSize, 1);
            }
          });
        }
      } catch (e) {
        shopby.alert(e.message);
      }
    },
    get defaultPageSize() {
      return this.initPageSize / 4;
    },
    rangeCreator() {
      const localPageNumber = localStorage.getItem('pageNumber');
      localStorage.removeItem('pageNumber');
      return localPageNumber ? Number(localPageNumber) - this.defaultPageSize : 0;
    },
    pageNumberCreator(pageNumber) {
      return pageNumber === 2 ? this.defaultPageSize + pageNumber - 1 : pageNumber;
    },
  };

  shopby.start.initiate(shopby.board.list.initiate.bind(shopby.board.list));
});

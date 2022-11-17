/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.6
 */

(() => {
  class BoardArticle {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#addBoardArticlePopupTemplate').html());
      this.$el = $(compiled(option));
      this.option = option;
      this.callback = callback;
      this.attachedImages = [];
      this.originData = null;
      $parent.append(this.$el);
      this.render($parent, option);
      this.bindEvents();
    }

    get articleData() {
      return {
        password: $('input[name="password"]').val(),
        title: $('input[name="title"]').val(),
        content: $('textarea[name="content"]').val(),
        guestName: !shopby.logined() ? $('input[name="writerName"]').val() : '',
        images: this.attachedImages.map(image => ({
          originalFileName: image.originName,
          uploadedFileName: image.imageUrl,
        })),
        isGuestTermsAgree: $('input[name="private"]:checkbox').is(':checked'),
        secreted: $('input[name="secreted"]').is(':checked'),
      };
    }

    async render($parent, option) {
      await this._getGuestTerms();
      if (option.articles) {
        this._fetchAttachImages(option.articles);
        this.renderImages(this.attachedImages);
        this.originData = this.articleData;
      }
      this._checkAttachmentConfig(option.articles);
    }

    _checkAttachmentConfig(isOriginData) {
      const { boardInfo } = this.option;
      if (boardInfo.attachmentUsed) return;
      if (!isOriginData) {
        $('#attachmentBox').remove();
      } else {
        $('.file_upload_sec').remove();
      }
    }

    bindEvents() {
      this.$el
        .on('paste input', 'textarea[name="content"], input[type="text"]', this.onInputText)
        .on('change', 'input[type="file"]', this.openAttachment.bind(this))
        .on('click', '#deleteAttachImage', this.deleteAttachment.bind(this))
        .on('click', '#btnWriteArticle', this.writeArticle.bind(this))
        .on('click', '.ly_close,.btn_cancel', this.closeButton.bind(this));
    }

    async _getGuestTerms() {
      if (shopby.logined()) return;
      const { data: terms } = await shopby.api.manage.getTerms({
        queryString: {
          termsTypes: 'PI_COLLECTION_AND_USE_FOR_GUEST_ON_ARTICLE',
        },
      });
      const { pi_collection_and_use_for_guest_on_article: guestArticleTerms } = terms;
      if (guestArticleTerms.used) {
        $('#guestArticleTerms').html(guestArticleTerms.contents);
      }
    }

    _fetchAttachImages(articles) {
      const noData = !articles.attachments || articles.attachments.length === 0;
      this.attachedImages = noData
        ? []
        : articles.attachments.map(articleAttachment => ({
            imageUrl: articleAttachment.uploadedFileName,
            originName: articleAttachment.fileName,
          }));
    }

    onInputText({ target }) {
      const pattern = shopby.regex.noCommonSpecial;
      const { value } = target;
      const valueLength = this.value.length;
      const maxLength = this.getAttribute('maxlength');

      if (value.match(pattern)) {
        $(target).val(value.replace(pattern, ''));
      }
      $(target).next().text(`${valueLength}/${maxLength}`);
    }

    openAttachment(event) {
      const uploadImageCallback = data => {
        this.attachedImages.push(data);
        this.renderImages(this.attachedImages);
      };
      shopby.helper.attachments.onChangeAttachments(event, uploadImageCallback, this.attachedImages.length);
    }

    deleteAttachment({ target }) {
      shopby.confirm({ message: '첨부파일을 삭제하시겠습니까?' }, callback => {
        if (callback.state === 'ok') {
          const deleteImageId = $(target).closest('li').data('image-id');
          this.attachedImages.splice(deleteImageId, 1);
          this.renderImages(this.attachedImages);
        }
      });
    }

    writeArticle() {
      const articleData = this.articleData;
      try {
        this._checkValidation(articleData);
        if (this.originData) {
          this.modifyArticle(articleData);
        } else {
          this.addArticle(articleData);
        }
      } catch (e) {
        shopby.alert(e.message);
      }
    }

    closeButton() {
      const isNotChanged = !this.originData || shopby.utils.isEqual(this.originData, this.articleData);
      if (isNotChanged) {
        this.$el.remove();
      } else {
        shopby.confirm({ message: '변경된 정보를 저장하지 않고 이동하시겠습니까?' }, callback => {
          if (callback.state === 'close') return;
          this.$el.remove();
        });
      }
    }

    async addArticle(articleData) {
      await this._addArticleApi(articleData);
      shopby.alert('게시물이 등록되었습니다.', () => {
        this.callback({ state: 'ok' });
        this.$el.remove();
      });
    }

    async _addArticleApi(articleData) {
      const { boardId } = this.option.boardInfo;
      const request = {
        pathVariable: { boardNo: boardId },
        requestBody: {
          articleTitle: articleData.title,
          articleContent: articleData.content,
          password: articleData.password,
          secreted: articleData.secreted,
          images: articleData.images,
          guestName: articleData.guestName,
        },
      };
      await shopby.api.manage.postBoardsBoardNoArticles(request);
    }

    async modifyArticle(articleData) {
      await this._modifyArticleApi(articleData);
      shopby.alert('게시물이 수정되었습니다.', () => {
        this.callback({ state: 'ok' });
        this.$el.remove();
      });
    }

    async _modifyArticleApi(articleData) {
      const { boardId } = this.option.boardInfo;
      const { articleNo } = this.option.articles;
      const request = {
        pathVariable: { boardNo: boardId, articleNo },
        requestBody: {
          articleTitle: articleData.title,
          articleContent: articleData.content,
          password: articleData.password,
          secreted: articleData.secreted,
          images: articleData.images,
          guestName: articleData.guestName,
        },
      };
      await shopby.api.manage.putBoardsBoardNoArticlesArticleNo(request);
    }

    _checkValidation(articleData) {
      if (!articleData.title) {
        throw new Error('제목을 입력해주세요.');
      }
      if (!articleData.content) {
        throw new Error('내용을 입력해주세요.');
      }
      if (shopby.logined()) return;

      if (!articleData.password || articleData.password.length < 4) {
        throw new Error('비밀번호는 영문/숫자/특수문자 제한 없이 4~20자로 입력하셔야 합니다.');
      } else if (!articleData.guestName) {
        throw new Error('작성자를 입력해주세요.');
      } else if (!articleData.isGuestTermsAgree) {
        throw new Error('비회원 글작성에 대한 개인정보 수집 이용에 동의해주세요');
      }
    }

    renderImages(attachedImages) {
      $('#attachImages').render({
        attachedImages,
      });
    }
  }

  shopby.registerPopupConstructor('board-article', BoardArticle);
})();

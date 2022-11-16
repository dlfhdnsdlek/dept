/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.29
 */

(() => {
  class CheckArticlePassword {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;

      this.render($parent, option);
      this.bindEvents();
    }
    render($parent, option) {
      option.title = '비밀번호 인증';

      const compiled = Handlebars.compile($('#checkArticlePasswordPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
    }

    bindEvents() {
      this.$el.on('click', '#btnConfirm', this.checkPassword.bind(this)).on('keyup', 'input[name="password"]', key => {
        if (key.code === 'Enter') {
          this.checkPassword();
        }
      });
    }

    checkPassword() {
      const password = $('input[name="password"]').val();

      try {
        this._validationPassword(password);
        this._confirmPassword(password).then(() => {
          if (this.option.guestArticle) {
            this.callback({ state: 'ok' });
            shopby.localStorage.setItemWithExpire('SHOPBYPRO_GUEST_SECRET', password, 60);
          } else {
            this.callback({ state: 'ok', password: password });
          }
          this.$el.remove();
        });
      } catch (e) {
        shopby.alert(e.message);
      }
    }

    _validationPassword(password) {
      if (password === '') {
        throw new Error('비밀번호를 입력해주시기 바랍니다.');
      }
    }

    async _confirmPassword(password) {
      const request = {
        pathVariable: { boardNo: this.option.boardId, articleNo: this.option.articleNo },
        requestBody: { password: password },
      };
      await shopby.api.manage.putBoardsBoardNoArticlesArticleNoEditable(request);
    }
  }

  shopby.registerPopupConstructor('check-article-password', CheckArticlePassword);
})();

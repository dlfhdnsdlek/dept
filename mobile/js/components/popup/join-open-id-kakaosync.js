(() => {
  class JoinOpenIdKakaoSync {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;

      this.render($parent);
      this.bindEvents();
    }

    render($parent) {
      const compiled = Handlebars.compile($('#joinKakaoSyncPopupTemplate').html());
      this.$el = $(compiled(this.option));
      $parent.append(this.$el);
    }

    bindEvents() {
      this.$el.on('click', '#closeLayer', this._closeButtonEvent.bind(this));
      document.getElementById('synchronizeLogin').addEventListener('click', () => {
        this.synchronizeLogin(this.getFormEl());
      });
    }

    getFormEl() {
      const id = document.getElementById('existingId').value;
      const password = document.getElementById('existingPw').value;
      const loginInfo = { id, password };
      return loginInfo;
    }

    async _profileSync(loginInfo) {
      try {
        const { data } = await shopby.api.member.postProfileSynchronize({
          requestBody: loginInfo,
        });
        shopby.cache.removeAccessToken();
        shopby.cache.setAccessToken(data.accessToken, data.expireIn);
        shopby.alert('간편로그인 회원으로 전환되었습니다.', () => {
          this.close({ state: 'login' });
        });
      } catch (error) {
        if (error.code === 'M0020') {
          shopby.alert(
            '입력하신 아이디는 휴면상태의 계정입니다.\n기존 회원으로 로그인 후 휴면상태를 해지해 주세요.',
            () => {
              this.close({ state: 'cancel' });
            },
          );
        } else {
          shopby.alert('아이디 또는 비밀번호를 다시 한번 확인해주시기 바랍니다.');
        }
      }
    }

    synchronizeLogin(loginInfo) {
      if (!this.validationCheck(loginInfo)) return;

      shopby.confirm(
        { message: '간편로그인으로 회원을 전환하시겠습니까?\n전환 시 일반회원으로 로그인이 불가합니다.' },
        e => {
          if (e.state !== 'ok') return;
          this._profileSync(loginInfo);
        },
      );
    }

    validationCheck(loginInfo) {
      if (!loginInfo.id) {
        shopby.alert('아이디를 입력해주세요.');
        return false;
      } else if (!loginInfo.password) {
        shopby.alert('비밀번호를 입력해주세요.');
        return false;
      }
      return true;
    }

    _closeButtonEvent(event) {
      const actionType = $(event.currentTarget).data('action-type') || 'negative';
      if (actionType === 'post') {
        this.close({ state: 'post' });
      } else {
        this.close({ state: 'cancel' });
      }
    }
  }

  shopby.registerPopupConstructor('join-open-id-kakaosync', JoinOpenIdKakaoSync);
})();

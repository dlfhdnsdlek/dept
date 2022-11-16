$(() => {
  shopby.member.auth = {
    async initiate() {
      await this.processAuthCallback();
    },
    async processAuthCallback() {
      const redirectUri = encodeURI(`${location.origin}/callback/auth-callback.html`);
      const code = shopby.utils.getUrlParam('code');
      const redirectedToken = shopby.localStorage.getItem(shopby.cache.key.member.oauthToken);
      const redirectedProvider = shopby.localStorage.getItem(shopby.cache.key.member.oauthProvider);

      if (!code || !redirectedToken || !redirectedProvider) {
        shopby.alert({ message: '인증 정보가 만료되었습니다.' });
        shopby.goHome();
        return;
      }

      try {
        const { data: openIdTokenResult } = await shopby.api.auth.getOauthOpenId({
          queryString: {
            code,
            redirectUri,
            provider: redirectedProvider,
            state: redirectedToken,
            platformType: shopby.platform,
          },
        });
        shopby.cache.setAccessToken(openIdTokenResult.accessToken, openIdTokenResult.expireIn);

        const { data: userInfo } = await shopby.api.member.getProfile();

        // isOauthWithdrawalProcess : 회원탈퇴인지 아닌지에 대한 식별자
        const isOauthWithdrawalProcess = shopby.localStorage.getItemWithExpire(
          shopby.cache.key.member.isOauthWithdrawalProcess,
        );
        if (isOauthWithdrawalProcess) {
          const { oauthIdNo } = shopby.sessionStorage.getItemWithExpire(shopby.cache.dataKey.profile);
          if (userInfo.oauthIdNo !== oauthIdNo) {
            shopby.localStorage.setItem(shopby.cache.key.member.isOauthWithdrawalCompareInfo, true);
          }
          window.location.replace('/pages/my/withdrawal.html');
          return;
        }
        shopby.helper.login._openIdAuthCallback(userInfo);
      } catch (error) {
        console.error(error);
        if (error.code === 'M0020') {
          //휴면회원
          shopby.helper.login._openIdAuthCallback(null, true);
        } else {
          shopby.cache.removeAccessToken();
          shopby.helper.login._openIdAuthCallback();
        }
      }
    },
  };

  shopby.start.initiate(shopby.member.auth.initiate.bind(shopby.member.auth));
});

$(() => {
  const { shopOauthCallback } = window.opener;

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
        const { data: profileResult } = await shopby.api.member.getProfile();
        shopOauthCallback && shopOauthCallback(profileResult);
      } catch (error) {
        console.error(error);
        if (shopOauthCallback) {
          if (error.code === 'M0020') {
            shopOauthCallback(null, true);
          } else {
            shopby.cache.removeAccessToken();
            shopOauthCallback();
          }
        }
      }
      window.close();
    },
  };

  shopby.start.initiate(shopby.member.auth.initiate.bind(shopby.member.auth));
});

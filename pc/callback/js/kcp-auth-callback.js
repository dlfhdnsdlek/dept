/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  const { shopKcpCallback } = window.opener;

  shopby.member.kcpAuth = {
    async initiate() {
      await this.processAuthCallback();
    },
    async processAuthCallback() {
      const key = shopby.utils.getUrlParam('key');

      try {
        if (key) {
          const { data } = await shopby.api.auth.getKcpIdVerificationResponse({ queryString: { key } });
          const kcpResult = JSON.parse(data);
          if (shopby.logined()) {
            await shopby.api.auth.postKcpAgeVerification({ queryString: { key } });
          }
          shopKcpCallback && (await shopKcpCallback(kcpResult, key));

          window.close();
        } else {
          const { data: result } = await shopby.api.auth.getKcpIdVerificationForm({
            queryString: {
              returnUrl: location.origin + '/callback/kcp-auth-callback.html',
            },
          });
          const holder = document.querySelector('#form-holder');
          holder.insertAdjacentHTML('afterbegin', result);
          const form = holder.firstChild;
          form.submit();
        }
      } catch (error) {
        this.runAuthFail(error.message);
      }
    },
    runAuthFail(message) {
      shopKcpCallback && shopKcpCallback(null);
      shopby.alert(message, () => window.close());
      console.error(message);
    },
  };

  shopby.start.initiate(shopby.member.kcpAuth.initiate.bind(shopby.member.kcpAuth));
});

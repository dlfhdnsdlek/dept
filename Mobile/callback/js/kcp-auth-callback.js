/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  const returnUrl = shopby.utils.getUrlParam('returnUrl');
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
          shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, kcpResult);
          const keyParam = returnUrl.includes('?') ? `&key=${key}` : `?key=${key}`;
          window.location.href = returnUrl + keyParam;
        } else {
          const { data: result } = await shopby.api.auth.getKcpIdVerificationForm({
            queryString: {
              returnUrl: `${location.origin}/callback/kcp-auth-callback.html?returnUrl=${returnUrl}`,
            },
          });
          const holder = document.getElementById('form-holder');
          holder.innerHTML = result
          const auth_form = holder.firstChild;

          // KCP 팝업 우회 코드
          self.name = 'auth_popup'
          auth_form.action = "https://cert.kcp.co.kr/kcp_cert/cert_view.jsp"
          auth_form.name = 'auth_form'
          auth_form.target = "kcp_cert";

          auth_form.submit();

          // KCP 팝업 우회 실패시 대체방안 안내
          const manualSubmitRootEl = document.createElement('div')
          manualSubmitRootEl.classList.add('kcp-manual-submit')
          const submitButton = document.createElement('button')
          const buttonDescription = document.createElement('p')
          const extraDescription = document.createElement('p')
          submitButton.type = 'submit'
          submitButton.innerText = '휴대폰 본인인증 진행'
          buttonDescription.innerText = '휴대폰 본인인증 화면으로 자동 연결되지않을시 위 버튼을 눌러주세요.'
          extraDescription.innerHTML = `인스타그램/페이스북 등 인앱 브라우저에서 팝업 허용 관련 문제가 발생할 시 
          사용 하시는 웹 브라우저로 <strong>${location.origin}</strong> 접속 후 팝업을 허용한 후 본인인증 서비스를 이용하여 주세요.`
          manualSubmitRootEl.appendChild(submitButton)
          manualSubmitRootEl.appendChild(buttonDescription)
          manualSubmitRootEl.appendChild(extraDescription)
          auth_form.appendChild(manualSubmitRootEl)
        }
      } catch (error) {
        this.runAuthFail(error.message);
      }
    },
    runAuthFail(message) {
      shopby.alert(message, () => {
        shopby.localStorage.setItemWithExpire(shopby.cache.key.member.kcpAuth, { fail: true });
        window.location.href = returnUrl;
      });
      console.error(message);
    },
  };

  shopby.start.initiate(shopby.member.kcpAuth.initiate.bind(shopby.member.kcpAuth));
});

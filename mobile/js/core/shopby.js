window['shopby'] = window.shopby
  ? window.shopby
  : {
      localStorage: null,
      utils: null,
      logined: null,
      goHome: null,
      config: {
        skin: null,
        pay: null,
      },
      platform: null,
      api: null,
      start: {
        initiate: null,
        entries: [],
      },
      cash: null,
      regex: null,
      message: null,
      designPopup: null,

      // page global object
      home: null,
      intro: {
        noAccess: null,
        memberOnly: null,
        adultCertification: null,
      },
      product: {
        view: null,
      },
      order: null,
      cart: null,
      member: {
        login: null,
        auth: null,
      },
      board: {
        list: null,
      },
      my: null,
      service: {
        agreement: null,
      },
      helper: {
        cart: null,
        timer: null,
        option: null,
        login: null,
      },
      /**
       * @param {'MAIN'|'PRODUCT'|'PRODUCT_SEARCH'|'PRODUCT_LIST'|'DISPLAY_SECTION'|'CART'|'ORDER'|'ORDER_COMPLETE'|'ORDER_DETAIL'|'MEMBER_JOIN_COMPLETE'} key
       * @param {object} payload
       */
      setGlobalVariableBy: () => {},
    };

/**
 * 전역 객체 생성.
 */
(() => {
  /**
   * @shopby.logined
   * 로그인했는지 판별해 주는 함수
   */
  shopby.logined = function () {
    const token = shopby.cache.getAccessToken();
    const dormant = shopby.localStorage.getItem(shopby.cache.key.member.dormant);
    const isDormant = dormant ? dormant : false;
    return token && token !== '' && !isDormant;
  };

  /**
   * @shopby.goHome
   * 지정한 홈화면으로 이동하는 함수.
   */
  shopby.goHome = function () {
    window.location.href = '/index.html';
  };

  /**
   * @shopby.goLogin
   * 로그인 화면으로 이동하는 함수
   *
   * @param nextUrl: string
   */
  shopby.goLogin = (nextUrl = '') => {
    const queryParams = nextUrl && typeof nextUrl === 'string' ? `?next-url=${encodeURIComponent(nextUrl)}` : '';
    window.location.href = `/pages/login/login.html${queryParams}`;
  };

  shopby.goAdultCertification = (nextUrl = '', introType = 'ONLY_ADULT') => {
    const nextQuery = nextUrl ? `&next-url=${nextUrl}` : '';
    window.location.href = `/pages/intro/adult-certification.html?introType=${introType}${nextQuery}`;
  };

  /**
   * 로그인 유저만 이동
   */
  shopby.moveForLogined = e => {
    if (shopby.logined()) {
      window.location.href = e.currentTarget.pathname;
    } else {
      shopby.goLogin();
    }

    return false;
  };

  /**
   * @shopby.confirmLogin
   * 컨펌창 띄운 후 결과에 따라 로그인 화면으로 이동
   */
  shopby.confirmLogin = () => {
    shopby.confirm({ message: '로그인하셔야 본 서비스를 이용하실 수 있습니다.' }, ({ state }) => {
      if (state !== 'ok') return;
      shopby.goLogin();
    });
  };

  /**
   * @shopby.getScript
   * 특정 스트립트를 바로 실행
   * (ex) 동적으로 DOM 추가
   */

  shopby.getScript = url => {
    return $.getScript(url)
      .done(() => {})
      .fail(function () {
        shopby.alert(`fail : check the url ( ${url} )`);
      });
  };

  /**
   * path 로 현재 윈도우 팝업인지 아닌지 체크
   */
  const windowPopupPath = ['design-popup'];
  shopby.isWindowPopup = () => {
    return windowPopupPath.some(path => location.pathname.includes(path));
  };

  /**
   * @shopby.localStorage
   * 로컬스토리지를 관리하는 객체. 로컬스토리지에 직접적으로 접근하기 보다는 아래의 함수를 사용하세요.
   *
   * @shopby.localStorage.getItemWithExpire
   * @shopby.localStorage.setItemWithExpire
   */
  shopby.localStorage = {
    expirationDateKey: '_expirationDate',

    setItem(name, value) {
      const data = JSON.stringify(value);

      try {
        window.localStorage.setItem(name, data);
        return true;
      } catch (err) {
        console.error('setStorage: Error setting key [' + name + '] in localStorage: ' + JSON.stringify(err));
        return false;
      }
    },

    getItem(name) {
      if (!name) return null;

      try {
        return JSON.parse(window.localStorage.getItem(name));
      } catch (err) {
        console.error('getStorage: Error reading key [' + name + '] from localStorage: ' + JSON.stringify(err));
        return null;
      }
    },

    removeItem(name) {
      try {
        window.localStorage.removeItem(name);
        window.localStorage.removeItem(name + this.expirationDateKey);
        return true;
      } catch (err) {
        console.error('removeStorage: Error removing key [' + name + '] from localStorage: ' + JSON.stringify(err));
        return false;
      }
    },

    setItemWithExpire(name, data, expire = 60 * 5 * 1000) {
      const expireUnixTime = Date.now() + expire;

      this.setItem(name, data);
      this.setItem(name + this.expirationDateKey, expireUnixTime);
    },

    getItemWithExpire(name) {
      if (!name) return null;

      const expireUnixTime = this.getItem(name + this.expirationDateKey);

      const expire = !!expireUnixTime && expireUnixTime < Date.now();

      return expire ? null : this.getItem(name);
    },

    /**
     * 중복을 허용하지 않고 최대 N개 까지 저장, 순서대로 저장함
     * 순서대로 1,2,3입력하면 1 -> 2,1 -> 3,2,1
     * 다시 2가 들어오면 2,3,1
     *
     * @author haekyu.cho
     * @param key
     * @param value
     * @param max 최대 배열 크기
     * @param expire 1일
     */
    unshiftItemByOrder(key, value, expire = 60 * 60 * 24 * 1000, max = 10) {
      let values = JSON.parse(this.getItemWithExpire(key) || '[]').filter(v => v !== value);
      values.unshift(value);

      if (values.length > max) {
        values = values.slice(0, max);
      }

      this.setItemWithExpire(key, JSON.stringify(values), expire);
    },

    popItemByOrder(key, value, expire = 60 * 60 * 24 * 1000) {
      const filtered = this.getItemsByParced(key).filter(v => v !== value);
      this.setItemWithExpire(key, JSON.stringify(filtered), expire);
    },

    getItemsByParced(key) {
      return JSON.parse(this.getItemWithExpire(key));
    },
  };

  shopby.sessionStorage = {
    expirationDateKey: '_expirationDate',

    setItem(name, value) {
      const data = JSON.stringify(value);

      try {
        window.sessionStorage.setItem(name, data);
        return true;
      } catch (err) {
        console.error('setStorage: Error setting key [' + name + '] in sessionStorage: ' + JSON.stringify(err));
        return false;
      }
    },

    getItem(name) {
      if (!name) return null;

      try {
        return JSON.parse(window.sessionStorage.getItem(name));
      } catch (err) {
        console.error('getStorage: Error reading key [' + name + '] from sessionStorage: ' + JSON.stringify(err));
        return null;
      }
    },

    removeItem(name) {
      try {
        window.sessionStorage.removeItem(name);
        window.sessionStorage.removeItem(name + this.expirationDateKey);
        return true;
      } catch (err) {
        console.error('removeStorage: Error removing key [' + name + '] from sessionStorage: ' + JSON.stringify(err));
        return false;
      }
    },

    setItemWithExpire(name, data, expire = 60 * 5 * 1000) {
      const expireUnixTime = Date.now() + expire;

      this.setItem(name, data);
      this.setItem(name + this.expirationDateKey, expireUnixTime);
    },

    getItemWithExpire(name) {
      if (!name) return null;

      const expireUnixTime = this.getItem(name + this.expirationDateKey);

      const expire = !!expireUnixTime && expireUnixTime < Date.now();

      return expire ? null : this.getItem(name);
    },
  };

  /**
   * @shopby.regex
   * 전역 정규식 오브젝트.
   */
  shopby.regex = {
    number: /[0-9]/g,
    notNumber: /[^0-9]/g,
    negativeNumber: /[0-9-]+/g,
    decimalNumber: /[0-9.]+/g,
    eng: /[a-zA-Z]/g,
    ko: /[ㄱ-힣]/g,
    koEng: /[a-zA-Z0-9ㄱ-힣]/g,
    currency: /[0-9,]/g,
    at: /@/g,
    noSpace: /\s/g, // 공백만 불가
    space: /(?:\r\n|\r|\n)/g, // 줄바꿈
    noCommonSpecial: /['"<>₩\\`‘”]/gi, // 공통 제한 문자 불가
    noPartSpecial: /['"‘”<>\\`(),:;@[\]\s]/g, // 일부 특수문자(‘”<>\`(),:;@[])와 공백 불가
    noSpecialSpace: /[^a-zA-Z0-9ㄱ-힣\s]/g, // 한글, 영문, 숫자, 공백만 가능
    /* eslint-disable */
    userid: /[^a-zA-Z0-9@\._\-]/g,
    passwordSpecial: /[!@#$%^&+=\-_.()]/g, // 특수문자 : ! @ # $ % ^ & + = - _ . ( ) 만 사용 가능
    emailId: /^[_A-Za-z0-9-\\+]+(.[_A-Za-z0-9-]+)$/,
    emailDomain: /^[A-Za-z0-9-]+(.[A-Za-z0-9]+)*(\.[A-Za-z]{2,})$/,
    email: /[_A-Za-z0-9-\\+]+(.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(.[A-Za-z0-9]+)*(.[A-Za-z]{2,})$/,
    mobileNo: /(\d{11,12})/g,
    birthday: /^(19[0-9][0-9]|20\d{2})(0[0-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$/,
    customsId: /^[p|P][1-6]{1}[0-9]{11}$/, // 개인통관고유번호
    engNumber: /[^0-9a-zA-Z]/g, //영문, 숫자만 가능
    imageExtension: /.(bmp|png|jpg|jpeg|gif)$/i,
    bankDepositorName: /[^a-zA-Zㄱ-힣!@#$%^&+=\-_.()]/g, //한글,영문대소문자,특수문자 : ! @ # $ % ^ & + = - _ . ( ) 만 사용 가능
    /* eslint-enable */
  };

  /**
   * @shopby.message
   * 전역 메시지 모음
   */
  shopby.message = {
    invalidId: '영문, 숫자, 특수문자(-),(_),(.),(@)만 입력가능 합니다. (@는 1개만 입력 가능)',
    lessLengthId: '아이디는 최소 5자 이상 입력해주세요.',
    existId: '이미 사용중인 아이디입니다. 다른 아이디를 입력하여 주세요.',
    withDrawn: '회원 탈퇴한 아이디 입니다. 탈퇴 후 동일한 아이디로 5일간 재가입 불가합니다.',
    kcpWithdrawn: '탈퇴한 회원입니다. 탈퇴 후 5일간 재가입 불가합니다.',
    kcpExistMember: '이미 가입된 회원입니다.',
    invalidPassword: '영문, 숫자, 특수문자를 3종류 모두 조합하여 8~20자로 입력해주세요.',
    lessInvalidPassword: '영문, 숫자, 특수문자를 2종류 이상 조합하여 10~20자로 입력해주세요.',
    invalidPasswordSpecial: '특수문자는 !@#$%^&+=-_.()만 사용 가능합니다.',
    notEqualPassword: '비밀번호와 비밀번호확인 값이 일치하지 않습니다.',
    notEqualNewPassword: '새 비밀번호와 새 비밀번호확인 값이 일치하지 않습니다.',
    noInputEmail: '이메일을 입력해주세요.',
    invalidEmail: '입력된 이메일은 잘못된 형식입니다.',
    existEmail: '이메일 주소가 이미 사용중입니다.',
    existNickname: '닉네임이 이미 사용중입니다.',
    invalidKorEngNum: '한글, 영문, 숫자만 입력 가능합니다.',
    invalidKorEng: '한글, 영문만 입력가능합니다.',
    invalidMobileNo: '11~12자 이내로 입력해주세요.',
    invalidAge: '만 14세 미만은 쇼핑몰 이용이 불가합니다.',
    invalidBirthday: '생년월일을 확인해주세요.',
    requiredBirthday: '생년월일을 선택해주세요.',
    successId: '사용 가능한 아이디입니다.',
    successEmail: '사용 가능한 이메일입니다.',
    successNickname: '사용 가능한 닉네임입니다.',
  };

  /**
   * @shopby.utils
   * 전역 유틸리티 함수.
   */
  shopby.utils = {
    getPlatform() {
      return /(iPhone|iPad|iPod|iOS|Android)/i.test(navigator.userAgent) ? 'MOBILE_WEB' : 'PC';
    },

    getUrlParam(name, defaultValue = '') {
      const searchParams = new URLSearchParams(window.location.search);

      if (searchParams.has(name) && Boolean(searchParams.get(name))) {
        return decodeURIComponent(searchParams.get(name));
      }

      return defaultValue;
    },

    getUrlParams() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      return Object.fromEntries(urlSearchParams.entries());
    },

    /**
     * @pushState 브라우저 리프래쉬 없이 queryString 추가
     *
     * @author Jongkeun Kim
     * @param params : object | null
     * @param title : string
     */
    pushState(params = null, title = document.title) {
      const path = window.location.pathname;

      const queryString = new URLSearchParams({ ...shopby.utils.getUrlParams(), ...params });
      const url = params ? `${path}?${queryString}` : path;
      window.history.pushState(null, title, url);
    },

    /**
     * @replaceState 브라우저 리프래쉬 없이 queryString 추가. 히스토리 저장 X
     *
     * @author Jongkeun Kim
     * @param params : object | null
     * @param title : string
     */
    replaceState(params = null, title = document.title) {
      const path = window.location.pathname;
      const queryString = new URLSearchParams({ ...shopby.utils.getUrlParams(), ...params });
      const url = params ? `${path}?${queryString}` : path;
      window.history.replaceState(null, title, url);
    },

    /**
     * 쿼리스트링 변경
     *
     * @param params - {name: value}
     */
    sendQueryString(params) {
      const paramEntries = new URLSearchParams(location.search).entries();
      const existingParams = {};
      for (const [key, value] of paramEntries) {
        existingParams[key] = value;
      }
      const newParams = Object.assign(existingParams, params);
      location.href = `${window.location.pathname}?${$.param(newParams)}`;
    },

    /**
     * <h3>ary가 배열이고 배열 사이즈가 0보다 클 경우</h3>
     *
     * @param ary
     * @returns {boolean}
     */
    isArrayNotEmpty(ary) {
      return Array.isArray(ary) && ary.length > 0;
    },
    isArrayEmpty(ary) {
      return Array.isArray(ary) && ary.length === 0;
    },
    /**
     * locales는 아래와 같다
     * 'en-US',    // United States
     * 'ko-KR',    // korea
     * undefined,   // 브라우저에게 locaels를 맡긴다.
     *
     * @param num
     * @returns {string}
     */
    toCurrencyString(num = 0) {
      // return String(num).replace(/(.)(?=(\d{3})+$)/g, '$1,'); 정규식을 이용하는 방법도 있다.
      return num.toLocaleString(undefined, { minimumFractionDigits: 0 });
    },

    substrWithPostFix(str, length = 73, postFix = '...') {
      const postFixStr = str.length > length ? postFix : '';

      return str.substr(0, length).concat(postFixStr);
    },

    changeBreadcrumb(lastLocation) {
      $('.location_cont').html(`<em> <a href="/" class="local_home">HOME</a> > ${lastLocation}</em>`);
    },

    getDisplayProductPrice({ salePrice, immediateDiscountAmt, additionDiscountAmt }) {
      return (salePrice || 0) - (immediateDiscountAmt || 0) - (additionDiscountAmt || 0);
    },

    getTotal(objectArray, keyName) {
      return objectArray.reduce((sum, object) => (sum += object[keyName]), 0);
    },

    // 상품합계금액
    // getDiscountAmt 의존 존재
    getProductTotalAmt({ salePrice, addPrice, immediateDiscountAmt, additionalDiscountAmt }, orderCnt = 1) {
      const discountAmt = this.getDiscountAmt({ immediateDiscountAmt, additionalDiscountAmt });

      return orderCnt * (salePrice - discountAmt + addPrice);
    },

    // 할인 금액
    getDiscountAmt({ immediateDiscountAmt, additionalDiscountAmt }, orderCnt = 1) {
      return (immediateDiscountAmt + additionalDiscountAmt) * orderCnt;
    },
    //옵션 정보 생성
    createOptionText(orderOption) {
      if (!orderOption) return '';
      const seperator = '|';
      const values = orderOption.optionValue.split(seperator);

      const optionText = orderOption.optionName
        .split(seperator)
        .map((name, index) => `<strong>${name}</strong> : ${values[index]}`)
        .join(` ${seperator} `);

      const inputText = orderOption.inputs
        ? orderOption.inputs
            .filter(input => !!input.inputValue)
            .map(input => `- <strong>${input.inputLabel}</strong> : ${input.inputValue}`)
            .join('<br/>')
        : '';

      return optionText.concat('<br/>').concat(inputText ? inputText : '');
    },

    isPreSalePeriod(reservationData) {
      if (!reservationData) return false;
      const { reservationStartYmdt, reservationEndYmdt } = reservationData;
      const today = dayjs();
      const saleStart = today.diff(dayjs(reservationStartYmdt)) >= 0;
      const saleFinish = today.diff(dayjs(reservationEndYmdt)) <= 0;
      return saleStart && saleFinish;
    },

    /**
     * @throttle
     *
     * @author Jongkeun Kim
     * @callback function : 콜백
     * @limit number : ms second
     */
    throttle(callback, limit) {
      let waiting = false;
      return () => {
        if (!waiting) {
          callback.apply(this, arguments);
          waiting = true;
          setTimeout(() => {
            waiting = false;
          }, limit);
        }
      };
    },

    /**
     * @throttleUsingRaf requestAnimationFrame을 사용한 throttle
     *
     * @author eunbi kim
     * @callback function : 콜백
     */
    throttleUsingRaf(callback) {
      let timeout = null;

      return function () {
        if (timeout) {
          window.cancelAnimationFrame(timeout);
        }
        timeout = window.requestAnimationFrame(() => {
          callback();
        });
      };
    },

    /**
     * @hideAllContents 현재 페이지를 아예 보이지 않게 할 경우 사용
     *
     * @author sohyun choi
     */
    hideAllContents() {
      $('#contents,#header,#aside,#footer').hide();
    },

    /**
     * 텍스트 말줄임
     *
     * @author YoungGeun Kwon
     * @param text
     * @param count
     * @returns {string|*}
     */
    truncate(text, count) {
      if (text.includes('\n') && text.indexOf('\n') < count) {
        return text.substr(0, text.indexOf('\n')) + '...';
      }

      if (text.length >= count) {
        return text.substr(0, count) + '...';
      }

      return text;
    },

    removeComma(currency) {
      return currency.replace(shopby.regex['notNumber'], '');
    },

    /*
     * originObject 중에서 keys 에 해당되는 것만 추출하여 반환
     *
     * @author Bomee Yoon
     * @param originObject
     * @param keys
     * @return pickedObject
     * */
    pickObjectByKeys(originObject, keys) {
      return keys.reduce((pickedObject, key) => {
        if (originObject && originObject[key]) {
          const originValue = originObject[key];
          if (Object.prototype.toString.call(originValue).includes('object Object')) {
            pickedObject[key] = { ...originValue };
          } else {
            pickedObject[key] = originValue;
          }
        }
        return pickedObject;
      }, {});
    },

    /* eslint-disable */
    // prettier-ignore
    isEqual(t,e){var r=200,n="__lodash_hash_undefined__",o=1,i=2,a=9007199254740991,u="[object Arguments]",c="[object Array]",s="[object AsyncFunction]",f="[object Boolean]",l="[object Date]",_="[object Error]",h="[object Function]",p="[object GeneratorFunction]",v="[object Map]",y="[object Number]",b="[object Null]",d="[object Object]",g="[object Proxy]",j="[object RegExp]",w="[object Set]",m="[object String]",z="[object Symbol]",A="[object Undefined]",O="[object ArrayBuffer]",k="[object DataView]",S=/^\[object .+?Constructor\]$/,x=/^(?:0|[1-9]\d*)$/,E={};E["[object Float32Array]"]=E["[object Float64Array]"]=E["[object Int8Array]"]=E["[object Int16Array]"]=E["[object Int32Array]"]=E["[object Uint8Array]"]=E["[object Uint8ClampedArray]"]=E["[object Uint16Array]"]=E["[object Uint32Array]"]=!0,E[u]=E[c]=E[O]=E[f]=E[k]=E[l]=E[_]=E[h]=E[v]=E[y]=E[d]=E[j]=E[w]=E[m]=E["[object WeakMap]"]=!1;var P="object"==typeof global&&global&&global.Object===Object&&global,F="object"==typeof self&&self&&self.Object===Object&&self,$=P||F||Function("return this")(),M="object"==typeof exports&&exports&&!exports.nodeType&&exports,U=M&&"object"==typeof module&&module&&!module.nodeType&&module,B=U&&U.exports===M,I=B&&P.process,L=function(){try{return I&&I.binding&&I.binding("util")}catch(t){}}(),T=L&&L.isTypedArray;function W(t,e){for(var r=-1,n=null==t?0:t.length;++r<n;)if(e(t[r],r,t))return!0;return!1}function D(t){var e=-1,r=Array(t.size);return t.forEach(function(t,n){r[++e]=[n,t]}),r}function R(t){var e=-1,r=Array(t.size);return t.forEach(function(t){r[++e]=t}),r}var C,N,V,q=Array.prototype,G=Function.prototype,H=Object.prototype,J=$["__core-js_shared__"],K=G.toString,Q=H.hasOwnProperty,X=(C=/[^.]+$/.exec(J&&J.keys&&J.keys.IE_PROTO||""))?"Symbol(src)_1."+C:"",Y=H.toString,Z=RegExp("^"+K.call(Q).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),tt=B?$.Buffer:void 0,et=$.Symbol,rt=$.Uint8Array,nt=H.propertyIsEnumerable,ot=q.splice,it=et?et.toStringTag:void 0,at=Object.getOwnPropertySymbols,ut=tt?tt.isBuffer:void 0,ct=(N=Object.keys,V=Object,function(t){return N(V(t))}),st=It($,"DataView"),ft=It($,"Map"),lt=It($,"Promise"),_t=It($,"Set"),ht=It($,"WeakMap"),pt=It(Object,"create"),vt=Dt(st),yt=Dt(ft),bt=Dt(lt),dt=Dt(_t),gt=Dt(ht),jt=et?et.prototype:void 0,wt=jt?jt.valueOf:void 0;function mt(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function zt(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function At(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function Ot(t){var e=-1,r=null==t?0:t.length;for(this.__data__=new At;++e<r;)this.add(t[e])}function kt(t){var e=this.__data__=new zt(t);this.size=e.size}function St(t,e){var r=Nt(t),n=!r&&Ct(t),o=!r&&!n&&Vt(t),i=!r&&!n&&!o&&Kt(t),a=r||n||o||i,u=a?function(t,e){for(var r=-1,n=Array(t);++r<t;)n[r]=e(r);return n}(t.length,String):[],c=u.length;for(var s in t)!e&&!Q.call(t,s)||a&&("length"==s||o&&("offset"==s||"parent"==s)||i&&("buffer"==s||"byteLength"==s||"byteOffset"==s)||Wt(s,c))||u.push(s);return u}function xt(t,e){for(var r=t.length;r--;)if(Rt(t[r][0],e))return r;return-1}function Et(t){return null==t?void 0===t?A:b:it&&it in Object(t)?function(t){var e=Q.call(t,it),r=t[it];try{t[it]=void 0;var n=!0}catch(t){}var o=Y.call(t);n&&(e?t[it]=r:delete t[it]);return o}(t):function(t){return Y.call(t)}(t)}function Pt(t){return Jt(t)&&Et(t)==u}function Ft(t){return!(!Ht(t)||X&&X in t)&&(qt(t)?Z:S).test(Dt(t))}function $t(t){if(r=(e=t)&&e.constructor,n="function"==typeof r&&r.prototype||H,e!==n)return ct(t);var e,r,n,o=[];for(var i in Object(t))Q.call(t,i)&&"constructor"!=i&&o.push(i);return o}function Mt(t,e,r,n,a,u){var c=r&o,s=t.length,f=e.length;if(s!=f&&!(c&&f>s))return!1;var l=u.get(t);if(l&&u.get(e))return l==e;var _=-1,h=!0,p=r&i?new Ot:void 0;for(u.set(t,e),u.set(e,t);++_<s;){var v=t[_],y=e[_];if(n)var b=c?n(y,v,_,e,t,u):n(v,y,_,t,e,u);if(void 0!==b){if(b)continue;h=!1;break}if(p){if(!W(e,function(t,e){if(o=e,!p.has(o)&&(v===t||a(v,t,r,n,u)))return p.push(e);var o})){h=!1;break}}else if(v!==y&&!a(v,y,r,n,u)){h=!1;break}}return u.delete(t),u.delete(e),h}function Ut(t){return function(t,e,r){var n=e(t);return Nt(t)?n:function(t,e){for(var r=-1,n=e.length,o=t.length;++r<n;)t[o+r]=e[r];return t}(n,r(t))}(t,Qt,Lt)}function Bt(t,e){var r,n,o=t.__data__;return("string"==(n=typeof(r=e))||"number"==n||"symbol"==n||"boolean"==n?"__proto__"!==r:null===r)?o["string"==typeof e?"string":"hash"]:o.map}function It(t,e){var r=function(t,e){return null==t?void 0:t[e]}(t,e);return Ft(r)?r:void 0}mt.prototype.clear=function(){this.__data__=pt?pt(null):{},this.size=0},mt.prototype.delete=function(t){var e=this.has(t)&&delete this.__data__[t];return this.size-=e?1:0,e},mt.prototype.get=function(t){var e=this.__data__;if(pt){var r=e[t];return r===n?void 0:r}return Q.call(e,t)?e[t]:void 0},mt.prototype.has=function(t){var e=this.__data__;return pt?void 0!==e[t]:Q.call(e,t)},mt.prototype.set=function(t,e){var r=this.__data__;return this.size+=this.has(t)?0:1,r[t]=pt&&void 0===e?n:e,this},zt.prototype.clear=function(){this.__data__=[],this.size=0},zt.prototype.delete=function(t){var e=this.__data__,r=xt(e,t);return!(r<0||(r==e.length-1?e.pop():ot.call(e,r,1),--this.size,0))},zt.prototype.get=function(t){var e=this.__data__,r=xt(e,t);return r<0?void 0:e[r][1]},zt.prototype.has=function(t){return xt(this.__data__,t)>-1},zt.prototype.set=function(t,e){var r=this.__data__,n=xt(r,t);return n<0?(++this.size,r.push([t,e])):r[n][1]=e,this},At.prototype.clear=function(){this.size=0,this.__data__={hash:new mt,map:new(ft||zt),string:new mt}},At.prototype.delete=function(t){var e=Bt(this,t).delete(t);return this.size-=e?1:0,e},At.prototype.get=function(t){return Bt(this,t).get(t)},At.prototype.has=function(t){return Bt(this,t).has(t)},At.prototype.set=function(t,e){var r=Bt(this,t),n=r.size;return r.set(t,e),this.size+=r.size==n?0:1,this},Ot.prototype.add=Ot.prototype.push=function(t){return this.__data__.set(t,n),this},Ot.prototype.has=function(t){return this.__data__.has(t)},kt.prototype.clear=function(){this.__data__=new zt,this.size=0},kt.prototype.delete=function(t){var e=this.__data__,r=e.delete(t);return this.size=e.size,r},kt.prototype.get=function(t){return this.__data__.get(t)},kt.prototype.has=function(t){return this.__data__.has(t)},kt.prototype.set=function(t,e){var n=this.__data__;if(n instanceof zt){var o=n.__data__;if(!ft||o.length<r-1)return o.push([t,e]),this.size=++n.size,this;n=this.__data__=new At(o)}return n.set(t,e),this.size=n.size,this};var Lt=at?function(t){return null==t?[]:(t=Object(t),function(t,e){for(var r=-1,n=null==t?0:t.length,o=0,i=[];++r<n;){var a=t[r];e(a,r,t)&&(i[o++]=a)}return i}(at(t),function(e){return nt.call(t,e)}))}:function(){return[]},Tt=Et;function Wt(t,e){return!!(e=null==e?a:e)&&("number"==typeof t||x.test(t))&&t>-1&&t%1==0&&t<e}function Dt(t){if(null!=t){try{return K.call(t)}catch(t){}try{return t+""}catch(t){}}return""}function Rt(t,e){return t===e||t!=t&&e!=e}(st&&Tt(new st(new ArrayBuffer(1)))!=k||ft&&Tt(new ft)!=v||lt&&"[object Promise]"!=Tt(lt.resolve())||_t&&Tt(new _t)!=w||ht&&"[object WeakMap]"!=Tt(new ht))&&(Tt=function(t){var e=Et(t),r=e==d?t.constructor:void 0,n=r?Dt(r):"";if(n)switch(n){case vt:return k;case yt:return v;case bt:return"[object Promise]";case dt:return w;case gt:return"[object WeakMap]"}return e});var Ct=Pt(function(){return arguments}())?Pt:function(t){return Jt(t)&&Q.call(t,"callee")&&!nt.call(t,"callee")},Nt=Array.isArray;var Vt=ut||function(){return!1};function qt(t){if(!Ht(t))return!1;var e=Et(t);return e==h||e==p||e==s||e==g}function Gt(t){return"number"==typeof t&&t>-1&&t%1==0&&t<=a}function Ht(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}function Jt(t){return null!=t&&"object"==typeof t}var Kt=T?function(t){return function(e){return t(e)}}(T):function(t){return Jt(t)&&Gt(t.length)&&!!E[Et(t)]};function Qt(t){return null!=(e=t)&&Gt(e.length)&&!qt(e)?St(t):$t(t);}return function t(e,r,n,a,s){return e===r||(null==e||null==r||!Jt(e)&&!Jt(r)?e!=e&&r!=r:function(t,e,r,n,a,s){var h=Nt(t),p=Nt(e),b=h?c:Tt(t),g=p?c:Tt(e),A=(b=b==u?d:b)==d,S=(g=g==u?d:g)==d,x=b==g;if(x&&Vt(t)){if(!Vt(e))return!1;h=!0,A=!1}if(x&&!A)return s||(s=new kt),h||Kt(t)?Mt(t,e,r,n,a,s):function(t,e,r,n,a,u,c){switch(r){case k:if(t.byteLength!=e.byteLength||t.byteOffset!=e.byteOffset)return!1;t=t.buffer,e=e.buffer;case O:return!(t.byteLength!=e.byteLength||!u(new rt(t),new rt(e)));case f:case l:case y:return Rt(+t,+e);case _:return t.name==e.name&&t.message==e.message;case j:case m:return t==e+"";case v:var s=D;case w:var h=n&o;if(s||(s=R),t.size!=e.size&&!h)return!1;var p=c.get(t);if(p)return p==e;n|=i,c.set(t,e);var b=Mt(s(t),s(e),n,a,u,c);return c.delete(t),b;case z:if(wt)return wt.call(t)==wt.call(e)}return!1}(t,e,b,r,n,a,s);if(!(r&o)){var E=A&&Q.call(t,"__wrapped__"),P=S&&Q.call(e,"__wrapped__");if(E||P){var F=E?t.value():t,$=P?e.value():e;return s||(s=new kt),a(F,$,r,n,s)}}return!!x&&(s||(s=new kt),function(t,e,r,n,i,a){var u=r&o,c=Ut(t),s=c.length,f=Ut(e).length;if(s!=f&&!u)return!1;for(var l=s;l--;){var _=c[l];if(!(u?_ in e:Q.call(e,_)))return!1}var h=a.get(t);if(h&&a.get(e))return h==e;var p=!0;a.set(t,e),a.set(e,t);for(var v=u;++l<s;){_=c[l];var y=t[_],b=e[_];if(n)var d=u?n(b,y,_,e,t,a):n(y,b,_,t,e,a);if(!(void 0===d?y===b||i(y,b,r,n,a):d)){p=!1;break}v||(v="constructor"==_)}if(p&&!v){var g=t.constructor,j=e.constructor;g!=j&&"constructor"in t&&"constructor"in e&&!("function"==typeof g&&g instanceof g&&"function"==typeof j&&j instanceof j)&&(p=!1)}return a.delete(t),a.delete(e),p}(t,e,r,n,a,s))}(e,r,n,a,t,s))}(t,e)},
    /* eslint-enable */

    /*
     * Promise.allSettled polyfill
     * */
    allSettled(promises) {
      return Promise.all(
        promises.map(p =>
          Promise.resolve(p).then(
            value => ({
              status: 'fulfilled',
              value,
            }),
            reason => ({
              status: 'rejected',
              reason,
            }),
          ),
        ),
      );
    },
  };

  /**
   * @shopby.config
   * 샵 설정 절보.
   *
   * @shopby.config.apiUrl : shop API 주소
   * @shopby.config.storageApiUrl : 첨부파일 Storage 주소
   * @shopby.config.skin : 스킨
   * @shopby.config.pay : 결제 수단
   */
  shopby.config = {
    apiUrl: null,
    storageApiUrl: null,
    skin: {
      profile: null,
      clientId: null,
      osType: 'WEB',
      platform: 'MOBILE_WEB',
      mallName: null,
      sections: {
        pc: ['SCPC0001', 'SCPC0002', 'SCPC0003', 'SCPC0004', 'SCPC0005'],
        mobile: ['SCMO0001', 'SCMO0002', 'SCMO0003', 'SCMO0004', 'SCMO0005'],
      },
      skinCode: null,
      bannersGroup: null,
      bannerGroupCodes: [],
      supportOauth: {
        payco: true,
        naver: true,
        kakao: true,
        facebook: true,
      },
      pageWidth: 'normal',
      instagramAccessToken: '7309523338.e5fa3ea.a5335074c1424e9a974cd54cc9d1b900',
      mobileLogoUrl: '',
      privacyConsignmentUse: true,
      privacyThirdPartyUse: true,
    },

    member: {
      joinConfig: {
        address: 'USED',
        birthday: 'USED',
        email: 'REQUIRED',
        memberId: 'REQUIRED',
        memberName: 'REQUIRED',
        mobileNo: 'REQUIRED',
        nationality: 'NOT_USED',
        nickname: 'USED',
        password: 'REQUIRED',
        phoneNo: 'USED',
        sex: 'USED',
      },
    },

    naverPay: {
      button: {
        pc: 'https://test-pay.naver.com/customer/js/naverPayButton.js',
        mobile: 'https://pay.naver.com/customer/js/mobile/naverPayButton.js"',
      },
    },

    pay: {
      js: 'ncp_pay_alpha.js',
      plugins: [
        'https://testpay.kcp.co.kr/plugin/payplus_web.jsp',
        'https://pretest.uplus.co.kr:9443/xpay/js/xpay_crossplatform.js',
      ],
    },
  };

  /**
   * @shopby.api
   * 전역 Shop API..
   */
  (() => {
    const api = {
      initiate() {
        this.checkDevice();
        this.setPlatform();
        this.setApi();
      },
      checkDevice() {
        if (location.origin.includes('localhost')) return;
        const href = window.location.href.split('://')[1];
        const search = window.location.search;
        const isTempDomain = window.location.origin.includes('shopby.co.kr');
        const prefix = isTempDomain ? 'm-' : 'm.';

        if (search.includes('mobile')) {
          window.location.href = `https://${href.replace(prefix, '')}`;
          return;
        }

        const accessedFromMobileWithoutMobileDomain =
          shopby.utils.getPlatform() === 'MOBILE_WEB' && !(href.includes('m-') || href.includes('m.'));

        if (!accessedFromMobileWithoutMobileDomain) return;

        window.location.href = `//${prefix}${href}`;
      },
      setPlatform() {
        const platformClassification = {
          PC: 'pc',
          MOBILE_WEB: 'mobile',
        };
        const deployPlatform = shopby.config.skin.platform;
        shopby.platform = platformClassification[deployPlatform];
      },

      // TODO. 우선 startsWith 로 요청중 매치되는 url 이 있는지 찾아서 401 시 매칭되는 credentialLevel(require, optional) 에 따라 다른 통합 처리를 함
      credentialLevelUrl: {
        guest: ['/guest'],
        required: ['/profile', '/coupons', '/cart', '/kcp'],
        optional: ['/boards', '/products', '/order-sheets', '/cart/count', '/display', '/inquiries'],
      },

      /**
       * @reason : 'TOKEN_EMPTY'
       */
      // eslint-disable-next-line no-unused-vars
      requestFailure(reason = 'UNKNOWN') {
        const FAIL_REASON = {
          TOKEN_EMPTY: '로그인이 필요한 서비스입니다.',
          UNKNOWN: '알수없는 사유',
        };

        if (reason === 'TOKEN_EMPTY') {
          shopby.alert(FAIL_REASON[reason], shopby.goLogin);
        }

        return new Promise((_, reject) => reject(FAIL_REASON[reason]));
      },

      /**
       * @reason : 'TOKEN_EXPIRED'
       */
      // eslint-disable-next-line no-unused-vars
      responseInterceptor(reason = 'UNKHOWN') {
        const FAIL_REASON = {
          TOKEN_EXPIRED: '인증 정보가 만료되었습니다.',
          UNKNOWN: '알수없는 사유',
        };

        if (reason === 'TOKEN_EXPIRED') {
          shopby.alert(FAIL_REASON[reason], shopby.goLogin);
        }

        return new Promise((_, reject) => reject(FAIL_REASON[reason]));
      },

      async handleResponse(response, credentialLevel, originalRequestUrl, originalRequest) {
        const { status, url } = response;
        const _url = url || '';
        const data = _url.includes('/kcp') ? await response.text() : await response.json().catch(() => null);
        const noAlertCode = ['M0010', 'ODSH0010', 'NCPE0002', 'M0020'];

        if (status === 503) {
          location.href = '/pages/error_503.html';
          return;
        }

        if (status === 401) {
          shopby.sessionStorage.removeItem(shopby.cache.dataKey.profile);
        }

        // 토큰이 있는데 유효하지 않을 경우 통합처리
        const unAuthorizedErrorCode = 'NCPE0003';
        if (status === 401 && data.code === unAuthorizedErrorCode) {
          shopby.cache.removeAccessToken();
          shopby.goHome();
          return;
        }

        if (_url.includes('/malls') && status === 400 && data.code === 'M0009') {
          location.replace('/pages/expired-mall.html');
          return;
        }
        if (_url.includes('/authentications') && status === 401) {
          throw data;
        }
        if (data && noAlertCode.includes(data.code)) {
          throw data;
        }

        if (status === 400 || status === 404 || status === 500 || status === 503 || status === 401) {
          /**
           * @error : { status, message }
           */
          const ERROR_CODE = {
            CART: {
              ADULT_PRODUCT: 'PPVE0003',
              NO_EXHIBITION: 'PPVE0019',
              STOP_SALE: 'PPVE0013',
              NO_SALE: 'PPVE0016',
              WAIT_SALE: 'PPVE0014',
              NO_OPTION: 'PPVE0001',
              SOLDOUT_OPTION: 'PPVE0011',
            },
            MY_ORDER: {
              NO_EXIST_ORDER: 'OD0005',
              NO_MY_ORDER: 'O0016',
              NO_GUEST_MY_ORDER: 'NCPE0010',
              UNAUTHENTICATED: 'O3336',
              SMS_UNAUTHENTICATED: 'O3338',
              COUPON: 'C0021',
            },
          };
          const error = { ...data }; // 서버에서 주는 error 객체
          const hasMessage = error.result && error.result.message;
          this.customErrorMessage(error, ERROR_CODE);
          shopby.alert(error.message || hasMessage || response.statusText, () => {
            this.afterErrorAction(error, ERROR_CODE);
          });
          throw error;
        }

        // @fixme: /profile 내부에 optional token 인 경우가 있어 임시로 주석처리하였습니다.
        // if (credentialLevel === 'required' && status === 401) return this.responseInterceptor('TOKEN_EXPIRED');
        if (credentialLevel === 'optional' && status === 401) {
          // shopby.cache.removeAccessToken();
          // 필수인증여부 : 옵셔널 이고 401 리턴(토큰만료) 시 토큰 제외하고 재요청
          delete originalRequest.headers.accessToken;
          const response = await fetch(originalRequestUrl, originalRequest);
          return await this.handleResponse(response);
        }

        return {
          status,
          data,
        };
      },

      setApi() {
        shopby.api = new ShopSDK(async option => {
          const { method, requestBody, headers } = option;

          const credentialLevels =
            Object.entries(this.credentialLevelUrl).find((
              [_, value], // eslint-disable-line no-unused-vars
            ) => value.some(url => option.url.startsWith(url))) || [];
          const credentialLevel = credentialLevels.length > 0 ? credentialLevels[0] : null;

          const isFormData = option.requestBody instanceof FormData;
          const apiUrl = isFormData ? shopby.config.storageApiUrl : shopby.config.apiUrl;

          const queryParams = new URLSearchParams(option.queryString).toString();
          const queryString = !queryParams ? '' : `?${queryParams}`;
          const requestUrl = apiUrl + option.url + queryString;
          const version = headers ? headers.Version : '1.0';

          const requestInit = {
            method,
            headers: {
              //'Content-Type': 'application/json; charset=utf-8',
              platform: 'MOBILE_WEB',
              clientId: shopby.config.skin.clientId,
              Version: version,
            },
            body: isFormData ? requestBody : JSON.stringify(requestBody),
          };

          if (!isFormData) {
            requestInit.headers['Content-Type'] = 'application/json; charset=utf-8';
          }

          if (!credentialLevel) {
            const response = await fetch(requestUrl, requestInit);
            return await this.handleResponse(response);
          }

          const accessToken = shopby.cache.getAccessToken();
          const guestToken = shopby.cache.getGuestToken();

          // @fixme: /profile 내부에 optional token인 경우가 있어 임시로 주석처리하였습니다.
          // if (credentialLevel === 'required' && !accessToken) return this.requestFailure('TOKEN_EMPTY');

          // @fixme: /guest 쪽 게스트 토큰 예외처리 수정하기 cc. jongkeun
          if (credentialLevel === 'guest') {
            if (guestToken) Object.assign(requestInit.headers, { guestToken });
          } else {
            if (accessToken) Object.assign(requestInit.headers, { accessToken });
            if (guestToken) Object.assign(requestInit.headers, { guestToken });
          }

          const response = await fetch(requestUrl, requestInit);
          return await this.handleResponse(response, credentialLevel, requestUrl, requestInit);
        });
      },
      customErrorMessage(error, ERROR_CODE) {
        if (error.code === ERROR_CODE.CART.ADULT_PRODUCT) {
          shopby.confirm(
            { message: '해당 상품은 성인전용 상품입니다.성인인증 후 상품을 구매하시겠습니까?' },
            ({ state }) => (state === 'ok' ? shopby.goAdultCertification() : shopby.goHome()),
          );
          throw error;
        }
        if (
          error.code === ERROR_CODE.MY_ORDER.UNAUTHENTICATED ||
          error.code === ERROR_CODE.MY_ORDER.SMS_UNAUTHENTICATED
        ) {
          shopby.confirm({ message: '인증 후 구매가 가능합니다. 본인인증 페이지로 이동하시겠습니까?' }, ({ state }) => {
            if (state === 'ok') window.location.href = `/pages/my/modify-member.html`;
          });
          throw error;
        }
        if (error.code === ERROR_CODE.MY_ORDER.COUPON) {
          shopby.alert('프로모션 코드를 확인해주세요.');
          throw error;
        }
        if (error.code === ERROR_CODE.CART.SOLDOUT_OPTION) {
          shopby.alert('재고가 부족합니다. 수량을 조정해주세요.');
          throw error;
        }
      },
      afterErrorAction(error, ERROR_CODE) {
        if (
          [
            ERROR_CODE.MY_ORDER.NO_EXIST_ORDER,
            ERROR_CODE.MY_ORDER.NO_MY_ORDER,
            ERROR_CODE.MY_ORDER.NO_GUEST_MY_ORDER,
            ERROR_CODE.CART.SOLDOUT_OPTION,
            ERROR_CODE.CART.NO_EXHIBITION,
          ].includes(error.code)
        ) {
          shopby.goHome();
        }

        if (
          [
            ERROR_CODE.CART.STOP_SALE,
            ERROR_CODE.CART.NO_SALE,
            ERROR_CODE.CART.WAIT_SALE,
            ERROR_CODE.CART.NO_OPTION,
            ERROR_CODE.CART.SOLDOUT_OPTION,
          ].includes(error.code)
        ) {
          location.reload();
        }
      },
    };

    api.initiate();

    shopby.cache = {
      cacheData: [],
      key: {
        // token
        accessToken: 'SHOPBYPRO_SHOP_TOKEN',
        guestToken: 'SHOPBYPRO_GUEST_TOKEN',
        recentlyKeyword: 'SHOPBYPRO_RECENTLY_KEYWORD',
        accessNotIntroPath: 'SHOPBYPRO_ACCESS_NOT_INTRO_PATH',
        // page
        cart: {
          guestInfo: 'SHOPBYPRO_CART_GUEST_INFO',
          count: 'SHOPBYPRO_CART_COUNT',
        },
        order: {
          cartInfo: 'SHOPBYPRO_CART_INFO',
          cartCount: 'SHOPBYPRO_CART_COUNT',
        },
        member: {
          saveMemberId: 'SHOPBYPRO_SAVE_MEMBER_ID',
          oauthProvider: 'SHOPBYPRO_OAUTH_PROVIDER',
          oauthToken: 'SHOPBYPRO_OAUTH_CSRF',
          kcpAuth: 'SHOPBYPRO_KCP_AUTH',
          dormant: 'SHOPBYPRO_DORMANT',
          isOauthWithdrawalProcess: 'IS_OAUTH_WITHDRAWAL_PROCESS',
          isOauthWithdrawalCompareInfo: 'IS_OAUTH_WITHDRAWAL_COMPARE_INFO',
        },
        product: {
          recent: 'RECENT-PRODUCTS',
        },
        // designPopups
        designPopups: {
          popups: 'SHOPBYPRO_DESIGN_POPUPS',
          invisibleToday: 'SHOPBYPRO_INVISIBLE_TODAY',
        },
      },
      dataKey: {
        mall: 'mall',
        mallSSLSeal: 'mallSSLSeal',
        categories: 'categories',
        skin: 'skin',
        boardsConfig: 'boardsConfig',
        footerArticles: 'footerArticles',
        footerAbout: 'footerAbout',
        orderConfigs: 'orderConfigs',
        pageScripts: 'pageScripts',
        externalScripts: 'externalScripts',
        skinGroup: 'skinGroup',
        profile: 'profile',
      },

      async fetchDataWithCaching(api, name, parameter = null) {
        const { data } = await api(parameter);
        shopby.localStorage.setItemWithExpire(name, data);
      },

      async checkMallDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.mall);
        if (!dueData) await this.fetchMalls();
      },
      fetchMalls() {
        const { profile, clientId } = shopby.config.skin;
        const dataKey = this.dataKey.mall;

        const cdnUri = encodeURI(
          `https://rlgkd0v7e.toastcdn.net/mall-configurations/${profile}/${encodeURIComponent(clientId)}/mallInfo.js`,
        );

        const deferred = $.Deferred();

        // jsonp 데이터타입은 fetch 에서 제공하지 않기 때문에 jquery 를 사용함.
        $.ajax({
          url: cdnUri,
          jsonpCallback: 'getMalls', // api 담당자와 협의된 이름입니다.. 변경이 필요한 경우 BE 운영관리팀에 문의 후 변경해주세요.
          dataType: 'jsonp',
          success: function (malls) {
            // getMalls api 를 호출하기 전에 cdn 에 해당 몰의 설정이 존재하는지 먼저 확인
            shopby.localStorage.setItemWithExpire(dataKey, malls);
            deferred.resolve();
          },
          error: $.proxy(function () {
            // cdn 에 없는 경우 getMalls api 를 직접 호출
            deferred.resolve(this.fetchDataWithCaching(shopby.api.admin.getMalls, dataKey));
          }, this),
        });

        return deferred.promise();
      },

      async checkMallSSLSealDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.mallSSLSeal);
        if (!dueData) await this.fetchDataWithCaching(shopby.api.admin.getMallsSsl, this.dataKey.mallSSLSeal);
      },

      async checkSkinGroupDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.skinGroup);
        if (!dueData)
          await this.fetchDataWithCaching(shopby.api.display.getSkinBannersGroupsBySkin, this.dataKey.skinGroup, {
            queryString: { isPreview: false },
          });
      },

      async checkCategoriesDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.categories);
        if (!dueData) await this.fetchDataWithCaching(shopby.api.display.getCategories, this.dataKey.categories);
      },

      async checkBoardsConfigDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.boardsConfig);
        if (!dueData) await this.fetchDataWithCaching(shopby.api.manage.getBoardsConfig, this.dataKey.boardsConfig);
      },

      async checkFooterArticlesDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.footerArticles);
        if (!dueData)
          await this.fetchDataWithCaching(shopby.api.manage.getBoardsBoardNoArticles, this.dataKey.footerArticles, {
            pathVariable: {
              boardNo: 'notice',
            },
            queryString: {
              hasTotalCount: false,
              searchType: 'ALL',
              withReplied: false,
              page: 1,
              pageSize: 5,
            },
          });
      },

      async checkFooterAboutDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.footerAbout);
        if (!dueData)
          await this.fetchDataWithCaching(shopby.api.manage.getTerms, this.dataKey.footerAbout, {
            queryString: {
              termsTypes: 'MALL_INTRODUCTION,ACCESS_GUIDE',
            },
          });
      },

      async checkSkinDataExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.skin);
        if (!dueData) {
          const bannerGroupCodes = shopby.config.skin.bannerGroupCodes.join(',');
          const skinCode = shopby.config.skin.skinCode;
          const request = {
            queryString: {
              bannerGroupCodes,
              skinCode,
            },
          };
          await this.fetchDataWithCaching(shopby.api.display.getSkinBanners, this.dataKey.skin, request);
        }
      },

      async checkOrderConfigExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.orderConfigs);
        if (!dueData) {
          await this.fetchDataWithCaching(shopby.api.order.getOrderConfigs, this.dataKey.orderConfigs);
        }
      },

      async checkPageScriptsExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.pageScripts);
        if (!dueData) {
          const request = {
            queryString: {
              pageTypes:
                'MAIN, COMMON_HEAD, COMMON_FOOTER, PRODUCT, PRODUCT_LIST, PRODUCT_SEARCH, DISPLAY_SECTION, CART, ORDER, ORDER_DETAIL, ORDER_COMPLETE, MEMBER_JOIN_COMPLETE',
            },
          };
          await this.fetchDataWithCaching(shopby.api.manage.getPageScripts, this.dataKey.pageScripts, request);
        }
      },

      async checkExternalScriptExpired() {
        const dueData = shopby.localStorage.getItemWithExpire(this.dataKey.externalScripts);
        if (!dueData) {
          await this.fetchDataWithCaching(shopby.api.workspace.getExternalScripts, this.dataKey.externalScripts);
        }
      },

      async checkProfileSession() {
        const dueData = shopby.sessionStorage.getItemWithExpire(this.dataKey.profile);
        if (!dueData) {
          const { data } = await shopby.api.member.getProfile();
          shopby.sessionStorage.setItemWithExpire(this.dataKey.profile, data);
        }
      },

      getMall() {
        return shopby.localStorage.getItem(this.dataKey.mall);
      },

      getMallsSSLSeal() {
        return shopby.localStorage.getItem(this.dataKey.mallSSLSeal);
      },

      getSkinGroup() {
        return shopby.localStorage.getItem(this.dataKey.skinGroup);
      },

      getCategories() {
        return shopby.localStorage.getItem(this.dataKey.categories);
      },

      getBoardsConfig() {
        return shopby.localStorage.getItem(this.dataKey.boardsConfig);
      },

      getFooterArticles() {
        return shopby.localStorage.getItem(this.dataKey.footerArticles);
      },

      getFooterAbout() {
        return shopby.localStorage.getItem(this.dataKey.footerAbout);
      },

      getSkin() {
        return shopby.localStorage.getItem(this.dataKey.skin);
      },

      getOrderConfigs() {
        return shopby.localStorage.getItem(this.dataKey.orderConfigs);
      },

      getPageScripts() {
        return shopby.localStorage.getItem(this.dataKey.pageScripts);
      },

      getExternalScripts() {
        return shopby.localStorage.getItem(this.dataKey.externalScripts);
      },

      setAccessToken(accessToken, expireSeconds) {
        shopby.localStorage.setItemWithExpire(shopby.cache.key.accessToken, accessToken, expireSeconds * 1000);
      },

      getAccessToken() {
        const accessToken = shopby.localStorage.getItemWithExpire(shopby.cache.key.accessToken);
        return accessToken ? accessToken : '';
      },

      removeAccessToken() {
        shopby.localStorage.removeItem(shopby.cache.key.accessToken);
        shopby.localStorage.removeItem(shopby.cache.key.member.oauthProvider);
        shopby.localStorage.removeItem(shopby.cache.key.member.oauthToken);
        shopby.sessionStorage.removeItem(shopby.cache.dataKey.profile);
      },

      setGuestToken(guestToken) {
        return shopby.localStorage.setItem(shopby.cache.key.guestToken, guestToken);
      },

      getGuestToken() {
        const guestToken = shopby.localStorage.getItem(shopby.cache.key.guestToken);
        return guestToken ? guestToken : '';
      },

      async getRecentProducts() {
        const cacheKey = shopby.cache.key.product.recent;
        const key = shopby.logined() ? cacheKey : `GUEST-${cacheKey}`;

        let products = shopby.localStorage.getItemWithExpire(key) || [];

        if (shopby.utils.isArrayEmpty(products)) {
          const { data } = await shopby.api.product.getProfileRecentProducts({ queryString: {} });
          shopby.localStorage.setItemWithExpire(key, data, 60 * 5 * 1000);
        }

        return products;
      },

      getRecentKeyword() {
        return shopby.localStorage.getItemWithExpire(shopby.cache.key.recentlyKeyword) || [];
      },

      setRecentKeyword(keyword) {
        const cacheKey = shopby.cache.key.recentlyKeyword;
        let recentKeywords = shopby.localStorage.getItemWithExpire(cacheKey) || [];
        if (recentKeywords.length > 0) {
          recentKeywords = recentKeywords.filter(item => item.word !== keyword);
        }
        recentKeywords.unshift({
          word: keyword,
          date: dayjs().format('YYYY-MM-DD'),
        });

        if (recentKeywords.length > 10) {
          recentKeywords = recentKeywords.filter((item, index) => index < 10);
        }
        shopby.localStorage.setItemWithExpire(cacheKey, recentKeywords, 24 * 60 * 60 * 1000); //하루
      },

      removeRecentKeyword(keyword) {
        const cacheKey = shopby.cache.key.recentlyKeyword;
        let recentKeywords = shopby.localStorage.getItemWithExpire(cacheKey) || [];
        recentKeywords = recentKeywords.filter(item => item.word !== keyword);
        shopby.localStorage.setItemWithExpire(cacheKey, recentKeywords, 24 * 60 * 60 * 1000); //하루
      },
    };
  })();
})();

/**
 * 전역 로직.
 */
(() => {
  const core = {
    mallName: null,
    GLOBAL_VARIABLE_NAME_SPACE: 'sb',

    async initiate(pageInitiate) {
      await this.setEnvironmentData();
      await this.setSkinGroup();
      await this.prepareGlobalData();
      this.setMall();
      if (pageInitiate) shopby.start.entries.push(pageInitiate);

      this.setMetaInfo();
      this.setGATC();
      shopby.setGlobalVariableBy = this.setGlobalVariableBy.bind(this);
      this.setDefaultGlobalVariable();
      this.appendExternalScript();

      this.renderGlobalPartials();
      this.startEntries();
      this.renderAfterInitiate();
    },

    async environmentInfo() {
      const urlInfo = {
        api: {
          alpha: 'https://alpha-shop-api.e-ncp.com',
          real: 'https://shop-api.e-ncp.com',
        },
        storage: {
          alpha: 'https://alpha-storage.e-ncp.com',
          real: 'https://storage.e-ncp.com',
        },
      };
      const result = await fetch('/environment.json');
      const { clientId, profile } = await result.json();
      return {
        clientId,
        profile,
        apiUrl: urlInfo.api[profile],
        storageApiUrl: urlInfo.api[profile],
      };
    },

    async setEnvironmentData() {
      const { clientId, profile, apiUrl, storageApiUrl } = await this.environmentInfo();

      shopby.config.skin.clientId = clientId;
      shopby.config.skin.profile = profile;

      shopby.config.apiUrl = apiUrl;
      shopby.config.storageApiUrl = storageApiUrl;
    },

    async setSkinGroup() {
      const isPreview = location.hostname.substring(0, 2) === 'p-';
      let skinGroup;
      if (isPreview) {
        const { data } = await shopby.api.display.getSkinBannersGroupsBySkin({
          queryString: { isPreview: true },
        });
        skinGroup = data;
      } else {
        await shopby.cache.checkSkinGroupDataExpired();
        skinGroup = shopby.cache.getSkinGroup();
      }
      shopby.config.skin.skinCode = skinGroup.skinCode;
      shopby.config.skin.platformType = skinGroup.platformType;
      shopby.config.skin.bannerGroups = skinGroup.bannerGroups;
      shopby.config.skin.appIcon = skinGroup.appIcon;
      for (const banner of skinGroup.bannerGroups) {
        shopby.config.skin.bannerGroupCodes.push(banner.groupCode);
      }
    },

    setMall() {
      const { mall } = shopby.cache.getMall();
      this.mallName = mall.mallName;
      shopby.config.skin.mallName = mall.mallName;
    },

    setTitle() {
      document.title = this.mallName;
    },

    setBasicInfo() {
      const names = ['author', 'description', 'keywords'];
      names.forEach(name => {
        $(`meta[name=${name}]`).prop('content', this.mallName);
      });
    },
    setOgInfo() {
      const image = new Image();
      image.src = '/assets/img/banner/header-logo.png';

      $("meta[property='og:title']").prop('content', this.mallName);
      $("meta[property='og:url']").prop('content', location.href);
      $("meta[property='og:image:width']").prop('content', image.width);
      $("meta[property='og:image:height']").prop('content', image.height);
    },
    setTwitterInfo() {
      $("meta[name='twitter:title']").prop('content', this.mallName);
    },
    setNaverWebMaster() {
      const naverWebMasterKey = shopby.cache.getMall().externalServiceConfig.naverWebmaster;
      $(document.head).prepend(`<meta name="naver-site-verification" content="${naverWebMasterKey}">`);
    },

    setMetaInfo() {
      this.setTitle();
      this.setBasicInfo();
      this.setOgInfo();
      this.setTwitterInfo();
      this.setNaverWebMaster();
    },

    setGATC() {
      const gtagId = shopby.cache.getMall().externalServiceConfig.googleAnalytics;
      const gtagScript = `
      <script async src='//www.googletagmanager.com/gtag/js?id=${gtagId}'></script>
      <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
    
      gtag('config', '${gtagId}');
    </script>
      `;
      $(document.head).append(gtagScript);
    },

    appendExternalScript() {
      const adminPageScripts = shopby.cache.getPageScripts() || []; // 어드민 설정 스크립트
      const externalScripts = shopby.cache.getExternalScripts() || []; // 외부 앱 스크립트
      const pageScripts = [...adminPageScripts, ...externalScripts];
      const commonHeadScripts = pageScripts.filter(
        ({ pageType, deviceType }) => pageType === 'COMMON_HEAD' && deviceType === 'MOBILE',
      );
      const commonFooterScripts = pageScripts.filter(
        ({ pageType, deviceType }) => pageType === 'COMMON_FOOTER' && deviceType === 'MOBILE',
      );

      commonHeadScripts.forEach(script => $(document.head).append(script.content));
      commonFooterScripts.forEach(script => $(document.body).append(script.content));
    },

    async prepareGlobalData() {
      const entries = [
        shopby.cache.checkMallDataExpired(),
        shopby.cache.checkMallSSLSealDataExpired(),
        shopby.cache.checkCategoriesDataExpired(),
        shopby.cache.checkSkinDataExpired(),
        shopby.cache.checkBoardsConfigDataExpired(),
        shopby.cache.checkOrderConfigExpired(),
        shopby.cache.checkPageScriptsExpired(),
        shopby.cache.checkExternalScriptExpired(),
      ];

      if (shopby.logined()) {
        entries.push(shopby.cache.checkProfileSession());
      }

      await Promise.all(entries);
    },

    renderGlobalPartials() {
      $('#header').load('/components/header.html');
      $('#footer').load('/components/footer.html');
    },

    startEntries() {
      shopby.start.entries.forEach(initiate => initiate());
    },

    renderAfterInitiate() {
      this.setGoBackButton();
      this.redirectIntro();
    },

    setGlobalVariableNamespace() {
      window[this.GLOBAL_VARIABLE_NAME_SPACE] = window[this.GLOBAL_VARIABLE_NAME_SPACE] || {};
    },

    setDefaultGlobalVariable() {
      this.setGlobalVariableNamespace();
      window[this.GLOBAL_VARIABLE_NAME_SPACE]['getPlatform'] =
        window[this.GLOBAL_VARIABLE_NAME_SPACE]['getPlatform'] || shopby.utils.getPlatform;
      window[this.GLOBAL_VARIABLE_NAME_SPACE]['profile'] = shopby.sessionStorage.getItem(shopby.cache.dataKey.profile);
    },

    /**
     * @param {'MAIN'|'PRODUCT'|'PRODUCT_SEARCH'|'PRODUCT_LIST'|'DISPLAY_SECTION'|'CART'|'ORDER'|'ORDER_COMPLETE'|'ORDER_DETAIL'} key
     * @param {object} payload
     */
    setGlobalVariableBy(key, payload = null) {
      const pageVariableNameMap = {
        MAIN: 'main',
        PRODUCT: 'product',
        PRODUCT_SEARCH: 'searchedProduct',
        PRODUCT_LIST: 'searchedProduct',
        DISPLAY_SECTION: 'displaySection',
        CART: 'cart',
        ORDER: 'orderSheet',
        ORDER_COMPLETE: 'order',
        ORDER_DETAIL: 'order',
        MEMBER_JOIN_COMPLETE: null,
      };

      this.setGlobalVariableNamespace();
      window[this.GLOBAL_VARIABLE_NAME_SPACE][pageVariableNameMap[key]] =
        payload instanceof Object ? JSON.parse(JSON.stringify(payload)) : payload;

      this.appendExternalGlobalVariableScripts(key);
    },

    appendExternalGlobalVariableScripts(key) {
      const scriptsHTMLTemplate = this.getExternalGlobalVariableScripts(key)
        .map(({ content }) => content)
        .join('');

      if (scriptsHTMLTemplate) $(document.body).append(scriptsHTMLTemplate);
    },

    getExternalGlobalVariableScripts(key) {
      const adminPageScripts = shopby.cache.getPageScripts();
      const externalScripts = shopby.cache.getExternalScripts();

      const platform = 'MOBILE';
      return [...adminPageScripts, ...externalScripts].filter(
        ({ pageType, deviceType }) => pageType === key && deviceType === platform,
      );
    },

    setGoBackButton() {
      const anchor = document.getElementById('goBack');

      if (!anchor) return;

      const referrer = document.referrer;
      const noReferrer = !referrer;

      if (noReferrer) {
        anchor.remove();
        return;
      }

      anchor.classList.add('all_page_prev');

      $('#goBack').on('click', () => history.back());
      //BFCache( Back-Foward-Cache )
      window.onpageshow = event => {
        //back 이벤트 일 경우
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
          core.initiate();
          location.reload();
        }
      };
    },

    async redirectIntro() {
      const _introType = shopby.utils.getUrlParam('introType', null);
      const introType = _introType ? _introType : shopby.cache.getMall().mall.introRedirection[shopby.platform];
      const isIntroPage = location.pathname.includes('/intro') || location.pathname.includes('/callback');
      const except = ['/join', '/login/login', '/find'];
      const accessExceptPath = shopby.localStorage.getItem(shopby.cache.key.accessNotIntroPath) || false;
      const hasExceptPath = except.some(url => location.pathname.includes(url));
      const mustGoHome = (isIntroPage && accessExceptPath) || (hasExceptPath && shopby.logined());
      const mustGoLogin =
        location.pathname.includes('/my') &&
        location.pathname !== '/pages/my/order.html' &&
        location.pathname !== '/pages/my/order-claim.html' &&
        !shopby.logined();

      if (introType === 'NONE') {
        shopby.localStorage.removeItem(shopby.cache.key.accessNotIntroPath);
      }
      if (mustGoLogin) {
        if (introType === 'NONE') {
          shopby.goLogin();
          shopby.utils.hideAllContents();
        }
        return;
      }

      if (mustGoHome) {
        if (introType === 'NONE') {
          shopby.goHome();
        }
        return;
      }
      if (hasExceptPath) return;

      if (introType === 'NO_ACCESS' && !isIntroPage) {
        location.href = '/pages/intro/no-access.html';
      }

      if (introType === 'ONLY_MEMBER' && !shopby.logined() && !isIntroPage) {
        shopby.localStorage.setItem(shopby.cache.key.accessNotIntroPath, true);
        location.href = '/pages/intro/member-only.html';
      }

      if (introType === 'ONLY_ADULT') {
        shopby.localStorage.setItem(shopby.cache.key.accessNotIntroPath, true);
        if (!shopby.logined() && !isIntroPage) {
          location.href = '/pages/intro/adult-certification.html';
          return;
        }
        if (!shopby.logined()) return;
        const memberInfo = await shopby.api.member.getProfile();
        const adultCertificatedYmdt = dayjs(memberInfo.data.adultCertificatedYmdt);
        const today = dayjs();
        const overdue = today.diff(adultCertificatedYmdt, 'year', true) > 1;
        const allCertificated = memberInfo && memberInfo.data && memberInfo.data.adultCertificated && !overdue;
        if (allCertificated && isIntroPage) {
          shopby.goHome();
        } else if (!allCertificated && !isIntroPage) {
          location.href = '/pages/intro/adult-certification.html';
        }
        shopby.localStorage.removeItem(shopby.cache.key.accessNotIntroPath);
      }
    },
  };

  //BFCache( Back-Foward-Cache )
  window.onpageshow = event => {
    //back 이벤트 일 경우
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
      core.initiate();
    }
  };

  shopby.start.initiate = core.initiate.bind(core);

  const global = {
    initiate() {
      this.curtainBanner.initiate();
      this.layerPopup.initiate();
    },

    curtainBanner: {
      data: {
        content: null,
      },
      initiate() {
        this.setData();
        // if (this.data.content !== null) this.render();
      },
      setData() {
        this.data.content = '커튼 배너';
      },
      render() {
        const content = this.generateContent();
        $(document.body).prepend(content);
      },
      generateContent() {
        return `
          <dialog open class="top_area" style="position:relative;">
             ${this.data.content}
           </dialog>
          `;
      },
    },
    layerPopup: {
      data: {
        content: null,
      },
      initiate() {
        this.setData();
        // if (this.data.content !== null) this.render();
      },
      setData() {
        this.data.content = '레이어 팝업';
      },
      render() {
        const content = this.generateContent();
        $(document.body).append(content);
      },
      generateContent() {
        return `
          <dialog open class="sys_pop" style="left: auto; right: 20px; bottom: 20px; margin: 0"">
             ${this.data.content}
           </dialog>
          `;
      },
    },
  };

  shopby.start.entries.push(global.initiate.bind(global));
  console.log('%cSHOPBY', 'font-size:44px;color:#e63533;padding:2px 4px;border-radius:10px;background:#fff;');
  console.log('%c© NHN COMMERCE Corp. All rights reserved.', 'font-size:25px;');
  console.log(
    '%c이 기능은 개발자용으로 브라우저에서 제공되는 내용입니다. 개발용도 이외에 스크립트를 조작하거나 유출한다면 제재를 받을 수 있습니다.',
    'font-size:18px;',
  );
})();

/**
 * jQuery.fn 확장
 */
(() => {
  const compliedTemplates = [];

  /**
   * 원본 태그에는 반드시 id 속성 필수!
   * id가 아니라 selector 를 받아도 될듯함.
   * <p>나중에 로딩바를 보여주고 show 시점에 로딩바 제거 기능이 필요할수도..</p>
   *
   * @author Haekyu Cho
   * @param data
   */
  $.fn.render = function (data) {
    this.renderTemplateWithRawHtml(data, this.html());
    return this;
  };

  $.fn.renderTemplateWithRawHtml = function (data, html) {
    const id = this.attr('id');
    const templateId = this.attr('data-template-id'); // script text/x-handlebars-template 렌더시

    if (!compliedTemplates[id]) {
      compliedTemplates[id] = Handlebars.compile(templateId ? $(`#${templateId}`).html() : html);
    }

    templateId ? this.replaceWith(compliedTemplates[id](data)) : this.html(compliedTemplates[id](data)).show();

    this.removeClass('invisible').addClass('visible');
  };

  $.fn.enterKeyup = function (selector) {
    const callback = function (key) {
      if (key.code === 'Enter' || key.code === 'NumpadEnter') {
        this.click();
      }
    };

    $(selector).on('keyup', callback.bind(this));
  };

  $.fn.visualize = function () {
    this.removeClass('invisible').addClass('visible');
  };
})();

// @fixme: 나중에 옮기자!
(() => {
  // imageUrl[0] 용으로 사용중..
  // 확장하려면 haekyu.cho에게 문의하세요.
  // key가 first일 경우도 있어서 prefix를 두는것도 방법일듯함.
  Handlebars.registerHelper({
    getFirstImageWithDefault(array) {
      return shopby.utils.isArrayNotEmpty(array) ? array[0] : '//rlyfaazj0.toastcdn.net/no_img.png';
    },
    toCurrencyString(number = 0) {
      return shopby.utils.toCurrencyString(number);
    },
    hasParam(value, options) {
      return value ? options.fn(this) : options.inverse(this);
    },
    ifLogined: function (options) {
      if (shopby.logined()) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    ifGt(x, y, options) {
      return x > y ? options.fn(this) : options.inverse(this);
    },
    ifGe(x, y, options) {
      return x >= y ? options.fn(this) : options.inverse(this);
    },
    ifLt(x, y, options) {
      return x < y ? options.fn(this) : options.inverse(this);
    },
    ifLe(x, y, options) {
      return x <= y ? options.fn(this) : options.inverse(this);
    },
    ifEq(x, y, options) {
      return x === y ? options.fn(this) : options.inverse(this);
    },
    ifNe(x, y, options) {
      return x !== y ? options.fn(this) : options.inverse(this);
    },
    ifEqOne(a, x, y, options) {
      return a === x || a === y ? options.fn(this) : options.inverse(this);
    },
    ifEqOneOfThree(a, x, y, z, options) {
      return a === x || a === y || a === z ? options.fn(this) : options.inverse(this);
    },
    substring(value, start, end) {
      return value.substring(start, end);
    },
    increment(index) {
      return index + 1;
    },
    listIndex(index, pageNumber, pageSize) {
      return (pageNumber - 1) * pageSize + (index + 1);
    },
    ifHasDiscount(immediateDiscountAmt, additionDiscountAmt, options) {
      return immediateDiscountAmt + additionDiscountAmt > 0 ? options.fn(this) : options.inverse(this);
    },
    option(value, label, selectedValue, disabled) {
      const selectedProperty = value === selectedValue ? 'selected="selected"' : '';
      const disabledProperty = typeof disabled !== 'object' && disabled ? 'disabled' : '';
      return new Handlebars.SafeString(
        `<option value="${value}" ${disabledProperty} ${selectedProperty}>${label}</option>`,
      );
    },
    checked(value, checkedValue, actualValue = '') {
      const resultValue = actualValue && typeof actualValue === 'string' ? actualValue : value;
      return `value=${resultValue} ${checkedValue === value ? 'checked' : ''}`;
    },
    calculateSalePrice(salePrice, discountAmt) {
      return shopby.utils.toCurrencyString(salePrice - discountAmt);
    },
    sum(...nums) {
      return nums.filter(num => typeof num === 'number').reduce((a, b) => a + b);
    },
    /*
     * new : 등록시간(registerYmdt)이 24시간 이내인 경우
     * hot : 조회 수(viewCount)가 100 이상인 경우
     *
     * @author BoMee Yoon
     * @param className : 'new' | 'hot'
     * @param conditionInfo : 'registerYmdt' | 'viewCount'
     * */
    badge(className, conditionInfo) {
      let text = '';
      let needsTag = false;
      switch (className) {
        case 'new':
          needsTag = dayjs().diff(conditionInfo, 'hour') <= 24;
          text = 'N';
          break;
        case 'hot':
          needsTag = conditionInfo >= 100;
          text = 'HOT';
          break;
        default:
          break;
      }
      return needsTag ? new Handlebars.SafeString(`<span class="badge ${className}">${text}</span>`) : '';
    },
    img(url, width, height, title = '', className = '', style = '') {
      if (shopby.utils.isArrayNotEmpty(url)) {
        url = url[0];
      }
      let size = '';

      if (width !== undefined && typeof width !== 'number') {
        width = 0;
      }
      if (width) {
        size = `?${width}x${height}`;
        width = `width="${width}"`;
      }

      let escaped = Handlebars.escapeExpression(url);

      if (escaped.includes('http://')) {
        escaped = escaped.replace('http:', '');
      }

      return new Handlebars.SafeString(`<img src="${escaped}${size}" ${width} alt="${title}"
           title="${title}" class="${className}" style="${style}">`);
    },
    safeString(text) {
      return text ? new Handlebars.SafeString(text) : '';
    },
    getOptionNameAndValue(optionName, optionValue) {
      const separator = '|';
      const names = optionName.split(separator);
      const values = optionValue.split(separator);
      const totalCount = names.length;

      if (totalCount === 0) return '';

      return names.reduce((acc, curr, idx) => {
        const isLast = idx === totalCount - 1;
        return (acc += `${curr}: ${values[idx]}${isLast ? '' : ` ${separator} `}`);
      }, '');
    },
    //@todo getFirstImageWithDefault 랑 동일함. getFirstImageWithDefault사용되지 않고 있음. 추후 변경
    getFirstItem(array) {
      return shopby.utils.isArrayNotEmpty(array) ? array[0] : '';
    },

    setOrderStateValue(type) {
      return {
        DEPOSIT_WAIT: '입금대기',
        PAY_DONE: '결제완료',
        PRODUCT_PREPARE: '상품준비중',
        DELIVERY_PREPARE: '배송준비중',
        DELIVERY_ING: '배송중',
        DELIVERY_DONE: '배송완료',
        BUY_CONFIRM: '구매확정',
        CANCEL_DONE: '취소완료',
        RETURN_DONE: '반품완료',
        EXCHANGE_DONE: '교환완료',
        PAY_WAIT: '결제대기',
        PAY_CANCEL: '결제포기',
        PAY_FAIL: '결제실패',
        DELETE: '삭제',
        EXCHANGE_WAIT: '교환대기',
        REFUND_DONE: '환불완료',
        PRODUCT: '상품',
        DELIVERY: '배송',
        CANCEL: '취소',
        RETURN: '반품',
        EXCHANGE: '교환',
        REFUND: '환불',
        OTHER: '기타',
      }[type];
    },
    hasUserInfo: function (profile, options) {
      const hasRequiredInfo = () => {
        const _profile = profile || {};
        return _profile.memberName || _profile.email || _profile.mobileNo || _profile.sex || _profile.birthday;
      };
      return hasRequiredInfo() ? options.fn(this) : options.inverse(this);
    },

    setProductInquiryTypesValue(type) {
      return {
        PRODUCT: '상품',
        DELIVERY: '배송',
        CANCEL: '취소',
        RETURN: '반품',
        EXCHANGE: '교환',
        REFUND: '환불',
        OTHER: '기타',
      }[type];
    },

    arrayJoin: function (array, separator) {
      return array.join(separator);
    },
  });
})();

(() => {
  const child = [];

  const getChildPopup = name => {
    return new Promise(resolve => {
      if (child[name]) {
        resolve(child[name]);
        return;
      }
      $('#popups-area').append(
        $('<div />').load(`/components/popup/${name}.html`, () => {
          resolve(child[name]);
        }),
      );
    });
  };

  const close = function (status) {
    this.$el.remove();
    $('body').removeClass('popup-open');

    status = status || { state: 'close' };

    if (this.callback) {
      this.callback(status);
    }
  };

  const closeButtonEvent = function (event) {
    const actionType = $(event.currentTarget).data('action-type') || 'negative';
    const status = actionType === 'positive' ? { state: 'ok', result: true } : undefined;

    this.close(status);
  };

  /**
   * 반드시 팝업 공통으로 들어가야 하는 로직 & function & event 추가
   * - close 함수 추가
   * - 우상단 x, 확인, 취소 버튼 이벤트 추가
   *
   * @author Daejoong Son
   * @param instance 팝업 인스턴스
   */
  const addPopupFunc = instance => {
    // close 함수 추가
    instance.close = close.bind(instance);

    // 우상단 x, 확인, 취소 버튼 이벤트 추가
    instance.$el.on('click', '.btnClosePopup', closeButtonEvent.bind(instance));
  };

  /**
   * 팝업 생성자 등록
   * - 동적 로딩된 팝업 생성자를 등록
   * - 팝업 재호출시 다시 동적 로딩하지 않고 곧바로 팝업 생성자를 사용하기 위해
   *
   * @author Daejoong Son
   * @param name 팝업명 - 로드하려는 팝업 파일 이름 -> `/components/popup/${name}.html` 과 맞춘다
   * @param childPopup 등록하려는 팝업 생성자
   */
  shopby.registerPopupConstructor = (name, childPopup) => {
    if (!child[name]) {
      child[name] = childPopup;
    }
  };

  /**
   * 팝업 호출
   * - 동적 로딩 & 인스턴스 생성
   *
   * @author Daejoong Son
   * @param name 팝업명 - 로드하려는 팝업 파일 이름 -> `/components/popup/${name}.html` 과 맞춘다
   * @param option 팝업에 전달될 옵션 데이터 - 각 팝업마다 필요한 데이터가 있으면 여기로 전달
   * @param callback 팝업에서 action 발생시 호출되는 callback 함수. 기본적으로 {state: '상태값'} 를
   *   전달하며 필요시 property 를 추가한다.
   */
  shopby.popup = async (name, option, callback) => {
    if (!name) {
      console.error('null popup name...');
      return;
    }

    const childPopup = await getChildPopup(name);
    if (!childPopup) {
      console.error('fail get popup class...');
      return;
    }

    const instance = new childPopup($('#popups-area'), option, callback);
    if (!instance) {
      console.error('fail create popup instance...');
      return;
    }

    addPopupFunc(instance);

    $('body').addClass('popup-open');
  };

  shopby.alert = (option, callback) => {
    option = option || {};

    if (!Object.prototype.hasOwnProperty.call(option, 'message')) {
      option = {
        message: option.message || option,
      };
    }

    shopby.popup('message', option, callback);
  };

  shopby.confirm = (option, callback) => {
    option = option || {};
    option.yesOrNo = true;
    shopby.popup('message', option, callback);
  };
})();

(() => {
  /**
   * @ReadMore
   *
   * @author JongKeun Kim
   * @render 인스턴스 생성 후 데이터 갱신될때 render 호출하면 됩니다.
   */
  class ReadMore {
    constructor(callback, selector, pageSize = 4) {
      this.callback = callback; // search logic
      this.selector = selector;
      this._pageNumber = 1;
      this.pageSize = pageSize;
      this.totalPage = 0;
      this.bindEvents();
    }

    get pageNumber() {
      return this._pageNumber;
    }

    set pageNumber(number) {
      this._pageNumber = number;
    }

    canLoad(totalCount) {
      return this._pageNumber * this.pageSize < totalCount;
    }

    render(totalCount = 0) {
      this.canLoad(totalCount) ? $(this.selector).html(this.template) : $(this.selector).html('');
      this.totalPage = this.getTotalPage();
    }

    getTotalPage() {
      return Math.ceil(this.totalCount / this.pageSize) || 1;
    }

    bindEvents() {
      const throttleMore = shopby.utils.throttle(this.load.bind(this), 500);
      $(document.body).on('click', this.selector, throttleMore);
    }

    unBindEvents() {
      $(document.body).off('click', this.selector);
    }

    load() {
      this._pageNumber += 1;
      this.callback();
    }

    get template() {
      return '<div class="btn_goods_down_more"><button id=`${this.selector.replace("#","")}` class="more_btn">더보기</button></div>';
    }
  }

  shopby.readMore = ReadMore;
})();

$(() => {
  class DateSelector {
    constructor(selector, searchCallBack, start = this.start, end = this.end, rangeKeyword = this.rangeKeyword) {
      this.$parent = $(selector);
      this.callback = searchCallBack;

      const isDefault = !(this.start || this.end || this.rangeKeyword);
      if (isDefault) {
        this.dateQueryInit(shopby.date.beforeToday(7), shopby.date.today(), 'week');
      } else {
        this.dateQueryInit(start, end, rangeKeyword);
      }

      this.render();
      this.bindEvents();
    }

    get start() {
      return shopby.utils.getUrlParam('startYmd');
    }

    get end() {
      return shopby.utils.getUrlParam('endYmd');
    }

    get rangeKeyword() {
      return shopby.utils.getUrlParam('rangeKeyword');
    }

    get DATE_BUTTONS() {
      return {
        day: {
          label: '오늘',
          value: '0',
          unit: 'day',
        },
        week: {
          label: '7일',
          value: '-7',
          unit: 'day',
        },
        day15: {
          label: '15일',
          value: '-15',
          unit: 'day',
        },
        month: {
          label: '1개월',
          value: '-1',
          unit: 'month',
        },
        month3: {
          label: '3개월',
          value: '-3',
          unit: 'month',
        },
        year: {
          label: '1년',
          value: '-1',
          unit: 'year',
        },
      };
    }

    setStart(startYmd) {
      shopby.utils.replaceState({ startYmd });
    }

    setEnd(endYmd) {
      shopby.utils.replaceState({ endYmd });
    }

    setRangeKeyword(rangeKeyword) {
      shopby.utils.replaceState({ rangeKeyword });
    }

    removeRangeKeyword() {
      const query = shopby.utils.getUrlParams();
      delete query.rangeKeyword;

      shopby.utils.replaceState(query);
    }

    dateQueryInit(startYmd, endYmd, rangeKeyword = null) {
      this.setStart(startYmd);
      this.setEnd(endYmd);
      if (rangeKeyword) this.setRangeKeyword(rangeKeyword);
    }

    render() {
      const el = this.createSelectOption();
      this.$parent.append(el);
      this.$parent.addClass('visible');
    }

    getClaimOrderRequestType() {
      const claimOrderRequestType = this.$parent.find('.claim-category').val();

      return claimOrderRequestType
        ? claimOrderRequestType
        : 'CANCEL_DONE,CANCEL_PROCESSING,RETURN_DONE,RETURN_PROCESSING,EXCHANGE_DONE,EXCHANGE_PROCESSING';
    }

    createSelectOption() {
      const container = document.createElement('div');
      const select = document.createElement('select');

      if (location.href.includes('claims.html')) {
        const selectClaimEl = document.createElement('select');
        const claimList = [
          {
            key: 'all',
            name: '전체',
            value: 'CANCEL_DONE,CANCEL_PROCESSING,RETURN_DONE,RETURN_PROCESSING,EXCHANGE_DONE,EXCHANGE_PROCESSING',
          },
          { key: 'cancel', name: '취소', value: 'CANCEL_DONE,CANCEL_PROCESSING' },
          { key: 'change', name: '교환', value: 'EXCHANGE_DONE,EXCHANGE_PROCESSING' },
          { key: 'return', name: '반품', value: 'RETURN_DONE,RETURN_PROCESSING' },
        ];
        const fragment = new DocumentFragment();

        container.appendChild(selectClaimEl);
        selectClaimEl.classList.add('claim-category');

        claimList.forEach(data => {
          const option = document.createElement('option');
          option.key = data.key;
          option.value = data.value;
          option.textContent = data.name;

          fragment.appendChild(option);
        });

        selectClaimEl.appendChild(fragment);
      }

      container.appendChild(select);
      container.classList.add('date_selector', 'inp_sel');
      select.classList.add('check_option_inner');

      Object.entries(this.DATE_BUTTONS)
        .map(([key, { label }]) => {
          const el = document.createElement('option');
          const textNode = document.createTextNode(label);

          el.value = key;
          if (key === this.rangeKeyword) el.setAttribute('selected', 'selected');
          el.appendChild(textNode);

          return el;
        })
        .forEach(el => select.appendChild(el));

      return container;
    }

    bindEvents() {
      this.$parent.on('change', 'select', this.onChangeSelect.bind(this));
    }

    onChangeSelect(e) {
      const $el = $(e.target);

      if (!$el.hasClass('claim-category')) {
        this.setRangeKeyword($el.val());
        this.setDateWithKeyword($el.val());
      }

      this.callback();
    }

    setDateWithKeyword(rangeKeyword) {
      const { value, unit } = this.DATE_BUTTONS[rangeKeyword];

      this.setStart(dayjs(this.end).add(value, unit).format('YYYY-MM-DD'));
      this.setEnd(shopby.date.today());
    }
  }

  shopby.dateRange = DateSelector;
});

(() => {
  const _YYYYMMDD = 'YYYY-MM-DD';

  shopby.date = {
    today() {
      return dayjs().format(_YYYYMMDD);
    },
    beforeToday(day = 0) {
      return dayjs().subtract(day, 'day').format(_YYYYMMDD);
    },
    lastHalfYear() {
      return dayjs().subtract(6, 'month').format(_YYYYMMDD);
    },
    yesterday() {
      return dayjs().subtract(1, 'day').format(_YYYYMMDD);
    },
    lastWeek() {
      return dayjs().subtract(1, 'week').format(_YYYYMMDD);
    },
    lastYear() {
      return dayjs().subtract(1, 'year').format(_YYYYMMDD);
    },
    yymmdd(date) {
      return dayjs(date).format(_YYYYMMDD);
    },
    isBefore(comparisonYmd, asOfYmd) {
      return dayjs(asOfYmd).isBefore(dayjs(comparisonYmd).format(_YYYYMMDD));
    },
  };
})();

/**
 * 장바구니 데이터 헬퍼
 *
 * @author Daejoong Son
 */
(() => {
  let cartData = null;

  const defaultPrice = {
    buyAmt: 0,
    accumulationAmtWhenBuyConfirm: 0,
    standardAmt: 0,
    discountAmt: 0,
    totalDeliveryAmt: 0,
    totalPrePaidDeliveryAmt: 0,
    totalPayOnDeliveryAmt: 0,
    totalAmt: 0,
  };

  /**
   * 카트의 중복 옵션 체크
   *
   * @param cart
   * @param carts
   * @return {boolean|*}
   * @private
   */
  const _isDuplicateCart = (cart, carts) => {
    const itemOptionInputs = JSON.stringify(cart.option.optionInputs || []);

    return carts
      .filter(tempCart => cart !== tempCart)
      .some(tempCart => {
        if (cart.option.optionNo !== tempCart.option.optionNo) {
          return false;
        }

        const tempItemOptionInputs = JSON.stringify(tempCart.option.optionInputs || []);
        return itemOptionInputs === tempItemOptionInputs;
      });
  };

  /**
   * 구매제한 수량 관련
   *
   * @param cart
   * @returns {boolean}
   * @private
   */
  const _isLimitations = cart => {
    if (
      cart.product.minBuyCount > 0 ||
      cart.product.maxBuyCountInfo.maxBuyTimeCnt > 0 ||
      cart.product.maxBuyCountInfo.maxBuyPersonCnt > 0 ||
      cart.product.maxBuyCountInfo.maxBuyPeriodCnt > 0
    ) {
      return true;
    }
  };

  /**
   * get 카트 멀티 옵션 리스트 (=> {name, value}[])
   *
   * @param cart
   * @return {{name: T, value: *}[]}
   */
  const _getCartOptions = cart => {
    const optionValues = cart.option.optionValue.split('|');
    return cart.option.optionName
      .split('|')
      .map((optionName, index) => ({ name: optionName, value: optionValues[index] }));
  };

  /**
   * get 카트 할인가
   *
   * @param cart
   * @return {string}
   * @private
   */
  const _getCartDiscountHtml = cart => {
    const discount =
      cart.option.price.immediateDiscountAmt * cart.option.orderCnt + cart.option.price.additionalDiscountAmt;
    if (discount > 0) {
      return `-${shopby.utils.toCurrencyString(discount)}원`;
    }

    return '';
  };

  /**
   * get 카트 적립금
   * @param cart
   * @return {string}
   * @private
   */
  const _getCartAccumulationHtml = cart => {
    if (cart.option.accumulationAmtWhenBuyConfirm) {
      cart.accumulationAmtHtml = `${shopby.utils.toCurrencyString(cart.option.accumulationAmtWhenBuyConfirm)}${
        shopby.cache.getMall().accumulationConfig.accumulationUnit
      }`;
    }

    return cart.accumulationAmtHtml;
  };

  /**
   * get 카트 배송 정보
   * @param cart
   * @return {string}
   * @private
   */
  const _getCartDeliveryHtml = cart => {
    let deliveryHtml = '-';

    if (cart.product.deliverable && cart.valid) {
      if (cart.delivery.deliveryAmt > 0) {
        deliveryHtml = `${shopby.utils.toCurrencyString(cart.delivery.deliveryAmt)}원`;

        const isPayOnDelivery = cart.delivery.deliveryPayType === 'PAY_ON_DELIVERY';
        deliveryHtml += isPayOnDelivery ? '(착불)' : '<br/>(선결제)';
      } else {
        deliveryHtml = '무료';
      }
    }

    return deliveryHtml;
  };

  /**
   * 장바구니 데이터 컨버팅
   * - price 정보는 그대로 리턴
   * - 장바구니 리스트 데이터 컨버팅 (deliveryGroups + invalidProducts 조합 & 재배치)
   * --- api 호출시 deliveryGroup - product - option 기준으로 3-depth 배열로 데이터가 내려옴 (+
   * invalid 옵션들)
   * --- 렌더링이 쉽도록 옵션 기준으로 1-depth 배열로 만들며 상품정보, 배송정보 등을 추가
   * --- valid 가 false 인 옵션은 delivery, deliveryNo 정보가 없음
   *
   * - 자세한 내용은 GET /cart 문서 참조
   *
   * @author Daejoong Son
   * @return list - [{deliveryNo, valid, delivery, product, option}]
   * @return price - {...}
   */
  const _convertCarts = data => {
    let list = [];

    if (data) {
      const deliveryGroups = data.deliveryGroups || [];
      const invalidProducts = data.invalidProducts || [];

      let deliveryNo = -1;

      list = deliveryGroups
        .flatMap(delivery =>
          delivery.orderProducts
            .flatMap(product =>
              product.orderProductOptions.map(option => ({
                deliveryNo,
                valid: true,
                delivery,
                product,
                option,
              })),
            )
            // 퓨어 데이터 부분과 렌더링 데이터 설정하는 부분을 분리하고 싶었는데, deliveryRowSpan 은 여기서 계산하기가 편해서...
            .map((cart, index, carts) => {
              cart.deliveryRowSpan = index === 0 ? carts.length : 0;
              return cart;
            }),
        )
        .concat(
          invalidProducts.flatMap(product =>
            product.orderProductOptions.map(option => ({
              valid: false,
              product,
              option,
              deliveryRowSpan: 1,
            })),
          ),
        )
        .map((cart, index, carts) => {
          // 구매수량 제한 추가
          cart.isLimitations = _isLimitations(cart);

          // 중복 여부 추가
          cart.isDuplicateCart = _isDuplicateCart(cart, carts);

          // 옵션 리스트 추가
          cart.option.options = _getCartOptions(cart);

          // 가격
          cart.priceHtml = `${shopby.utils.toCurrencyString(cart.option.price.standardAmt)}원`;

          // 할인가
          cart.discountHtml = _getCartDiscountHtml(cart);

          // 적립금
          cart.accumulationAmtHtml = _getCartAccumulationHtml(cart);

          // 최종 금액
          cart.totalPriceHtml = `${shopby.utils.toCurrencyString(cart.option.price.buyAmt)}원`;

          // 배송지 정보
          cart.deliveryHtml = _getCartDeliveryHtml(cart);

          return cart;
        });
    }

    return list;
  };

  shopby.helper.cart = {
    /**
     * 장바구니 데이터 가져오기
     * - GET /cart api 호출
     * - 장바구니 리스트 데이터 컨버팅 (convertCartList 호출)
     * - Promise 로 동작 - getCartData().then(cartData => {...})
     *
     * @author Daejoong Son
     */
    async getCartData(isRefresh = false) {
      if (cartData && !isRefresh) {
        return cartData;
      }

      let data = null;

      if (shopby.logined()) {
        // 회원 장바구니
        data = await shopby.api.order
          .getCart({ queryString: { divideInvalidProducts: true } })
          .then(response => response.data);
      } else {
        const guestCartList = shopby.localStorage.getItem(shopby.cache.key.cart.guestInfo) || [];

        // 비회원 장바구니
        if (guestCartList && guestCartList.length > 0) {
          data = await shopby.api.order
            .postGuestCart({
              queryString: { divideInvalidProducts: true },
              requestBody: guestCartList,
            })
            .then(response => response.data);
        }
      }

      // data 가 유효하면 converting
      if (data) {
        shopby.setGlobalVariableBy('CART', data);
        cartData = {
          list: _convertCarts(data),
          price: data.price,
        };
      } else {
        cartData = {
          list: [],
          price: null,
        };
      }

      return cartData;
    },

    /**
     * - 장바구니 추가
     *
     * TODO - 테스트 필요
     * TODO - items 확인 필요 - 기존 코드에 createCartData 호출하는 부분 참조하삼
     *
     * @param carts
     * @return {boolean}
     */
    async addCart(carts) {
      if (shopby.utils.isArrayEmpty(carts)) {
        return false;
      }

      let isSuccess = false;

      if (shopby.logined()) {
        isSuccess = await shopby.api.order
          .postCart({ requestBody: carts })
          .then(() => true)
          .catch(() => false);
      } else {
        let guestCartList = shopby.localStorage.getItem(shopby.cache.key.cart.guestInfo) || [];

        let lastCarNo = 0;
        if (!shopby.utils.isArrayEmpty(guestCartList)) {
          lastCarNo = Math.max(...guestCartList.map(cart => cart.cartNo)) + 1;
        }

        guestCartList = carts
          .reverse()
          .map(cart => {
            cart.cartNo = lastCarNo;
            lastCarNo += 1;
            return cart;
          })
          .reverse()
          .concat(guestCartList);

        shopby.localStorage.setItem(shopby.cache.key.cart.guestInfo, guestCartList);
        isSuccess = true;
      }

      return isSuccess;
    },

    /**
     * - 장바구니 추가
     *
     * TODO - 테스트 필요
     *
     * @param cartNos - [cartNo, ...]
     * @return {boolean}
     */
    async removeCarts(cartNos) {
      if (shopby.utils.isArrayEmpty(cartNos)) {
        return false;
      }

      let isSuccess = false;

      if (shopby.logined()) {
        isSuccess = await shopby.api.order
          .deleteCart({ queryString: { cartNo: cartNos.join(',') } })
          .then(() => true)
          .catch(() => false);
      } else {
        let guestCartList = shopby.localStorage.getItem(shopby.cache.key.cart.guestInfo);
        guestCartList = guestCartList.filter(cart => !cartNos.some(cartNo => cartNo === cart.cartNo));

        shopby.localStorage.setItem(shopby.cache.key.cart.guestInfo, guestCartList);
        isSuccess = true;
      }

      return isSuccess;
    },

    async getCartsCalculate(cartNos) {
      if (shopby.utils.isArrayEmpty(cartNos)) {
        return defaultPrice;
      }

      if (shopby.logined()) {
        return await shopby.api.order
          .getCartCalculate({ queryString: { cartNo: cartNos.join(',') } })
          .then(response => response.data);
      } else {
        let guestCartList = shopby.localStorage.getItem(shopby.cache.key.cart.guestInfo) || [];
        guestCartList = guestCartList.filter(cart => cartNos.some(cartNo => cartNo === cart.cartNo));

        return await shopby.api.order
          .postGuestCart({ requestBody: guestCartList })
          .then(response => response.data.price);
      }
    },

    /**
     * cartCount API가 10배 빠름 이걸 사용..
     *
     * @author Haekyu Cho
     */
    async getCartCount(isChangeCartCount = false) {
      if (shopby.logined()) {
        let count = shopby.localStorage.getItemWithExpire(shopby.cache.key.cart.count);

        if (isChangeCartCount || !count) {
          count = await shopby.api.order.getCartCount().then(({ data }) => data.count);
          shopby.localStorage.setItemWithExpire(shopby.cache.key.cart.count, count);
          return count;
        }

        if (Number.isInteger(count)) {
          return count;
        }
      }

      const guestInfo = shopby.localStorage.getItem(shopby.cache.key.cart.guestInfo);
      const guestCartList = guestInfo ? guestInfo : [];
      return guestCartList.length;
    },

    async updateCartCount(isChangeCartCount) {
      await this.getCartCount(isChangeCartCount);
      shopby.header.top.setData();
    },
  };
})();

(() => {
  class Timer {
    constructor(onTimerTicked, onTimerEnded, onTimerCleared) {
      this.onTimerTicked = onTimerTicked;
      this.onTimerEnded = onTimerEnded;
      this.onTimerCleared = onTimerCleared;
      this.count = 0;
      this.timer = null;
      this.isRunning = false;
    }
    startTimer() {
      let minutes = null;
      let seconds = null;
      this.timer = setInterval(() => {
        minutes = parseInt(this.count / 60, 10);
        seconds = parseInt(this.count % 60, 10);

        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        this.count -= 1;
        // 타이머 끝
        if (this.count < 1) {
          clearInterval(this.timer);
          this.onTimerEnded && this.onTimerEnded();
          this.isRunning = false;
        } else {
          this.onTimerTicked && this.onTimerTicked(minutes + ':' + seconds);
        }
      }, 1000);
      this.isRunning = true;
    }
    start(count) {
      this.count = count;
      if (!this.isRunning) {
        this.startTimer();
      } else {
        clearInterval(this.timer);
        this.startTimer();
      }
    }
    clear() {
      if (this.isRunning) {
        clearInterval(this.timer);
        this.onTimerCleared && this.onTimerCleared();
      }
    }
  }

  shopby.helper.timer = Timer;
})();

/*
 * 옵션 헬퍼 (메인, 상품상세, 장바구니)
 * @param optionInfo: {}, required - shopby.api.product.getProductsProductNoOptions 리턴된 값
 * @param reservationData: {}, 상품의 reservationData
 * @param selectedOptionNo: number, optional - 선택된 옵션(옵션 번호를 갖고 있는 최종) 초기값 세팅을 위한
 * @param textOptions: { inputLabel: '', inputValue: '', required: boolean }[], optional - 텍스트옵션 초기값 세팅을 위한 값
 * @return new Option()
 * 옵션셀렉터, 텍스트 옵션, 선택된 옵션등의 데이터를 변경하기 위해서는 new Option() 에 있는 changeSomething 메소드를 사용해주세요.
 *
 * @author Bomee Yoon
 * */
(() => {
  shopby.helper.option = (optionInfo, reservationData, selectedOptionNo, textOptions) => {
    const selectOption = new SelectOption(optionInfo, selectedOptionNo, reservationData);
    const textOption = new TextOption(optionInfo, textOptions);
    return new Option(selectOption, textOption, new SelectedOption(reservationData, selectOption));
  };

  class Option {
    constructor(option, textOption, selectedOption) {
      this.option = option;
      this.textOption = textOption;
      this.selectedOption = selectedOption;

      this._addSelectedOption(true);
    }
    get options() {
      // 옵션셀렉터를 위한 데이터
      return this.option.options;
    }
    get textOptions() {
      // 선택된 옵션의 텍스트옵션 데이터
      return this.textOption.options;
    }
    get selectedOptions() {
      // 최종 선택된 옵션 데이터
      return this.selectedOption.options;
    }
    get totalPrice() {
      // 최종 선택된 옵션가
      return this.selectedOption.totalPrice;
    }
    /*
     * @param isChangeType
     * true : 선택된 옵션으로 변경되는 형식 (예: 장바구니) - selectedOptions 조회 시 마지막 옵션까지 선택하지 않으면 [] 을 반환
     * false: 마지막 옵션까지 선택했을 때, 선택된 옵션이 추가되는 형식 (예: 상품상세) - selectedOptions 조회 시 마지막 옵션까지 선택하지 않으면 이전에 선택된 값들만 반환
     * */
    changeSelectOption(selectedDepth, selectedIndex, isChangeType = false) {
      // 옵션셀렉터 변경 시 사용
      this.option.changeSelectOption(selectedDepth, selectedIndex);
      isChangeType ? this._changeSelectedOption() : this._addSelectedOption();
    }
    resetSelectOption() {
      this.option.resetSelectOption();
    }
    changeTextOption(inputMatchingType, targetOptionNo, targetInputNo, value, amountIndex) {
      // 선택된 옵션의 텍스트 옵션 변경 시 사용
      this.textOption.changeTextOptionByProduct(inputMatchingType, targetInputNo, value);
      this.selectedOption.changeTextOptionByOptionOrAmount(
        inputMatchingType,
        targetInputNo,
        value,
        targetOptionNo,
        amountIndex,
      );
    }
    changeOrderCount(type, optionNo, customOrderCount) {
      // 선택된 옵션의 주문수량 변경 시 사용
      this.selectedOption.changeOrderCount(type, optionNo, customOrderCount);
    }
    drawAmountTextOption(optionNo, textInputNo, orderCnt) {
      // 선택된 옵션의 옵션별/수량별 텍스트 옵션
      this.selectedOption.drawAmountTextOption(optionNo, textInputNo, orderCnt);
    }
    deleteSelectedOption(targetOptionNo) {
      // 선택된 옵션 삭제 시 사용
      this.selectedOption.deleteSelectedOption(targetOptionNo);
    }
    validate() {
      validateOption(this.selectedOption.options, this.textOption.options);
    }
    _changeSelectedOption() {
      const selectedOptionInfo = this.option.selectedOptionDetail;
      const newTextOption = this.textOption.addNewTextOption(selectedOptionInfo);
      this.selectedOption.changeSelectedOption(selectedOptionInfo, newTextOption, this.option.optionNo);
    }
    _addSelectedOption(isInit) {
      if (!this.option.optionNo) return;
      const selectedOptionInfo = this.option.selectedOptionDetail;
      const newTextOption = this.textOption.addNewTextOption(selectedOptionInfo, isInit);
      this.selectedOption.addSelectedOption(
        selectedOptionInfo,
        newTextOption,
        this.option.optionNo,
        this.option.selectedOptionsValues,
      );
    }
  }

  class SelectOption {
    constructor(optionInfo, selectedOptionNo, reservationData) {
      this._selectOptions = [];
      this._optionNo = 0;
      this._selectedOptionDetail = {};
      this._selectedOptionsValues = [];
      this._reservationData = reservationData;

      const { selectType, multiLevelOptions, labels, flatOptions, displayableStock } = optionInfo;
      this._originSelectOptions = selectType === 'MULTI' ? multiLevelOptions : flatOptions;
      this._labels = selectType === 'MULTI' ? labels : [flatOptions[0].label];
      this._lastDepth = selectType === 'MULTI' ? labels.length - 1 : 0;
      this._selectType = selectType;
      this._displayableStock = displayableStock;
      this._convertOptionInfo(flatOptions, selectedOptionNo, selectType);
    }
    get options() {
      return this._selectOptions;
    }
    get optionNo() {
      return this._optionNo;
    }
    get selectedOptionDetail() {
      return this._selectedOptionDetail;
    }
    get selectedOptionsValues() {
      return this._selectedOptionsValues;
    }
    get isPreSalePeriod() {
      return shopby.utils.isPreSalePeriod(this._reservationData);
    }
    changeSelectOption(selectedDepth, selectedIndex) {
      if (selectedIndex === 0) {
        throw new Error('옵션을 선택하세요.');
      }
      this._setSelectOptions(this._getSelectedValues(selectedDepth, selectedIndex));
      this._setSelectedOptionDetail(selectedDepth, selectedIndex);
    }
    resetSelectOption() {
      this._setSelectOptions(this._getSelectedValues(0, 0));
    }
    _getSelectedValues(selectedDepth, selectedIndex) {
      const getSelectedMultiOption = depth => this._selectOptions[depth];
      const mapSelectedValues = index => {
        if (selectedDepth < index) {
          return '';
        }

        if (selectedDepth === index) {
          return getSelectedMultiOption(selectedDepth).values[selectedIndex];
        }

        const cumulativeSelectOption = getSelectedMultiOption(index);
        const cumulativeSelectOptionIndex = cumulativeSelectOption.selectedIndex;

        return cumulativeSelectOption.values[cumulativeSelectOptionIndex];
      };

      return this._selectOptions.map((_, index) => mapSelectedValues(index));
    }
    _setSelectOptions(values) {
      this._selectOptions = [];
      getSelectOptions(
        this._originSelectOptions,
        this._labels,
        values,
        0,
        true,
        this._selectOptions,
        this._selectType,
        this._reservationData,
        this._displayableStock,
      );
    }
    _getSelectedOptionDetail(selectedDepth, selectedIndex, selectedOptionNo) {
      const automaticallySelectedLstDepthOption =
        this._selectOptions[this._lastDepth].selectedIndex > 0 &&
        this._selectOptions[this._lastDepth].details.length === 1;

      if (selectedOptionNo > 0) {
        return this._selectOptions[this._lastDepth].details.find(({ optionNo }) => optionNo === selectedOptionNo);
      }
      if (automaticallySelectedLstDepthOption && selectedIndex > 1) {
        return this._selectOptions[this._lastDepth].details[0];
      }
      return this._selectOptions[this._lastDepth].details[selectedIndex - 1];
    }
    _isSelectedLastOption(selectedOptionNo) {
      const { selectedIndex, details } = this._selectOptions[this._lastDepth];
      const isSelectedLastDepthOption = selectedIndex > 0;
      const automaticallySelectedLstDepthOption = isSelectedLastDepthOption && details.length === 1;
      return selectedOptionNo > 0 || isSelectedLastDepthOption || automaticallySelectedLstDepthOption;
    }
    _setSelectedOptionDetail(selectedDepth, selectedIndex, selectedOptionNo) {
      const selectedOptionValues = this._selectOptions.flatMap(options => {
        if (options.selectedIndex > 0) {
          return options.values[options.selectedIndex];
        }
      });

      //마지막 옵션
      if (this._isSelectedLastOption(selectedOptionNo)) {
        const selectedOptionDetail = this._getSelectedOptionDetail(selectedDepth, selectedIndex, selectedOptionNo);
        this._selectedOptionsValues = selectedOptionValues.join(' / ');
        this._selectedOptionDetail = selectedOptionDetail;
        this._optionNo = selectedOptionDetail.optionNo;
      } else {
        this._optionNo = 0;
      }
    }
    _convertOptionInfo(flatOptions, selectedOptionNo = null, selectType = null) {
      const selectedValues = getSelectedValues(flatOptions, selectedOptionNo, selectType);
      this._setSelectOptions(selectedValues);

      const needsInitialSelectedOptionDetail = flatOptions.length === 1 || selectedOptionNo > 0;
      const optionNo = selectedOptionNo || (flatOptions.length > 0 && flatOptions[0].optionNo);
      needsInitialSelectedOptionDetail && this._setSelectedOptionDetail(-1, -1, optionNo);
    }
  }

  class TextOption {
    constructor(optionInfo, initialTextOptions = []) {
      this._textOptions = [...optionInfo.inputs];
      this._setInitData(initialTextOptions);
    }
    get options() {
      return this._textOptions;
    }
    addNewTextOption(selectedOption, isInit) {
      const newTextOptions = [...this._textOptions].reduce((textOptions, textOption) => {
        const { inputMatchingType, value } = textOption;

        if (inputMatchingType === 'OPTION' || inputMatchingType === 'AMOUNT') {
          textOptions.push({
            ...textOption,
            value: isInit ? value : '',
            amountValues: [],
          });
        }
        return textOptions;
      }, []);
      return {
        ...selectedOption,
        textOptions: newTextOptions,
      };
    }
    changeTextOptionByProduct(inputMatchingType, targetInputNo, value) {
      if (inputMatchingType !== 'PRODUCT') return;
      this._textOptions = this._textOptions.map(option => {
        const { inputMatchingType, inputNo } = option;
        if (inputMatchingType === 'PRODUCT' && inputNo === targetInputNo) {
          option.value = value;
        }
        return { ...option };
      });
    }
    _setInitData(initialTextOptions) {
      if (initialTextOptions.length === 0) return;
      const found = inputLabel => this._textOptions.find(option => option.inputLabel === inputLabel);
      this._textOptions = initialTextOptions.map(option => {
        const initInputOption = found(option.inputLabel);
        return {
          inputNo: initInputOption.inputNo,
          inputLabel: initInputOption.inputLabel,
          inputMatchingType: initInputOption.inputMatchingType,
          required: initInputOption.required,
          value: option.inputValue,
        };
      });
    }
  }
  class SelectedOption {
    constructor(reservationData, option) {
      this._selectedOptions = [];
      this._reservationData = reservationData;
      this.option = option;
    }
    get options() {
      return this._selectedOptions;
    }
    get optionForCart() {
      return this._selectedOptions;
    }
    get totalPrice() {
      if (!this._selectedOptions.length) return 0;
      return this._selectedOptions.reduce((totalPrice, { priceWithOptions }) => {
        const currPrice = priceWithOptions ? priceWithOptions.replace(/,/g, '') : '';
        totalPrice += parseInt(currPrice, 10);
        return totalPrice;
      }, 0);
    }
    addSelectedOption(selectedOptionInfo, newTextOption, newOptionNo, selectedOptionsValues) {
      const HAS_ONLY_ONE_OPTION_CODE_NUMBER = -1;
      if (!selectedOptionInfo && newOptionNo === HAS_ONLY_ONE_OPTION_CODE_NUMBER) return;

      if (this._selectedOptions.some(({ optionNo }) => optionNo === selectedOptionInfo.optionNo)) {
        shopby.alert('이미 선택된 옵션입니다.');
        this.option.resetSelectOption();
      } else {
        this._selectedOptions.push(
          this._createNewSelectedOption(selectedOptionInfo, newTextOption, selectedOptionsValues),
        );
      }
    }
    changeSelectedOption(selectedOptionInfo, newTextOption, newOptionNo) {
      this._selectedOptions = newOptionNo > 0 ? [this._createNewSelectedOption(selectedOptionInfo, newTextOption)] : [];
    }
    changeOrderCount(action, optionNo, customOrderCount) {
      const isPreSalePeriod = shopby.utils.isPreSalePeriod(this._reservationData);
      const selectedOption = this._selectedOptions.find(({ optionNo: no }) => no === optionNo);
      const { orderCnt, stockCnt, reservationStockCnt } = selectedOption;
      const orderStockCnt = isPreSalePeriod ? reservationStockCnt : stockCnt;
      const { displayableStock } = this.option;
      switch (action) {
        case 'up':
          if (!displayableStock && orderCnt < 99999999) {
            // 수량 미노출일 경우 99999999까지 입력 가능
            selectedOption.orderCnt += 1;
          } else if (orderCnt < orderStockCnt) {
            selectedOption.orderCnt += 1;
          }
          break;
        case 'down':
          if (orderCnt > 1) {
            selectedOption.orderCnt -= 1;
          }
          break;
        default:
          if (customOrderCount <= 1) {
            selectedOption.orderCnt = 1;
            break;
          }
          if (displayableStock && customOrderCount > stockCnt) {
            selectedOption.orderCnt = stockCnt;
            break;
          } else if (!displayableStock && customOrderCount > 99999999) {
            // 수량 미노출일 경우 99999999를 초과하여 입력할 수 없다.
            selectedOption.orderCnt = 99999999;
            break;
          }
          selectedOption.orderCnt = customOrderCount;
          break;
      }

      selectedOption.priceWithOptions = this._getPriceWithOption(selectedOption);
    }
    //옵션 수량이 2개 이상일때 옵션별 텍스트옵션 <=> 수량별 텍스트옵션 입력가능
    drawAmountTextOption(optionNo, textInputNo, orderCnt) {
      const selectedOption = this._selectedOptions.find(({ optionNo: no }) => no === optionNo);
      const { textOptions } = selectedOption;
      textOptions.forEach(textOption => {
        if (textOption.inputNo !== textInputNo) return;
        if (orderCnt > 1 && !textOption.isRealAmountMode) {
          textOption.isRealAmountMode = true;
          //옵션별 수량과 텍스트 옵션 개수가 같을 때
          if (textOption.amountValues.length === orderCnt - 1) return;
          //옵션별 수량과 텍스트 옵션 수량이 다를 경우 초기화, 예. 옵션별 수량 변경된 경우
          textOption.amountValues = [];
          textOption.amountValues = Array(orderCnt - 1)
            .fill(null)
            // eslint-disable-next-line no-unused-vars
            .map(_ => ({ value: '' }));
        } else if (textOption.isRealAmountMode) {
          textOption.isRealAmountMode = false;
        }
      });
    }
    changeTextOptionByOptionOrAmount(inputMatchingType, targetInputNo, value, targetOptionNo, amountIndex) {
      if (targetOptionNo > 0) {
        switch (inputMatchingType) {
          case 'OPTION':
            this._selectedOptions
              .filter(({ optionNo }) => optionNo === targetOptionNo)
              .flatMap(({ textOptions }) => textOptions)
              .forEach(textOption => {
                if (textOption.inputNo === targetInputNo) {
                  textOption.value = value;
                }
              });
            break;
          case 'AMOUNT':
            this._selectedOptions
              .filter(({ optionNo }) => optionNo === targetOptionNo)
              .flatMap(({ textOptions }) => textOptions)
              .forEach(textOption => {
                if (textOption.inputNo === targetInputNo) {
                  textOption.amountValues[amountIndex].value = value;
                }
              });
            break;
          default:
            throw new Error('INVALID_TEXT_OPTION_MATCHING_TYPE');
        }
      }
    }
    deleteSelectedOption(targetOptionNo) {
      this._selectedOptions = this._selectedOptions.filter(({ optionNo }) => optionNo !== targetOptionNo);
    }
    _getPriceWithOption(selectedOption, orderCnt) {
      orderCnt = orderCnt >= 0 ? orderCnt : selectedOption.orderCnt;
      const priceWithOption = selectedOption.buyPrice * orderCnt;
      return shopby.utils.toCurrencyString(priceWithOption);
    }
    _createNewSelectedOption(selectedOption, newTextOption, selectedOptionsValues) {
      const orderCnt = 1;
      const priceWithOptions = this._getPriceWithOption(selectedOption, orderCnt);

      return {
        ...newTextOption,
        orderCnt,
        priceWithOptions,
        selectedOptionsValues,
      };
    }
  }
  const getStockLabel = (option, reservationData, displayStock) => {
    const { saleType, forcedSoldOut, stockCnt, reservationStockCnt } = option;
    //옵션 : 판매기간동안 판매재고 0 , 예약판매기간동안 예약재고 0
    if (saleType === 'SOLDOUT') {
      return {
        disabled: 'disabled',
        stockStatusLabel: '[품절]',
      };
    }
    if (forcedSoldOut) {
      return {
        disabled: 'disabled',
        stockStatusLabel: '[임시품절]',
      };
    }
    if (displayStock) {
      //예약기간동안 예약재고 노출
      if (shopby.utils.isPreSalePeriod(reservationData)) {
        return {
          disabled: '',
          stockStatusLabel: `재고 : ${reservationStockCnt}개`,
        };
      }
      return {
        disabled: '',
        stockStatusLabel: `재고 : ${stockCnt}개`,
      };
    } else {
      // 재고 미 노출
      return {
        disabled: '',
        stockStatusLabel: ``,
      };
    }
  };
  const getAddPriceLabel = option => {
    const { addPrice } = option;
    if (!addPrice) return '';
    return `(${addPrice > 0 ? '+' : ''}${shopby.utils.toCurrencyString(addPrice)} 원)`;
  };
  const getSelectedValues = (flatOptions, selectedOptionNo, selectType) => {
    if (selectedOptionNo === null) return [];

    const separator = '|';
    return flatOptions
      .filter(({ optionNo }) => optionNo === selectedOptionNo)
      .flatMap(({ value }) => (value.includes(separator) && selectType === 'MULTI' ? value.split(separator) : [value]));
  };
  const getSelectOptionMessage = (isSelectedPrevDepthOption, labels, depth) => {
    return isSelectedPrevDepthOption
      ? `${labels[depth]} 을(를) 선택해주세요.`
      : `${labels[depth - 1]} 을(를) 먼저 선택해주세요.`;
  };
  const getLabels = (option, reservationData, displayableStock) => {
    option.stockStatus = getStockLabel(option, reservationData, displayableStock);
    option.priceLabel = getAddPriceLabel(option);
    return option;
  };

  //마지막 옵션이 품절 또는 일시품절인 경우
  const isLastOptionSoldOut = option => {
    //마지막 뎁스 옵션인 경우
    if (!option.children) return option.forcedSoldOut || option.saleType === 'SOLDOUT';
    return option.children.every(child => isLastOptionSoldOut(child));
  };

  const createNextInitialSelectOption = (depth, label) => ({
    depth,
    label,
    values: [],
    optionValues: [],
    details: [],
    selectedIndex: 0,
  });
  const createNextSelectOptionInfo = (
    currentDepthData,
    isSelectedPrevDepthOption,
    depth,
    labels,
    selectedValues,
    selectType,
    reservationData,
    displayableStock,
  ) => {
    const lastOptionAllSoldOutStatus = currentDepthData.flatMap(data => isLastOptionSoldOut(data));
    const needsLastDepthCustomLabels = isSelectedPrevDepthOption && labels.length - 1 === depth;
    const hasOnlyOneOption = currentDepthData.length === 1;
    const nextDepth = depth + 1;

    const nextSelectOption = createNextInitialSelectOption(depth, labels[depth]);

    nextSelectOption.values.push(getSelectOptionMessage(isSelectedPrevDepthOption, labels, depth));

    nextSelectOption.optionValues.push({
      disabled: 'disabled',
      value: getSelectOptionMessage(isSelectedPrevDepthOption, labels, depth),
    });

    let nextDepthData = [];
    let isSelectedCurrentOption = false;

    currentDepthData.forEach(({ value, children, ...rest }, index) => {
      let label;

      if (needsLastDepthCustomLabels || selectType === 'FLAT') {
        const { priceLabel, stockStatus } = { ...getLabels({ ...rest }, reservationData, displayableStock) };
        label = `${priceLabel}${stockStatus.stockStatusLabel ? ' / ' + stockStatus.stockStatusLabel : ''}`;
        const customValue = `${value} ${label}`;
        const detail = {
          ...rest,
          disabled: stockStatus.disabled,
          value: `${value} | ${priceLabel}`,
        };

        nextSelectOption.values.push(customValue);
        nextSelectOption.details.push(detail);
        nextSelectOption.optionValues.push({
          ...detail,
          lastValue: `${value} / ${priceLabel}`,
          value: customValue,
        });
      } else {
        isSelectedPrevDepthOption && nextSelectOption.values.push(value);

        isSelectedPrevDepthOption &&
          nextSelectOption.optionValues.push({
            ...rest,
            disabled: lastOptionAllSoldOutStatus[index] ? 'disabled' : '',
            value: lastOptionAllSoldOutStatus[index] ? `${value} | [품절]` : value,
          });
      }

      const { forcedSoldOut, saleType } = { ...rest };
      const isSoldOut = forcedSoldOut || saleType === 'SOLDOUT';

      const selectedOptionValues = ((value, selectedValue) => {
        if (selectedValue) {
          return selectedValue.replace(label, '').trim() === value.trim();
        }
      })(value, selectedValues[depth]);

      const isSelectedCurrentValue = selectedOptionValues && isSelectedPrevDepthOption;
      if ((!isSoldOut && isSelectedCurrentValue) || hasOnlyOneOption) {
        nextSelectOption.selectedIndex = index + 1;
        isSelectedCurrentOption = true;
        nextDepthData = children;
      }
    });

    return {
      nextDepthData,
      nextSelectOption,
      nextDepth,
      isSelectedCurrentOption,
    };
  };

  const getSelectOptions = (
    currentDepthData,
    labels,
    selectedValues,
    depth,
    isSelectedPrevDepthOption,
    nextSelectOptions,
    selectType,
    reservationData,
    displayableStock,
  ) => {
    const isLastDepth = labels.length === depth;
    if (isLastDepth) return;

    const { nextDepthData, nextSelectOption, nextDepth, isSelectedCurrentOption } = createNextSelectOptionInfo(
      currentDepthData,
      isSelectedPrevDepthOption,
      depth,
      labels,
      selectedValues,
      selectType,
      reservationData,
      displayableStock,
    );

    nextSelectOptions.push(nextSelectOption);

    if (selectType === 'MULTI') {
      getSelectOptions(
        nextDepthData,
        labels,
        selectedValues,
        nextDepth,
        isSelectedCurrentOption,
        nextSelectOptions,
        selectType,
        reservationData,
        displayableStock,
      );
    }
  };
  const validateOption = (selectedOptions, textOptions) => {
    selectedOptions = selectedOptions || [];
    if (!selectedOptions.length) {
      throw new Error('옵션을 선택해주세요.');
    }

    const isEmptyRequiredTextOptionByProduct = textOptions
      .filter(({ inputMatchingType }) => inputMatchingType === 'PRODUCT')
      .filter(({ required }) => required)
      .some(({ value }) => !value);

    if (isEmptyRequiredTextOptionByProduct) {
      throw new Error('상품별 텍스트옵션(필수)을 입력해주세요.');
    }

    const isEmptyRequiredTextOptionByOption = selectedOptions
      .flatMap(({ textOptions }) => textOptions)
      .some(({ required, value }) => required && !value);

    if (isEmptyRequiredTextOptionByOption) {
      throw new Error('옵션별 텍스트옵션(필수)을 입력해주세요.');
    }
  };

  /*
   * 장바구니 담기 request body
   * */
  shopby.helper.option.requestBodyForCartOrOrder = (productNo, selectedOptions, textOptions, optionUsed = true) => {
    const textOptionsByProduct = convertTextOptionsBy(textOptions, 'PRODUCT');
    let selectedOptionsByAmountTextOptions = []; //수량별 텍스트 옵션이 있는 경우 그 개수만큼 담은 selectedOptions
    const optionNosWithAmountTextOptions = []; //selectedOptionsByAmountTextOptions에 담긴 옵션 번호들
    let beforeAmountTextOptionCount = selectedOptionsByAmountTextOptions.length; //이전에 담았던 수량별텍스트옵션개수 , textOptionsCombinationByAmount에 담기 위해 필요한 계산 변수

    //수량별텍스트옵션확인
    // selectedOptions 기존 옵션정보에서 수량별 텍스트 옵션있는지 확인하고 있으면 selectedOptionsByAmountTextOptions에 담기
    const checkAmountTextOptions = option => {
      beforeAmountTextOptionCount = selectedOptionsByAmountTextOptions.length;
      const textOptionByAmount = option.textOptions.find(textOption => textOption.isRealAmountMode);
      const textOptionCountByAmount = textOptionByAmount && textOptionByAmount.amountValues.length;

      if (!textOptionByAmount || textOptionCountByAmount <= 0) return;
      addSelectedOptionsByAmountTextOptions(option, textOptionCountByAmount);
    };

    //수량별 텍스트 옵션이 있는 옵션 담기
    const addSelectedOptionsByAmountTextOptions = (option, textOptionCountByAmount) => {
      selectedOptionsByAmountTextOptions = selectedOptionsByAmountTextOptions.concat(
        Array.from({ length: textOptionCountByAmount + 1 }, () => ({
          ...option,
        })),
      );
      optionNosWithAmountTextOptions.push(option.optionNo);
    };

    const getOptionInputs = textOptions => {
      return textOptionsByProduct.concat(convertTextOptionsBy(textOptions));
    };

    const getTextOptionsCombinationByAmount = (textOptionsByAmount, optionIndex) => {
      const textOptionNosByAmount = textOptionsByAmount.map(option => option.inputNo);
      const textOptionNoCountByAmount = [...new Set(textOptionNosByAmount)].length;
      const textOptionCombinationIndexByAmount =
        optionIndex - beforeAmountTextOptionCount < 0 ? optionIndex : optionIndex - beforeAmountTextOptionCount;
      const textOptionCountByAmountPerOptionNo = textOptionsByAmount.length / textOptionNoCountByAmount;
      //수량별 텍스트옵션이 여러개인 경우
      return Array.from(
        { length: textOptionNoCountByAmount },
        (_, i) => textOptionsByAmount[textOptionCountByAmountPerOptionNo * i + textOptionCombinationIndexByAmount],
      );
    };

    //수량별 텍스트옵션이 없는 경우 : optionInputs에 상품별 텍스트옵션, 옵션별 텍스트옵션만 담는다.
    const selectedOptionsWithoutAmountTextOptions = selectedOptions
      .map(option => {
        const { optionNo, orderCnt, textOptions } = option;
        checkAmountTextOptions(option);

        const textOptionsByOption = getOptionInputs(textOptions).filter(
          textOption => !textOption.isRealAmountMode && textOption.inputMatchingType === 'OPTION',
        );
        return {
          productNo,
          optionNo,
          orderCnt,
          channelType: null,
          optionInputs: [...textOptionsByProduct, ...textOptionsByOption],
          additionalProductNo: 0,
          optionUsed,
        };
      })
      .filter(({ optionNo }) => !optionNosWithAmountTextOptions.includes(optionNo));

    //수량별 텍스트 옵션이 있는 경우 :  optionInputs에 상품별 텍스트옵션, 옵션별 텍스트옵션, 수량별 텍스트옵션(각각 1개씩) 담는다.
    selectedOptionsByAmountTextOptions =
      selectedOptionsByAmountTextOptions &&
      selectedOptionsByAmountTextOptions.map((option, index) => {
        const { optionNo, textOptions } = option;
        const textOptionsByAmount = getOptionInputs(textOptions).filter(textOption => textOption.isRealAmountMode);
        const textOptionsByOption = getOptionInputs(textOptions).filter(
          textOption => !textOption.isRealAmountMode && textOption.inputMatchingType === 'OPTION',
        );

        const textOptionsCombinationByAmount = getTextOptionsCombinationByAmount(textOptionsByAmount, index);

        return {
          productNo,
          optionNo,
          orderCnt: 1, // 수량별이니까 하나씩
          channelType: null,
          optionInputs: [...textOptionsByProduct, ...textOptionsByOption, ...textOptionsCombinationByAmount],
          additionalProductNo: 0,
          optionUsed,
        };
      });

    return [...selectedOptionsWithoutAmountTextOptions, ...selectedOptionsByAmountTextOptions];
  };
  const convertTextOptionsBy = (textOptions, type) =>
    textOptions.reduce((acc, curr) => {
      const { value: inputValue, inputMatchingType, amountValues } = curr;
      if (!type || (type && inputMatchingType === type)) {
        acc.push({ ...curr, inputValue });
      }
      if (amountValues && amountValues.length > 0) {
        amountValues.forEach(amountValue => {
          acc.push({ ...curr, inputValue: amountValue.value });
        });
      }

      return acc;
    }, []);
})();

/**
 * 회원 관련 중복 로직 담아두는 헬퍼
 *
 * @author sohyun choi
 */
(() => {
  shopby.helper.member = {
    get termsTitle() {
      return {
        USE: [`${shopby.cache.getMall().mall.mallName} 이용약관`, true],
        PI_COLLECTION_AND_USE_REQUIRED: ['회원가입시 개인정보 수집/이용 약관', true],
        PI_COLLECTION_AND_USE_OPTIONAL: ['회원가입시 개인정보 수집/이용 약관', false],
        PI_PROCESS_CONSIGNMENT: ['개인정보 처리/위탁 약관', false],
        PI_THIRD_PARTY_PROVISION: ['개인정보 제3자 제공 약관', false],
        PI_SELLER_PROVISION: ['개인정보 판매자 제공', true],
      };
    },
    async getTerms(termsTitle) {
      const termsTypes = Object.keys(termsTitle).join(',');
      const { data: terms } = await shopby.api.manage.getTerms({ queryString: { termsTypes } });
      return terms;
    },
    async getAgreements(terms = null, termsTitle = null, checkedAgreements = null) {
      termsTitle = termsTitle ? termsTitle : this.termsTitle;
      terms = terms ? terms : await this.getTerms(termsTitle);
      checkedAgreements = checkedAgreements ? checkedAgreements : [];
      return Object.keys(terms)
        .filter(termKey => terms[termKey].used)
        .map(termKey => {
          const key = termKey.toUpperCase();
          const [label, required] = termsTitle[key];
          return { ...terms[termKey], label, required, key, checked: checkedAgreements.includes(key) };
        });
    },
    getKcpCallbackUrl() {
      return `${location.origin}/callback/kcp-auth-callback.html?returnUrl=${location.href}`;
    },
    get emailValue() {
      const email = $('input[name="email"]')
        .get()
        .map(target => $(target).val());
      return email.join('@');
    },
    getCurrentAuth(authType) {
      const authTypeMap = {
        email: { message: '이메일', value: this.emailValue, key: 'email', errorMessage: '이메일을 입력해주세요' },
        sms: {
          message: '휴대폰번호',
          value: $('input[name="mobileNo"]').val(),
          key: 'mobileNo',
          errorMessage: '휴대폰번호를 입력해주세요',
        },
      };
      return authTypeMap[authType];
    },
    changeSelectedBirth() {
      const selectedYear = $('select[name="birthYear"]').val();
      const selectedMonth = $('select[name="birthMonth"]').val();
      const selectedDay = $('select[name="birthDay"]').val();
      const $birthWarning = $('.member_birthday').find('.warning_message');

      const existSelected = selectedYear !== '0' || selectedMonth !== '0' || selectedDay !== '0';
      const notSelected = selectedYear === '0' || selectedMonth === '0' || selectedDay === '0';
      if (existSelected && notSelected) {
        $birthWarning.text(shopby.message.requiredBirthday).show();
        return false;
      }
      const selectedBirthday = dayjs(new Date(selectedYear, selectedMonth, selectedDay));
      const today = dayjs();
      if (today.diff(selectedBirthday, 'year', true) < 14) {
        $birthWarning.text(shopby.message.invalidAge).show();
        return false;
      }
      $birthWarning.hide();
      return true;
    },
    checkValidInput(inputWaringMessage) {
      for (let i = 0; i < inputWaringMessage.length; i = i + 1) {
        const usable = $(inputWaringMessage[i]).data('usable');
        const isValidInput = usable !== false;
        if (!isValidInput) return false;
      }
      return true;
    },
    submitValidation() {
      const $requires = $('input[class="require"]');
      const noRequireInput = $requires.toArray().some(el => $(el).val().length < 1 && $(el).is(':visible'));
      if (noRequireInput) {
        throw new Error('필수 입력 사항을 확인 바랍니다.');
      }

      const emailSend = !$('input[name="email"]').prop('disabled') && $('.btn_send_email').length > 0;
      if (emailSend) {
        throw new Error('이메일 인증을 진행해주세요.');
      }

      const mobileNo = $('input[name="mobileNo"]');
      const smsSend = $('.btn_send_sms').length > 0 && !mobileNo.prop('disabled');
      const certify = $('.btn_certification').length > 0 && !mobileNo.prop('disabled');
      if (smsSend || certify) {
        throw new Error('휴대폰 번호인증을 진행해주세요.');
      }

      const noAllAddressInput =
        $('input[name="address"]').val().length > 0 && $('input[name="detailAddress"]').val().trim().length === 0;
      if (noAllAddressInput) {
        throw new Error('상세주소를 입력해주세요.');
      }
      if (!this.changeSelectedBirth()) {
        throw new Error(shopby.message.invalidBirthday);
      }
    },
    /**
     * @return {'withDrawn'|'existId'|'invalidId'|'successId'}
     */
    async userIdValidation(userId) {
      if (userId.length < 5) {
        return 'lessLengthId';
      }

      const { data: memberIdStatus } = await shopby.api.member.getProfileIdExists({
        queryString: { memberId: userId },
      });
      if (memberIdStatus.exist) {
        return memberIdStatus.status === 'WITHDRAWN' ? 'withDrawn' : 'existId';
      }

      const atCount = (userId.match(shopby.regex.at) || []).length;
      if (shopby.regex.userid.test(userId) || atCount > 1) {
        return 'invalidId';
      }
      return 'successId';
    },
    /**
     * @return {'invalidPasswordSpecial'|'invalidPassword'|'lessInvalidPassword'|''}
     */
    passwordValidation(password) {
      if (password.length < 8 || password.length > 20) {
        return 'invalidPassword';
      }
      const patternNumber = shopby.regex.number;
      const patternEnglish = shopby.regex.eng;
      const patternSpecial = shopby.regex.passwordSpecial;

      const checkNumber = patternNumber.test(password) ? 1 : 0;
      const checkEnglish = patternEnglish.test(password) ? 1 : 0;
      const checkSpecial = patternSpecial.test(password) ? 1 : 0;
      const checkSum = checkNumber + checkEnglish + checkSpecial;

      const filteringPassword = password
        .replace(patternNumber, '')
        .replace(patternEnglish, '')
        .replace(patternSpecial, '');

      if (filteringPassword.length > 0) {
        return 'invalidPasswordSpecial';
      }
      if (password.length < 10 && checkSum < 3) {
        return 'invalidPassword';
      } else if (checkSum < 2) {
        return 'lessInvalidPassword';
      }
      return '';
    },
    /**
     * @return {'notEqualPassword'|''}
     */
    passwordChkValidation(passwordChk) {
      return passwordChk && passwordChk === $('input[name="password"]').val() ? '' : 'notEqualPassword';
    },
    /**
     * @return {'invalidKorEngNum'|''}
     */
    nameValidation(name) {
      if (name.length < 1) return '';
      return shopby.regex.noSpecialSpace.test(name) ? 'invalidKorEngNum' : '';
    },
    /**
     * @return {'existNickname'|'successNickname' |'invalidKorEngNum'|''}
     */
    async nicknameValidation(nickname, originNickname = '') {
      if (nickname.length < 1) return '';
      if (originNickname && originNickname === nickname) return 'successNickname';

      const { data: checkNickname } = await shopby.api.member.getProfileNicknameExists({
        queryString: { nickname },
      });
      if (checkNickname.exist) {
        return 'existNickname';
      }
      return shopby.regex.noSpecialSpace.test(nickname) ? 'invalidKorEngNum' : 'successNickname';
    },
    /**
     * @return {'noInputEmail'|'invalidEmail'|'existEmail'|'successEmail'}
     */
    async emailValidation(originEmail = '') {
      if (originEmail && originEmail === this.emailValue) return 'successEmail';
      const [id, domain] = this.emailValue.split('@');

      if (!id || !domain) {
        return 'noInputEmail';
      }

      if (!shopby.regex.emailId.test(id) || !shopby.regex.emailDomain.test(domain)) {
        return 'invalidEmail';
      }

      const { data: checkEmail } = await shopby.api.member.getProfileEmailExists({
        queryString: { email: this.emailValue },
      });
      return checkEmail.exist ? 'existEmail' : 'successEmail';
    },
    /**
     * @return {'invalidMobileNo'|''}
     */
    mobileNoValidation(mobileNo) {
      return shopby.regex.mobileNo.test(mobileNo) ? '' : 'invalidMobileNo';
    },
    /**
     * 120년 전까지의 년도 리스트
     *
     * @returns [{value: number, name: string}]
     */
    get last120YearsAgo() {
      const year = new Date().getFullYear();

      return [...Array(120).keys()].reduce(
        (yearList, index) => {
          return [...yearList, { value: year - index, name: `${year - index}년` }];
        },
        [{ value: 0, name: '년도' }],
      );
    },
    /**
     * @returns [{value: number, name: string}]
     */
    get monthList() {
      return [...Array(13).keys()].map(index => ({ value: index, name: `${index === 0 ? '' : index}월` }));
    },
    /**
     * @returns [{value: number, name: string}]
     */
    get dayList() {
      return [...Array(32).keys()].map(index => ({ value: index, name: `${index === 0 ? '' : index}일` }));
    },
  };
})();

/**
 * 로그인 관련 중복 로직 담아두는 헬퍼
 *
 * @author sohyun choi
 */
(() => {
  shopby.helper.login = {
    goNextUrl() {
      const nextUrl = shopby.utils.getUrlParam('next-url');
      const referrer = document.referrer !== '';
      const isJoinReferrer = document.referrer.includes('join');

      // 다른 페이지에서 nextUrl 을 직접적으로 지정했을 경우 이 조건에 걸린다.
      if (nextUrl) {
        // 1. URL 형식일 경우 host 가 일치하는지 검사.
        // 아닐 경우 URL 파싱이 실패하게 되고 catch 조건으로 이동
        try {
          const url = new URL(nextUrl);
          // 호스트가 일치할 경우 리다이렉트
          if (url.host === location.host) {
            location.href = url.href;
            // 일치하지 않을 경우 Home 으로 이동
          } else {
            shopby.goHome();
          }
        } catch (error) {
          // 2. URL 형식이 아닐경우 pathname 형식일 수 있다.
          // nextUrl 을 pathName 으로 가정하고 리다이렉트 시도. 실패할 경우 Home 으로 이동
          try {
            location.href = location.origin + nextUrl;
          } catch (error) {
            shopby.goHome();
          }
        }
      } else if (referrer && !isJoinReferrer) {
        if (document.referrer.includes('dormant.html')) {
          shopby.goHome();
          return;
        }
        window.location.href = document.referrer;
      } else {
        shopby.goHome();
      }
    },
    popup: null,
    async openIdLogin(event) {
      event.preventDefault();
      const provider = `ncp_${event.currentTarget.dataset.provider}`;
      const data = await this.fetchOauthLogin(provider);
      this.openLoginPopup(data);
    },
    async fetchOauthLogin(provider) {
      const oauthToken = this.generateRandomString();
      const redirectUri = encodeURI(`${location.origin}/callback/auth-callback.html`);

      shopby.localStorage.setItemWithExpire(shopby.cache.key.member.oauthProvider, provider, 30 * 60 * 1000);
      shopby.localStorage.setItemWithExpire(shopby.cache.key.member.oauthToken, oauthToken, 30 * 60 * 1000);

      const { data } = await shopby.api.auth.getOauthLoginUrl({
        queryString: {
          provider,
          redirectUri,
          state: oauthToken,
        },
      });
      return data;
    },
    /**
     * n자리 랜덤 문자열 생성기
     *
     * @param maxLength - default: 6자리
     * @returns {string}
     */
    generateRandomString(maxLength = 6) {
      const availableChar = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return Array.from(Array(maxLength).keys()).reduce(prev => {
        return prev + availableChar.charAt(Math.floor(Math.random() * availableChar.length));
      }, '');
    },
    openLoginPopup(result) {
      location.href = `${result.loginUrl}`;
    },
    _openIdAuthCallback(profileResult = null, ordinaryMemberData = null, isDormant = false) {
      if (isDormant === true) {
        shopby.confirm({ message: '휴면해제가 필요합니다.' }, function (e) {
          if (e.state === 'ok') {
            shopby.localStorage.setItem(shopby.cache.key.member.dormant, true);
            location.replace('/pages/login/dormant.html');
          }
        });
        return;
      }
      if (!profileResult) {
        shopby.cache.removeAccessToken();
        shopby.alert({ message: '간편 인증에 실패하였습니다.' });
        return;
      }

      if (profileResult.memberStatus === 'WAITING' && !!ordinaryMemberData) {
        shopby.popup('join-open-id-kakaosync', { ordinary: ordinaryMemberData }, this._JoinOpenIdKakaoSync);
      } else if (profileResult.memberStatus === 'WAITING') {
        shopby.popup('join-open-id', { profile: profileResult }, this._joinOpenId);
      } else {
        shopby.alert('로그인이 완료 되었습니다.', shopby.goHome);
      }
    },
    async _JoinOpenIdKakaoSync(data) {
      if (data.state === 'cancel') {
        shopby.cache.removeAccessToken();
        shopby.goHome();
        return;
      } else if (data.state === 'login') {
        shopby.goHome();
        return;
      }
      try {
        await shopby.api.member.postProfileOpenId({
          requestBody: {},
        });
        shopby.alert({ message: '로그인이 완료 되었습니다.' }, shopby.goHome);
      } catch (e) {
        shopby.goHome();
      }
    },
    async _joinOpenId({ agreedTerms: joinTermsAgreements }) {
      try {
        const request = { requestBody: { joinTermsAgreements } };
        await shopby.api.member.postProfileOpenId(request);
        //NOTE : 무조건 메인페이지로 : shopby.helper.login.goNextUrl 경우 이전페이지를 각 간편로그인 계정페이지로 이동함.
        shopby.alert('회원가입이 완료 되었습니다.', shopby.goHome);
      } catch (e) {
        shopby.goHome();
      }
    },
  };
})();

/**
 * 첨부파일 헬퍼
 *
 * @author eunbi kim
 */
(() => {
  shopby.helper.attachments = {
    async onChangeAttachments({ target }, uploadImageCallback, currentAttachmentLength, maxLength = 10) {
      const addedImagesCount = target.files.length;
      if (currentAttachmentLength + addedImagesCount > maxLength) {
        shopby.alert(`첨부파일은 최대 ${maxLength}개만 등록 가능합니다.`);
        return;
      }
      const files = Array.from(target.files);
      await Promise.all(
        files.map(file => {
          if (!this.validateFileExtension(file)) return;
          if (!this.validateFileSize(file)) return;
          return this.uploadImage(file, uploadImageCallback);
        }),
      );
    },
    validateFileExtension({ name }) {
      if (name.match(shopby.regex.imageExtension)) return true;
      shopby.alert('허용하지 않는 확장자입니다.');
      return false;
    },
    validateFileSize({ size }) {
      const maxSize = 5 * 1024 * 1024;
      if (Number(size) <= maxSize) return true;
      shopby.alert('파일용량이 5MB를 초과하였습니다.');
      return false;
    },
    async uploadImage(file, uploadImageCallback) {
      try {
        const formData = new FormData();
        await formData.append('file', file);
        const { data } = await shopby.api.storage.postFilesImages({ requestBody: formData });
        uploadImageCallback(data, file);
      } catch (e) {
        console.error(e);
      }
    },
  };
})();

/**
 * 디자인 팝업
 *
 * @author Daejoong Son
 */
(() => {
  let designPopups = [];

  const today = shopby.date.today();
  const invisibleToday = shopby.localStorage.getItem(shopby.cache.key.designPopups.invisibleToday) || {
    day: today,
    list: [],
  };
  if (today !== invisibleToday.day) {
    invisibleToday.day = today;
    invisibleToday.list = [];
  }

  /**
   * 데이터 가져오기
   *
   * @return {Promise<*[]|*>}
   * @private
   */
  const _getDesignPopups = async () => {
    const cacheData = shopby.localStorage.getItemWithExpire(shopby.cache.key.designPopups.popups) || {};
    if (cacheData[location.pathname]) {
      return cacheData[location.pathname];
    }

    const requestBody = {
      displayUrl: location.pathname,
      parameter: location.search.slice(1),
    };
    const { data } = await shopby.api.display.postDesignPopups({ requestBody });

    cacheData[location.pathname] = data || [];
    shopby.localStorage.setItemWithExpire(shopby.cache.key.designPopups.popups, cacheData);

    return cacheData[location.pathname];
  };

  /**
   * 디자인 팝업 관련 소스 로드 (js, html)
   *
   * @return {Promise<unknown[]>}
   * @private
   */
  const _loadDesignPopup = () => {
    $('body').prepend('<div class="top_area"></div>');

    const $div = $('<div />').appendTo('body');

    const targets = ['design-popup-normal', 'design-popup-multi'];

    return Promise.all(
      targets.map(
        target =>
          new Promise(resolve => {
            $('<div />')
              .appendTo($div)
              .load(`/components/design-popup/${target}.html`, () => {
                resolve();
              });
          }),
      ),
    ).then();
  };

  /**
   * 디자인 팝업 생성
   *
   * @param popup
   * @private
   */
  const _createDesignPopup = popup => {
    if (popup.detailInfo.screenType === 'WINDOW' && !shopby.isWindowPopup()) {
      // window 팝업 호출
      let windowOption = 'toolbar=no,status=no,statusbar=no,menubar=no,scrollbars=no,resizable=no';
      windowOption += ',left=' + popup.detailInfo.screenLeftPosition;
      windowOption += ',top=' + popup.detailInfo.screenTopPosition;

      let windowWidth = popup.detailInfo.screenWidth + 35;
      let windowHeight = popup.detailInfo.screenHeight + 110;

      if (popup.popupDesignType === 'NORMAL') {
        if (popup.detailInfo.screenWidthUnit === 'PERCENT') {
          windowWidth = (window.innerWidth * popup.detailInfo.screenWidth) / 100;
        }
        if (popup.detailInfo.screenHeightUnit === 'PERCENT') {
          windowHeight = (window.innerHeight * popup.detailInfo.screenHeight) / 100;
        }
      } else if (popup.popupDesignType === 'MULTI') {
        windowWidth = popup.popupSlideInfo.slideMaxWidth + 64;
        windowHeight = popup.popupSlideInfo.slideMaxHeight + 233;
      }

      windowOption += ',width=' + windowWidth;
      windowOption += ',height=' + windowHeight;

      // window.name 이 "null" 인 경우, 팝업에서 opener 를 제대로 세팅 못하는 이슈가 있음. 구글링해도 뭔지 잘 안나옴. window.name 을 지정하며 해결됨;;;
      window.name = '';
      window.open(
        '/pages/popup/design-popup/design-popup.html?popupNo=' + popup.popupNo,
        'disign-popup-' + popup.popupNo,
        windowOption,
      );
    } else {
      // 걍 일반 div 팝업
      if (popup.popupDesignType === 'NORMAL') {
        new shopby.designPopup.Normal(popup);
      } else {
        new shopby.designPopup.Multi(popup);
      }
    }
  };

  shopby.designPopup = {
    initiate() {
      if (shopby.isWindowPopup()) {
        const popupNo = Number(shopby.utils.getUrlParam('popupNo'));
        const popup = window.opener.shopby.designPopup.getPopupDataByPopupNo(popupNo);

        if (!popup) {
          window.close();
          return;
        }

        _loadDesignPopup().then(() => {
          _createDesignPopup(popup);
        });
      } else {
        _getDesignPopups()
          .then(data => {
            designPopups = data.filter(popup => !invisibleToday.list.some(popupNo => popup.popupNo === popupNo));

            if (designPopups.length === 0) {
              return;
            }
          })
          .then(_loadDesignPopup)
          .then(() => {
            designPopups.map(popup => {
              _createDesignPopup(popup);
            });
          });
      }
    },

    /**
     * 팝업 데이터 가져오기 (by popupNo)
     * - 윈도우 팝업 때문에 필요
     *
     * @param popupNo
     * @return {*}
     */
    getPopupDataByPopupNo(popupNo) {
      if (!popupNo) {
        return;
      }

      return designPopups.filter(popup => popup.popupNo === popupNo)[0];
    },

    /**
     * 오늘 하루 보지 않기
     *
     * @param popupNo
     */
    setInvisibleToday(popupNo) {
      if (popupNo) {
        invisibleToday.list.push(popupNo);
      }

      shopby.localStorage.setItem(shopby.cache.key.designPopups.invisibleToday, invisibleToday);
    },

    /**
     * 멀티 팝업에서 클릭했을때, 메인 윈도우가 이동하기 위해
     *
     * @param targetUrl
     * @param _blank
     * @param bWindow
     */
    onClickMultiPopup(targetUrl, _blank, bWindow) {
      if (!targetUrl) {
        return;
      }

      if (_blank) {
        window.open(targetUrl, '_blank');
      } else {
        if (bWindow) {
          window.opener.location.href = targetUrl;
        } else {
          location.href = targetUrl;
        }
      }
    },
  };

  shopby.start.entries.push(shopby.designPopup.initiate.bind(shopby.designPopup));
})();

(() => {
  shopby.helper.naverPay = ({ EMBED_ID, BUTTON_KEY, BUTTON_COUNT, ENABLE }) => {
    return new NaverPay(EMBED_ID, BUTTON_KEY, BUTTON_COUNT, ENABLE);
  };

  class NaverPay {
    constructor(EMBED_ID, BUTTON_KEY, BUTTON_COUNT, ENABLE) {
      this.EMBED_ID = EMBED_ID; // append할 요소 id
      this.BUTTON_KEY = BUTTON_KEY; // 네이버페이 버튼 키
      this.BUTTON_COUNT = BUTTON_COUNT; // 버튼 개수 설정. 구매하기 버튼만 있으면 1, 찜하기 버튼도 있으면 2를 입력.
      this.ENABLE = ENABLE; //
      this.BUTTON_TYPE = 'MA';
    }

    applyNaverPayButton(naverPayOrderHandler, naverWishlistHandler) {
      if (!window.naver) {
        throw new Error('네이버페이 버튼 스크립트를 로드해주세요.');
      }

      window.naver.NaverPayButton.apply({
        EMBED_ID: this.EMBED_ID, // 임시로 넣은 마크업
        BUTTON_KEY: this.BUTTON_KEY, // 페이에서 제공받은 버튼 인증 키 입력, 임시로 프로스킨꺼 삽입
        TYPE: this.BUTTON_TYPE, // 버튼 모음 종류 설정
        COLOR: 1, // 버튼 모음의 색 설정
        COUNT: this.BUTTON_COUNT, // 버튼 개수 설정. 구매하기 버튼만 있으면 1, 찜하기 버튼도 있으면 2를 입력.
        ENABLE: this.ENABLE, // 품절 등의 이유로 버튼 모음을 비활성화할 때에는 "N" 입력
        BUY_BUTTON_HANDLER: naverPayOrderHandler,
        WISHLIST_BUTTON_HANDLER: naverWishlistHandler,
      });
    }

    requestNaverPayOrder(itemParam) {
      if (!window.NCPPay) {
        throw new Error('ncp_pay 스크립트를 로드해주세요.');
      }

      window.NCPPay.setConfiguration({
        clientId: shopby.config.skin.clientId,
        accessToken: shopby.cache.getAccessToken() || '',
        platform: 'MOBILE_WEB',
      });

      window.NCPPay.requestNaverPayOrder(
        {
          items: itemParam,
          clientReturnUrl: location.href, // 화면 리턴될 url : 네이버페이에서 쇼핑몰로 이동 시 이 url로 이동됩니다.
        },
        () => {},
        this.naverOrderErrorHandler,
      );
    }

    naverOrderErrorHandler(error) {
      const ERROR_CODE = {
        NO_EXHIBITION: 'PPVE0019',
      };

      if (error && error.code && error.code === ERROR_CODE.NO_EXHIBITION) {
        shopby.goHome();
        return;
      }
    }

    requestNaverWishlist(productNo) {
      if (!window.NCPPay) {
        throw new Error('ncp_pay 스크립트를 로드해주세요.');
      }

      window.NCPPay.setConfiguration({
        clientId: shopby.config.skin.clientId,
        platform: shopby.platform.toUpperCase(),
      });

      window.NCPPay.requestNaverPayWishList({
        productNo,
        clientReturnUrl: location.href,
      });
    }
  }
})();

// 결제 관련 스크립트를 load
(() => {
  const naverPayLoadTargets = ['/pages/product/view.html', '/pages/order/cart.html'];
  const payLoadTargets = ['/pages/product/view.html', '/pages/order/cart.html', '/pages/order/order.html'];

  const devHostKeywords = ['alpha-', 'localhost', 'devfe', 'gej0308'];
  const environment = devHostKeywords.some(hostKeyword => location.hostname.includes(hostKeyword)) ? 'alpha' : 'real';

  // deployInfo 객체는 어떻게 되는건지 모르겠지만, 일단 url로 하라고하니 여기다 결제 관련 스크립트 저장
  const payScripts = {
    real: [
      'https://nsp.pay.naver.com/sdk/js/naverpay.min.js',
      'https://shop-api.e-ncp.com/payments/ncp_pay.js',
      'https://pay.kcp.co.kr/plugin/payplus_web.jsp',
      'https://xpayvvip.uplus.co.kr/xpay/js/xpay_crossplatform.js',
    ],
    alpha: [
      'https://nsp.pay.naver.com/sdk/js/naverpay.min.js',
      'https://alpha-shop-api.e-ncp.com/payments/ncp_pay_alpha.js',
      'https://testpay.kcp.co.kr/plugin/payplus_web.jsp',
      'https://pretest.uplus.co.kr:9443/xpay/js/xpay_crossplatform.js',
    ],
  };

  const naverPayScript = {
    real: {
      pc: 'https://pay.naver.com/customer/js/naverPayButton.js',
      mobile: 'https://pay.naver.com/customer/js/mobile/naverPayButton.js"',
    },
    alpha: {
      pc: 'https://test-pay.naver.com/customer/js/naverPayButton.js',
      mobile: 'https://test-pay.naver.com/customer/js/mobile/naverPayButton.js"',
    },
  };

  loadPayScript();
  loadNaverPayScript();

  function loadPayScript() {
    if (!payLoadTargets.includes(location.pathname)) {
      return;
    }

    payScripts[environment].forEach(script =>
      document.write(`<script type='text/javascript' src="${script}"></script>`),
    );
  }

  function loadNaverPayScript() {
    if (!naverPayLoadTargets.includes(location.pathname)) {
      return;
    }

    document.write(`<script type='text/javascript' src="${naverPayScript[environment][shopby.platform]}"></script>`);
  }
})();

// 캡챠
(() => {
  shopby.helper.captcha = idName => new Captcha(idName);

  class Captcha {
    constructor(idName) {
      this._mustAuthenticate(false);
      this.render(idName);
      this.errorKey = '';
    }
    render(idName) {
      idName = idName ? idName : 'captcha';
      this._$el = $(`#${idName}`);
      this._render();
      this._bindEvents();
    }
    reset() {
      this._mustAuthenticate(false);
      this._display(false);
    }
    retry(errorKey = '') {
      this.errorKey = errorKey;
      this._display(true);
    }

    async submitCode() {
      if (this._$el.css('display') === 'none') return;
      const code = this._$el.find('#captchaCode').val();
      if (code === undefined) return;
      this._validate(code);

      try {
        await shopby.api.auth.postCaptchaVerify({
          queryString: {
            code,
          },
        });
      } catch (e) {
        throw new Error(e.message);
      }
    }
    _mustAuthenticate(status) {
      this._requiredAuth = status;
    }
    errorHandler(error) {
      const captcha = 'captcha';
      this._mustAuthenticate(true);
      if (error.data) {
        const { path, message } = error.data;
        path.includes(captcha) && alert(message);
      }
    }
    _validate(code) {
      if (!code) {
        shopby.alert('자동등록방지 문자를 입력해주세요.');
        throw new Error('EMPTY_CODE');
      }
    }
    async _render() {
      await this._$el.html(this._getTemplate(''));
      await this._display(this._requiredAuth);
    }
    async _fetchImage() {
      const { data } = await shopby.api.auth.getCaptchaImage();
      return data.url;
    }
    _getTemplate(url) {
      return `
      <div class="capcha_box">
        <div>
          <div class="captcha">
              <div class="captcha_img">
                  <img id="captcha-img" src=${url} align="absmiddle" />
              </div>
              <button type="button" id="refreshCaptcha" class="captcha_reset">
                  <span>이미지 새로고침</span>
              </button>
              <div class="captcha_txt">
                  <input
                      type="text"
                      id='captchaCode'
                      class="text captcha"
                      name="captchaKey"
                      placeholder="보이는 순서대로 숫자 및 문자를 모두 입력해주세요."
                  />
              </div>
          </div>
        </div>
      </div>
      `;
    }
    async _setImgUrl() {
      const url = await this._fetchImage();
      this._$el.find('#captcha-img').attr('src', url);
    }
    async _display(show = true) {
      show && (await this._setImgUrl());
      this._$el.toggle(show);
    }
    _bindEvents() {
      this._$el.on('click', '#refreshCaptcha', this._display.bind(this, true));
    }
  }
})();

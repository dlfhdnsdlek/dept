$(() => {
  shopby.service.company = {
    data: {
      termsTypes: 'MALL_INTRODUCTION',
      termsContents: null,
    },
    async initiate() {
      await this._getTermsContents();
      this.getKaKaoMap();
      this.render();
    },
    render() {
      $('.content_box').render({
        termsContents: this.data.termsContents,
        kakaoMap: this.data.kakaoMap.kakaoMapKey,
      });
    },
    async _getTermsContents() {
      const request = { queryString: { termsTypes: this.data.termsTypes } };
      const { data: terms } = await shopby.api.manage.getTerms(request);
      this.data.termsContents = terms[this.data.termsTypes.toLowerCase()].contents;
    },
    async getKaKaoMap() {
      this.data.kakaoMap = shopby.cache.getMall().externalServiceConfig.kakaoMap;
      const { kakaoMapKey, kakaoMapLatitude, kakaoMapLongitude } = this.data.kakaoMap;
      if (!kakaoMapKey) return;
      await shopby.getScript(`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false`);
      this.setKakaoMap(kakaoMapLatitude, kakaoMapLongitude);
    },
    setKakaoMap(kakaoMapLatitude, kakaoMapLongitude) {
      /* eslint-disable */
      kakao.maps.load(() => {
        var mapContainer = document.getElementById('map'),
          markerPosition = new kakao.maps.LatLng(kakaoMapLatitude, kakaoMapLongitude),
          mapOption = {
            center: markerPosition,
            level: 3,
          };
        var map = new kakao.maps.Map(mapContainer, mapOption);
        var marker = new kakao.maps.Marker({
          position: markerPosition,
        });
        marker.setMap(map);
      });
    },
  };

  shopby.start.initiate(shopby.service.company.initiate.bind(shopby.service.company));
});

$(() => {
  shopby.my = shopby.my || {};

  shopby.my.menu = {
    init(selector) {
      $('#contents').addClass('visible');
      $(selector).renderTemplateWithRawHtml(this._getMenuData(), menuHtml);
    },
    _getMenuData() {
      const config = shopby.cache.getBoardsConfig();
      const {
        accumulationConfig: { accumulationName },
      } = shopby.cache.getMall();
      return {
        accumulationName,
        inquiryConfig: {
          used: config.inquiryConfig.used,
          name: config.inquiryConfig.name,
        },
        productInquiryConfig: {
          used: config.productInquiryConfig.used,
          name: config.productInquiryConfig.name,
        },
        productReviewConfig: {
          used: config.productReviewConfig.used,
          name: config.productReviewConfig.name,
        },
        openIdMember: shopby.localStorage.getItem(shopby.cache.key.member.oauthProvider),
      };
    },
  };

  shopby.my.summary = {
    async init(selector, summary, summaryAmount, likeCount = 0, grade = null) {
      let gradeInfo = null;
      if (!grade) {
        const { data } = await shopby.api.member.getProfileGrade();
        gradeInfo = data;
      } else {
        gradeInfo = grade;
      }
      $(selector).renderTemplateWithRawHtml(
        this._getSummaryData(summary, summaryAmount, likeCount, gradeInfo),
        summaryHtml,
      );
      this.bindEventForSummary();
    },
    bindEventForSummary() {
      $('#gradeBenefitInfo,#gradeBenefitCloseBtn').on('click', () => $('.grade_benefit_info').toggle());
      $('#allGradeBenefitInfo').on('click', () => $('#allGradeBenefit').toggle());
    },
    _getSummaryData(summary, summaryAmount, likeCount, grade) {
      const { mall, accumulationConfig } = shopby.cache.getMall();

      // 등급 적립금 (자동)
      const gradeAutoSupplyingAmt = grade.reserveAutoSupplying.used ? grade.reserveAutoSupplying.amount : 0;
      // 구매 적립금 (구매시)
      const gradeBuyReserveRate = grade.reserveBenefit.used ? grade.reserveBenefit.reserveRate : 0;
      return {
        name: summary.memberName,
        gradeLabel: grade.label,
        orderAmtlastHalfYear: summaryAmount.lastPayAmt,
        orderCntlastHalfYear: summaryAmount.orderCnt,
        gradeCoupons: grade.coupons,
        gradeReserveText: `${shopby.utils.toCurrencyString(gradeAutoSupplyingAmt)}원, ${gradeBuyReserveRate}%`,
        mallGrades: mall.grades,
        accumulationName:
          accumulationConfig && accumulationConfig.accumulationName ? accumulationConfig.accumulationName : '마일리지',
        accumulationUnit:
          accumulationConfig && accumulationConfig.accumulationName ? accumulationConfig.accumulationName : '원',
        accumulationTotalAmt: summary.accumulations.totalAmt,
        availableCoupons: summary.availableCoupons.totalCount,
        likeProductsCnt: likeCount,
      };
    },
  };

  const summaryHtml = `
    <div class="mypage_top_info_renew my_top_summary">
        <div class="mypage_top_info_renew_left">
            <p class="left_info1"><span>{{name}}</span> 님은 <span>{{gradeLabel}}</span>입니다.</p>
            <div class="left_info2">
                <p>구매금액<span>{{toCurrencyString orderAmtlastHalfYear}}</span>원</p>
                <p>구매횟수<span>{{orderCntlastHalfYear}}</span>건</p>
            </div>
            
            <div class="left_info_btn">
                <a href="#" id="gradeBenefitInfo">등급혜택 안내</a>
                <a href="/pages/my/modify-member.html">회원정보 수정</a>
                <div class="grade_benefit_info">
                    <div class="grade_benefit_info_top">
                        <p>등급혜택 안내</p>
                        <a href="#" id="gradeBenefitCloseBtn" class="btn_layer_close"><img src="/assets/img/mypage/icon-layer-close.png" alt="닫기" /></a>
                    </div>
                    <div class="grade_benefit_info_bot">
                        <p>나의 등급혜택</p>
                        <table>
                            <colgroup>
                                <col style="width:120px;"/>
                                <col />
                            </colgroup>
                            <tbody>
                            <tr>
                                <th scope="row">회원등급</th>
                                <td>{{gradeLabel}}</td>
                            </tr>
                            
                            <tr>
                                <th scope="row">등급 쿠폰 혜택</th>
                                <td>
                                <!--{{#each gradeCoupons}}-->
                                    {{couponName}} / {{#ifEq discountType 'AMOUNT'}}{{toCurrencyString discountAmount}}원{{else}}{{discountPercent}}%{{/ifEq}}<br/>
                                <!--{{/each}}-->
                                </td>
                            </tr>
                            
                            <tr>
                                <th scope="row">등급 적립금 혜택</th>
                                <td>{{gradeReserveText}}</td>
                            </tr>
                            </tbody>
                        </table>
                        <a href="#" id="allGradeBenefitInfo" class="btn_all_grade">전체 등급혜택</a>
                        <table id="allGradeBenefit">
                            <colgroup>
                                <col style="width:120px;"/>
                                <col />
                            </colgroup>
                            <tbody>
                              <!--{{#each mallGrades}}-->
                              {{#if used}}
                              <tr>
                                  <th scope="row" {{#ifEq label ../gradeLabel}}class="fc_red"{{/ifEq}}>{{label}}</th>
                                  <td {{#ifEq label ../gradeLabel}}class="fc_red"{{/ifEq}}>
                                      {{#each coupons}}
                                      - {{couponName}} / {{#ifEq discountType 'AMOUNT'}}{{toCurrencyString discountAmount}}원{{else}}{{discountPercent}}%{{/ifEq}} 쿠폰 <br/>
                                      {{/each}}
                                      {{#if reserveAutoSupplying.used}}
                                      - 등급 적립금 {{toCurrencyString reserveAutoSupplying.amount}}원 <br/>
                                      {{/if}}
                                      {{#if reserveBenefit.used}}
                                      - 구매 금액의 {{reserveBenefit.reserveRate}}% <br/>
                                      {{/if}}
                                  </td>
                              </tr>
                              {{/if}}
                              <!--{{/each}}-->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div class="mypage_top_info_renew_right">
            <dl class="icon_mypage_info_1">
                <dt>사용 가능 {{accumulationName}}</dt>
                <dd><a href="/pages/my/mileages.html"><span>{{toCurrencyString accumulationTotalAmt}}</span>{{accumulationUnit}}</a></dd>
            </dl>
            <dl class="icon_mypage_info_2">
                <dt>보유중인 쿠폰</dt>
                <dd><a href="/pages/my/coupons.html"><span>{{toCurrencyString availableCoupons}}</span>건</a></dd>
            </dl>
            <dl class="icon_mypage_info_3">
                <dt>찜리스트</dt>
                <dd><a href="/pages/my/wishes.html"><span>{{toCurrencyString likeProductsCnt}}</span>건</a></dd>
            </dl>
        </div>
    </div>
`.trim();

  const menuHtml = `
    <div class="sub_menu_box">
        <h2>마이페이지</h2>
        <ul class="sub_menu_mypage">
            <li>쇼핑정보
                <ul class="sub_depth1">
                    <li><a href="/pages/my/orders.html">- 주문목록/배송조회</a></li>
                    <li><a href="/pages/my/claims.html">- 취소/반품/교환 내역</a></li>
                    <li><a href="/pages/my/wishes.html">- 찜리스트</a></li>
                </ul>
            </li>
            <li>혜택관리
                <ul class="sub_depth1">
                    <li><a href="/pages/my/coupons.html">- 쿠폰</a></li>
                    <li><a href="/pages/my/mileages.html">- {{accumulationName}}</a></li>
                </ul>
            </li>
            <li>회원정보
                <ul class="sub_depth1">
                    {{#unless openIdMember}}
                    <li><a href="/pages/my/modify-member.html">- 회원정보 수정</a></li>
                    {{/unless}}
                    <li><a href="/pages/my/withdrawal.html">- 회원 탈퇴</a></li>
                    <li><a href="/pages/my/shipping.html">- 배송지 관리</a></li>
                </ul>
            </li>
            <li>나의 게시글
                <ul class="sub_depth1">
                    {{#if inquiryConfig.used}}
                    <li><a href="/pages/my/inquiries.html" class="sb_a_inquiry_name">- {{inquiryConfig.name}}</a></li>
                    {{/if}}
                    {{#if productInquiryConfig.used}}
                    <li><a href="/pages/my/product-inquiries.html" class="sb_a_goods_inquiry_name">- {{productInquiryConfig.name}}</a></li>
                    {{/if}}
                    {{#if productReviewConfig.used}}
                    <li><a href="/pages/my/product-reviews.html" class="sb_a_goods_review_name">- {{productReviewConfig.name}}</a></li>
                    {{/if}}
                </ul>
            </li>
        </ul>
    </div>`.trim();
});

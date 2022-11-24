$(() => {
  shopby.my = shopby.my || {};

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
      $('#gradeBenefitInfo,#gradeBenefitCloseBtn').on('click', event => {
        event.preventDefault();
        $('#gradeBenefitInfoTooltip').toggle();
      });
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
        openIdMember: shopby.localStorage.getItem(shopby.cache.key.member.oauthProvider),
      };
    },
  };

  const summaryHtml = `
    <div class="member_summary_area">
        <div class="member_summary_info_1">
            <p><string class="summary_name">{{name}}</string> 님은<br><strong class="summary_grade">{{gradeLabel}}</strong>입니다.</p>
            <div>
                <a href="#gradeBenefitInfoTooltip" id="gradeBenefitInfo">등급혜택 안내</a>
                <a href="/pages/my/shipping.html">배송지 관리</a>
                {{#unless openIdMember}}
                <a href="/pages/my/modify-member.html">회원정보 수정</a>
                {{/unless}}
                <div id="gradeBenefitInfoTooltip" class="grade_benefit_info">
                    <div class="grade_benefit_info_top">
                        <p>등급혜택 안내</p>
                        <a href="#" id="gradeBenefitCloseBtn" class="btn_layer_close"><img src="/assets/img/icon/btn_layer_close.png" alt="닫기" /></a>
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
                                  <th scope="row" {{#ifEq label ../gradeLabel}}class="c_red"{{/ifEq}}>{{label}}</th>
                                  <td {{#ifEq label ../gradeLabel}}class="c_red"{{/ifEq}}>
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
        <div class="member_summary_info_box">
            <div class="member_summary_info_2">
                <div class="user_buy_area">
                    <dl>
                        <dt>구매금액</dt><dd><span>{{toCurrencyString orderAmtlastHalfYear}}</span>원</dd>
                    </dl>
                    <dl>
                        <dt>구매횟수</dt><dd><span>{{orderCntlastHalfYear}}</span>건</dd>
                    </dl>
                </div>
                <div class="user_have_area">
                    <a href="/pages/my/mileages.html">
                        <dl class="have_save_money">
                            <dt>사용 가능 {{accumulationName}}</dt><dd><span>{{toCurrencyString accumulationTotalAmt}}</span>{{accumulationUnit}}</dd>
                        </dl>
                    </a>
                    <a href="/pages/my/coupons.html">
                        <dl class="have_coupon">
                            <dt>보유중인 쿠폰</dt><dd><span>{{toCurrencyString availableCoupons}}</span>건</dd>
                        </dl>
                    </a>
                    <a href="/pages/my/wishes.html">
                        <dl class="have_wish">
                            <dt>찜리스트</dt><dd><span>{{toCurrencyString likeProductsCnt}}</span>건</dd>
                        </dl>
                    </a>
                </div>
            </div>
        </div>
    </div>
`.trim();
});

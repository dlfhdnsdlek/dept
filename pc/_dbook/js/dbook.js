$(()=>{
    /* 상단 카테고리 하위 메뉴 */
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('ul').stop().slideDown(200);
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('ul').stop().slideUp(200);
    });

    /* 상단 마우스 오버시 */
    $('#header').on('mouseenter',function(){
        $(this).addClass('active');
    }).on('mouseleave', function(){
        $(this).removeClass('active');
    });

    /* 종료된 공구 페이지 */
    var frmPathSearch = location.pathname + location.search;
    if ( frmPathSearch == '/pages/product/list.html?categoryNo=286231') {
        $('.sub_content').addClass('collabo-end');
    }

    /* collabo 진행중인 공구 */
    var price = parseFloat($('.cont-box .item_list_type .item_money_box .item_price b').text().replace(/,/g, ""));
    var customPrice = parseFloat($('.cont-box .item_list_type .item_money_box del').text().replace(/,/g, ""));
    var saleRate = (((customPrice - price) / customPrice) * 100).toFixed(0);
    var regexp = /\B(?=(\d{3})+(?!\d))/g;
    $('.cont-box .item_list_type .item_money_box .item_price').prepend( '<span class="sale-rate">' + saleRate.replace(regexp, ',') + '%</spna>');
});
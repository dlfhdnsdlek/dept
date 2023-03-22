$(()=>{

    /* 상단 고정 */
    function showHeader() {
        if ($(window).scrollTop() > 0) {
            $("#header").addClass("fixed");
        } else {
            $("#header").removeClass("fixed");
        }
    }
	$(window).scroll(showHeader);
	showHeader();

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

});
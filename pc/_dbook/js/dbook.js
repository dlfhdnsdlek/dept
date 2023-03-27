$(()=>{

    /* 상단 고정 */
    function showHeader() {
        if ($(window).scrollTop() > 0) {
            $("#header").addClass("fixed");
            $(".dk-header-wrap").removeClass("main-header");
        } else {
            $("#header").removeClass("fixed");
            $(".dk-header-wrap").addClass("main-header");
        }
    }
	$(window).scroll(showHeader);
	showHeader();

    /* 상단 카테고리 하위 메뉴 */
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('div').stop().slideDown(200);
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('div').stop().slideUp(200);
    });

    $('#header .gnb .depth0 .shop-menu').each(function(){
        var shopMenuCount = $(this).find('li').length;
        var num = 6;
        var quo = parseInt(shopMenuCount/num) + 1;        
        if ( shopMenuCount > num ) {
            $(this).addClass('full-list');
            $(this).css({'grid-template-columns':'repeat('+ quo +', 1fr)'});
            
            $('#header .gnb .depth0 .shop-menu > li').each(function(){
                var idx = $(this).index()+1;
                var mod = Math.ceil(idx/num);
                $(this).css({'grid-column':mod});
            });
        }
    });

    /* 상단 마우스 오버시 */
    $('#header').on('mouseenter',function(){
        $(this).addClass('active');
    }).on('mouseleave', function(){
        $(this).removeClass('active');
    });

    /* 종료된 공구 페이지 */
    var frmSearch = location.search;
    if ( frmSearch.match('categoryNo=286231') ) {
        $('.sub_content').addClass('collabo-end');
    }
    $('#header .gnb .depth0 > li ul > li').each(function(){
        var eCategoryNo = $(this).attr('data-categoryno');
        if (eCategoryNo == '286231') {
            $(this).remove();
        }
    });
});
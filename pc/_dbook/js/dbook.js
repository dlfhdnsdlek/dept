$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('ul').stop().slideDown(200);
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('ul').stop().slideUp(200);
    });

    $('#header').on('mouseenter',function(){
        $(this).addClass('active');
    }).on('mouseleave', function(){
        $(this).removeClass('active');
    });

    var frmPathSearch = location.pathname + location.search;
    if ( frmPathSearch == '/pages/product/list.html?categoryNo=286231') {
        $('.sub_content').addClass('collabo-end');
    }
});
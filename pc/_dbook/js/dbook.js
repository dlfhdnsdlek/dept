$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('ul').stop().slideDown(400);
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('ul').stop().slideUp(400);
    });
    
    $('#header .dk-header-wrap').on('mouseenter',function(){
        $(this).addClass('active');
    }).on('mouseleave', function(){
        $(this).removeClass('active');
    });
});
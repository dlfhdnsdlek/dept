$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('ul').stop().slideDown(400);
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('ul').stop().slideUp(400);
    });
});
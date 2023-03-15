$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).find('ul').stop().slideDown(400);
    }).on('mouseleave', function(){
        $(this).find('ul').stop().slideUp(400);
    });
});
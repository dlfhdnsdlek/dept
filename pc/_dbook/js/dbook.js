$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).find('ul').stop().slideDown();
    }).on('mouseleave', function(){
        $(this).find('ul').stop().slideUp();
    });
});
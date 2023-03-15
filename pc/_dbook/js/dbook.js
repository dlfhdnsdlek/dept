$(()=>{
    $("nav").hover(function(){
        $(this).find(".gnb").stop().slideDown();
    }, function(){
        $(this).find(".gnb").stop().slideUp();
    });

    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).find('ul').slideDown();
    }).on('mouseleave', function(){
        $(this).find('ul').slideUp();
    });
});
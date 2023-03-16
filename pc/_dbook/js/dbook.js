$(()=>{
    $('#header .gnb .depth0 > li').on('mouseenter',function(){
        $(this).addClass('on').find('ul').stop().fadeIn();
    }).on('mouseleave', function(){
        $(this).removeClass('on').find('ul').stop().fadeOut();
    });

    $('#header').on('mouseenter',function(){
        $(this).addClass('active');
    }).on('mouseleave', function(){
        $(this).removeClass('active');
    });
});
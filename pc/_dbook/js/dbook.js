$(()=>{
    $("nav").hover(function(){
        $(this).find(".gnb").stop().slideDown();
    }, function(){
        $(this).find(".gnb").stop().slideUp();
    });
});
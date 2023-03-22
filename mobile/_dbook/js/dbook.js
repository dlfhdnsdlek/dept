$(()=>{

    /* 종료된 공구 페이지 */
    var frmPathSearch = location.pathname + location.search;
    if ( frmPathSearch == '/pages/product/list.html?categoryNo=286231') {
        $('.sub_content').addClass('collabo-end');
    }    
    
    $('#header .gnb .depth0 > li > ul > li').each(function(){
        var eCategoryNo = $(this).attr('data-categoryno');
        if (eCategoryNo == '286231') {
            $(this).hide();
        }
    });
});
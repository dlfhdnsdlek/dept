$(()=>{

    /* 종료된 공구 페이지 */
    var frmSearch = location.search;
    if ( frmSearch.match('categoryNo=286231') ) {
        $('.sub_content').addClass('collabo-end');
    }

    $('#category-navigation .category_side > li').each(function(){
        var eCategoryNo = $(this).attr('data-categoryno');
        if (eCategoryNo == '286231') {
            $(this).remove();
        }
    });
});
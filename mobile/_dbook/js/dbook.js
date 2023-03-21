$(()=>{

    /* 종료된 공구 페이지 */
    var frmPathSearch = location.pathname + location.search;
    if ( frmPathSearch == '/pages/product/list.html?categoryNo=286231') {
        $('.sub_content').addClass('collabo-end');
    }    
});
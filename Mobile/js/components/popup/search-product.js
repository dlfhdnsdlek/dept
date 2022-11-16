/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.8.9
 */

(() => {
  class SearchProduct {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;
      this.render($parent, option);
      this.bindEvents();
    }

    render($parent, option) {
      const compiled = Handlebars.compile($('#searchProductPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
      this.recentKeywordRender();
      //this.getPopularKeywords();

      $('input[name="keyword"]').focus();
    }

    bindEvents() {
      $('._header_search')
        //.on('click', '.latest_search_tab', this.onTabClick)
        .on('click', '.js_recent_keyword_delete', this.deleteRecentKeyword)
        .on('click', '.js_recent_all_delete', this.deleteAllRecentKeywords.bind(this))
        .on('click', '.bn_wrg', this.clearInputText);
      $('.h_search_btn').on('click', this.search.bind(this)).enterKeyup('#searchKeyword');
    }

    //인기검색어 : 그랜드 오픈 스펙 아웃
    async getPopularKeywords() {
      const { data: popularKeywords } = await shopby.api.product.getProductsFavoriteKeywords({
        queryString: { size: 10 },
      });
      $('#popularList').render({ popularKeywords });
    }

    //인기검색어 : 그랜드 오픈 스펙 아웃
    onTabClick({ currentTarget }) {
      const $tab = $(currentTarget).siblings('.latest_search_tab');
      const listType = $(currentTarget).data().type;

      $(currentTarget).addClass('on');
      if ($tab.hasClass('on')) {
        $tab.removeClass('on');
      }

      switch (listType) {
        case 'recent':
          $('#popularList').hide();
          $('#recentList').show();
          break;
        case 'popular':
          $('#popularList').show();
          $('#recentList').hide();
          break;
        default:
          break;
      }
    }

    deleteRecentKeyword({ currentTarget }) {
      const deleteKeyword = $(currentTarget).closest('li').data('value');
      $(currentTarget).closest('li').remove();

      shopby.cache.removeRecentKeyword(deleteKeyword);
    }

    deleteAllRecentKeywords() {
      shopby.localStorage.removeItem(shopby.cache.key.recentlyKeyword);
      this.recentKeywordRender();
    }

    search() {
      try {
        const keyword = $('#searchKeyword').val();
        this.validate(keyword);
        shopby.cache.setRecentKeyword(keyword);
        location.href = `/pages/product/list.html?keyword=${keyword}`;
      } catch (error) {
        shopby.alert(error.message);
      }
    }

    validate(keyword) {
      if (keyword.length === 0) {
        throw new Error('검색어를 입력해주세요');
      }
    }

    recentKeywordRender() {
      const compiled = Handlebars.compile($('#searchListTemplate').html());
      $('#recentList').html(compiled({ recentKeywords: shopby.cache.getRecentKeyword() }));
    }

    clearInputText() {
      $('input[name="keyword"]').val('');
    }
  }

  shopby.registerPopupConstructor('search-product', SearchProduct);
})();

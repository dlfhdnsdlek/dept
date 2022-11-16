(() => {
  function Message($parent, option, callback) {
    option.title = option.title || '알림';
    option.iconType = option.iconType || '';

    const compiled = Handlebars.compile($('#messagePopupTemplate').html());
    this.$el = $(compiled(option));

    this.callback = callback;

    $parent.append(this.$el);

    this.$el.find('.btnClosePopup[data-action-type="negative"]').focus();
  }

  shopby.registerPopupConstructor('message', Message);
})();

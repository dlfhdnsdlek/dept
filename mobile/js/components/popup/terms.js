/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.6.24
 */

(() => {
  function Terms($parent, option, callback) {
    const compiled = Handlebars.compile($('#termsPopupTemplate').html());
    this.$el = $(compiled(option));
    this.callback = callback;

    $parent.append(this.$el);
  }

  shopby.registerPopupConstructor('terms', Terms);
})();

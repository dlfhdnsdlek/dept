/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.14
 *
 */

(() => {
  function AgeRestrictGuide($parent, option, callback) {
    const compiled = Handlebars.compile($('#ageRestrictGuideTemplate').html());
    this.$el = $(compiled(option));

    this.callback = callback;

    $parent.append(this.$el);

    this.$el.find('.btnClosePopup[data-action-type="negative"]').focus();
  }

  shopby.registerPopupConstructor('age-restrict-guide', AgeRestrictGuide);
})();

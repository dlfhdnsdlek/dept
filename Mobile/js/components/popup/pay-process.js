/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author YoungGeun Kwon
 * @since 2021.7.21
 */
(() => {
  class PayProcess {
    constructor($parent, option, callback) {
      this.$parent = $parent;
      this.option = option;
      this.callback = callback;

      this.init($parent, option);
      this.bindEvents();
    }

    init($parent, option) {
      const compiled = Handlebars.compile($('#payProcessTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
    }

    bindEvents() {
      this.$el.on('click', '#openPgBtn', this.onClickPgOpener.bind(this));
    }

    onClickPgOpener(e) {
      e.preventDefault();
      $(parent.document).find('.btnOrderTotal').trigger('click');
    }
  }

  shopby.registerPopupConstructor('pay-process', PayProcess);
})();

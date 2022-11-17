/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.23
 *
 */

(() => {
  class CancelMessage {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#cancelMessagePopupTemplate').html());
      this.$el = $(compiled(option));
      this.callback = callback;
      $parent.append(this.$el);

      this.bindEvents();
    }

    bindEvents() {
      this.$el.on('click', '.btnCloseMessage', this.closeButtonEvent.bind(this));
    }

    closeButtonEvent(event) {
      const $target = $(event.currentTarget);
      const actionType = $target.data('action-type') || 'negative';
      const status = actionType === 'positive' ? { state: 'ok', result: $target.data('cancel-type') } : null;

      this.close(status);
    }
  }

  shopby.registerPopupConstructor('cancel-message', CancelMessage);
})();

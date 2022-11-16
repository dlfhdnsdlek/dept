/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author choisohyun
 * @since 2022.03.08
 */
(() => {
  class AdditionalDeliveryFee {
    constructor($parent, option) {
      const compiled = Handlebars.compile($('#deliveryFeeAreaTemplate').html());
      this.$el = $(compiled(option));
      this.option = option;

      $parent.append(this.$el);
    }
  }

  shopby.registerPopupConstructor('additional-delivery-fee', AdditionalDeliveryFee);
})();

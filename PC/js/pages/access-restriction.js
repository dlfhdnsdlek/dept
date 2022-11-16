/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.10.6
 */

$(() => {
  shopby.accessRestriction = {
    initiate() {
      this.render();
    },
    render() {
      $('#accessRestriction').render({
        mall: shopby.cache.getMall().mall,
      });
    },
  };

  shopby.start.initiate(shopby.accessRestriction.initiate.bind(shopby.accessRestriction));
});

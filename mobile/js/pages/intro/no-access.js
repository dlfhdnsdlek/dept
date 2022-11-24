/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author choisohyun
 *  @since 2021.7.8
 *
 */

$(() => {
  shopby.intro.noAccess = {
    async initiate() {
      await this.render();
    },
    render() {
      $('#noAccess').render({
        mall: shopby.cache.getMall().mall,
      });
    },
  };

  shopby.start.initiate(shopby.intro.noAccess.initiate.bind(shopby.intro.noAccess));
});

/*
 *  © 2021. NHN Commerce Corp. All rights reserved.
 *  NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 *  @author hyeyeon-park
 *  @since 2021.7.2
 */

(() => {
  class SlideImages {
    constructor($parent, option, callback) {
      this.$el = $parent;
      this.option = option;
      this.callback = callback;
      this.render($parent, option);
      this.moveSliderImages();
    }

    render($parent, option) {
      const compiled = Handlebars.compile($('#slideImagesPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);
      //$(this.$el).render(this.option);
    }

    moveSliderImages() {
      $('.layer_add_file_slide').slick({
        infinite: true,
        speed: 500,
        initialSlide: this.option.clickedImageIndex ? this.option.clickedImageIndex : 0,
      });
    }
  }
  shopby.registerPopupConstructor('slide-images', SlideImages);
})();

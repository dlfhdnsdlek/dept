/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Daejoong Son
 * @since 2021.7.14
 */

(() => {
  const convertData = data => {
    // 렌더링에 필요한 변수 설정
    data.imageListBoxSize = {
      width: data.popupSlideInfo.slideMinWidth,
      height: data.popupSlideInfo.slideMinHeight,
    };

    switch (data.popupSlideInfo.slideCount) {
      case 'TWO_BY_ONE':
        data.imageListBoxSize.width *= 2;
        break;
      case 'THREE_BY_ONE':
        data.imageListBoxSize.width *= 3;
        break;
      case 'FOUR_BY_ONE':
        data.imageListBoxSize.width *= 4;
        break;
      case 'TWO_BY_TWO':
        data.imageListBoxSize.width *= 2;
        data.imageListBoxSize.height *= 2;
        break;
      case 'THREE_BY_TWO':
        data.imageListBoxSize.width *= 3;
        data.imageListBoxSize.height *= 2;
        break;
      case 'FOUR_BY_TWO':
        data.imageListBoxSize.width *= 4;
        data.imageListBoxSize.height *= 2;
        break;
    }

    data.popupSlideInfo.slidesToScroll =
      data.popupSlideInfo.slideDirection === 'LEFT' || data.popupSlideInfo.slideDirection === 'UP' ? -1 : 1;

    return data;
  };

  class Multi {
    constructor(data) {
      this.data = convertData(data);

      this.$el = $('<div />', {
        id: 'design-popup-' + this.data.popupNo,
      });

      this.render();
      this.bindEvents();

      this.renderSlider();
    }

    render() {
      $('body').append(this.$el);

      const compiled = Handlebars.compile($('#designPopupMultiTemplate').html());
      this.$el.html($(compiled({ ...this.data })));

      // 위치 설정
      this.$el.css({
        position: 'absolute',
        left: this.data.detailInfo.screenType === 'WINDOW' ? 0 : this.data.detailInfo.screenLeftPosition,
        top: this.data.detailInfo.screenType === 'WINDOW' ? 0 : this.data.detailInfo.screenTopPosition,
        'z-index': 101,
      });
    }

    bindEvents() {
      this.$el.on('click', '#design-popup-close', this._close.bind(this)).on('change', '#design-popup-today', () => {
        if (this.$el.find('#design-popup-today input').is(':checked')) {
          this._close();
        }
      });

      if (this.data.detailInfo.screenType === 'LAYER') {
        let dragStartX, dragStartY;
        let elementLeft, elementTop;

        this.$el
          .attr('draggable', true)
          .on('dragstart', e => {
            dragStartX = e.pageX;
            dragStartY = e.pageY;
            elementLeft = Number(this.$el.css('left').replace('px', ''));
            elementTop = Number(this.$el.css('top').replace('px', ''));
          })
          .on('dragover', e => {
            e.preventDefault();

            var left = elementLeft + e.pageX - dragStartX;
            if (left < 0) {
              left = 0;
            }
            var top = elementTop + e.pageY - dragStartY;
            if (top < 0) {
              top = 0;
            }

            this.$el.css({ left: left, top: top });
          });
      }
    }

    _close() {
      this.$el.remove();

      if (this.data.detailInfo.screenType === 'FIXED_TOP') {
        $('body .top_area').height('0px');
      }

      if (this.$el.find('#design-popup-today input').is(':checked')) {
        if (shopby.isWindowPopup()) {
          window.opener.shopby.designPopup.setInvisibleToday(this.data.popupNo);
        } else {
          shopby.designPopup.setInvisibleToday(this.data.popupNo);
        }
      }

      if (shopby.isWindowPopup()) {
        window.close();
      }
    }

    /**
     * 슬라이더 렌더링 (렌더링 및 이벤트까지 한번에)
     */
    renderSlider() {
      // 렌더링
      const slideOption = {
        draggable: false,
        autoplay: true,
        autoplaySpeed: (this.data.popupSlideInfo.slideSpeed || 4) * 1000,
        arrows: false,
        vertical:
          this.data.popupSlideInfo.slideDirection === 'UP' || this.data.popupSlideInfo.slideDirection === 'DOWN',
        slidesToScroll: this.data.popupSlideInfo.slidesToScroll,
        infinite: true,
        speed: this.data.popupSlideInfo.slideDirection === 'FIXED' ? 0 : 500,
        slidesToShow: 1,
      };

      const $sliderWrap = this.$el.find('#design-popup-big-slider-wrap');
      $sliderWrap.slick(slideOption);

      slideOption.autoplay = false;

      const { slideMinWidth, slideMinHeight, slideMaxWidth, slideMaxHeight } = this.data.popupSlideInfo;
      const bWindow = this.data.detailInfo.screenType === 'WINDOW';

      this.data.popupSlideInfo.slideImages.map((slideImage, index) => {
        const slickItem =
          `<div style="width: ${slideMaxWidth}px; height: ${slideMaxHeight}px; overflow:hidden;"` +
          `<a href="javascript:void(0)" onclick="shopby.designPopup.onClickMultiPopup(${slideImage.landingUrl}, ${
            slideImage.openLocationTarget !== 'SELF'
          }, ${bWindow})">` +
          `<img src="${slideImage.mainImageUrl}" style="with: ${slideMaxWidth}px; height: ${slideMaxHeight}px;" alt="${slideImage.mainImageUrl}" />` +
          `</a></div>`;

        $sliderWrap.slick('slickAdd', slickItem);

        const $smallSliderWrap = this.$el.find('#design-popup-small-slide-wrap-' + index);
        $smallSliderWrap.slick(slideOption);

        const { thumbImageUrl, thumbImageUrlOnOver, landingUrl, openLocationTarget } = slideImage;
        const target = openLocationTarget === 'SELF' ? '_self' : '_blank';
        const smallImages = [{ main: thumbImageUrl, sub: thumbImageUrlOnOver }];
        smallImages.map(smallImage => {
          const smallSlickItem =
            `<div class="smallImageWrap" style="width: ${slideMinWidth}px; height: ${slideMinHeight}px; overflow:hidden;">` +
            `<a href="${landingUrl}" target="${target}">` +
            `<img class="smallImage" src="${smallImage.main}" data-sub="${smallImage.sub}" data-main="${smallImage.main}" style="with: ${slideMinWidth}px; height: ${slideMinHeight}px;" alt="${smallImage.sub}" />` +
            `</a></div>`;

          $smallSliderWrap.slick('slickAdd', smallSlickItem);
        });
      });

      // 이벤트 바인딩
      const slickGoToNotAnimation = ($slick, index) => {
        $slick.slick('slickSetOption', 'slidesToScroll', 1);
        $slick.slick('slickSetOption', 'speed', 0);
        $slick.slick('slickGoTo', index);
        $slick.slick('slickSetOption', 'speed', this.data.popupSlideInfo.slideDirection === 'FIXED' ? 0 : 500);
        $slick.slick('slickSetOption', 'slidesToScroll', this.data.popupSlideInfo.slidesToScroll);
      };

      this.$el
        .on('beforeChange', '#design-popup-big-slider-wrap', (event, slick, currentSlide, nextSlide) => {
          const $pre = this.$el.find('.sb_div_slide_current');
          if (!$pre.hasClass('sb_div_slide_pause')) {
            $pre.slick('slickNext');
          }
          $pre.removeClass('sb_div_slide_current');

          const $next = this.$el.find('#design-popup-small-slide-wrap-' + nextSlide);
          if (!$next.hasClass('sb_div_slide_pause')) {
            $next.slick('slickNext');
          }
          $next.addClass('sb_div_slide_current');
        })
        .on('click', '.mp_item', e => {
          slickGoToNotAnimation($sliderWrap, $(e.currentTarget).data('slide-index'));
        })
        .on('mouseover', '.mp_item', e => {
          const $this = $(e.currentTarget);
          $this.addClass('sb_div_slide_pause');

          const $target = $(e.target);
          const subImage = $target.data().sub;
          $target.attr('src', subImage);
          if (!$this.hasClass('sb_div_slide_current')) {
            slickGoToNotAnimation($this, 1);
          }
        })
        .on('mouseleave', '.mp_item', e => {
          const $this = $(e.currentTarget);

          $this.removeClass('sb_div_slide_pause');

          const $target = $(e.target);
          const mainImage = $target.data().main;
          $target.attr('src', mainImage);

          if (!$this.hasClass('sb_div_slide_current')) {
            slickGoToNotAnimation($this, 0);
          }
        });

      const $current = this.$el.find('#design-popup-small-slide-wrap-0').addClass('sb_div_slide_current');
      slickGoToNotAnimation($current, 1);
    }
  }

  shopby.designPopup.Multi = Multi;
})();

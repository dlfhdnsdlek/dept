/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Daejoong Son
 * @since 2021.7.14
 */

(() => {
  class Normal {
    constructor(data) {
      this.data = data;

      this.$el = $('<div />', {
        id: 'design-popup-' + this.data.popupNo,
      });

      this.render();
      this.bindEvents();
    }

    render() {
      const isFixedTop = this.data.detailInfo.screenType === 'FIXED_TOP';

      if (isFixedTop) {
        $('body .top_area').append(this.$el);
      } else {
        $('body').append(this.$el);
      }

      const compiled = Handlebars.compile($('#designPopupNormalTemplate').html());
      this.$el.html($(compiled({ ...this.data, isFixedTop })));

      // css 조정
      if (this.data.detailInfo.screenType === 'FIXED_TOP') {
        this.$el.css({
          width: '100%',
        });

        if (this.data.detailInfo.resizable) {
          this.$el.find('.top_banner_content img').css({
            width: '100%',
          });
        }

        this.$el.find('.mobile_top_banner').css({
          position: 'absolute',
          'margin-left': this.data.detailInfo.screenLeftPosition,
          'margin-top': this.data.detailInfo.screenTopPosition,
          width: this.data.detailInfo.screenWidth + (this.data.detailInfo.screenWidthUnit === 'PERCENT' ? '%' : 'px'),
          height:
            this.data.detailInfo.screenHeight + (this.data.detailInfo.screenHeightUnit === 'PERCENT' ? '%' : 'px'),
          background: this.data.detailInfo.bgColor,
          'overflow-x': 'hidden',
        });

        const topHeight = $('body .top_area').height();
        const height =
          shopby.platform === 'mobile'
            ? this.$el.find('.mobile_top_banner').height()
            : this.$el.find('.pc_top_banner').height();

        if (height > topHeight) {
          $('body .top_area').height(height + 'px');
        } else {
          $('body .top_area').height(topHeight + 'px');
        }
      } else {
        let popupLeft = this.data.detailInfo.screenLeftPosition;
        let popupTop = this.data.detailInfo.screenTopPosition;
        let popupWidth =
          this.data.detailInfo.screenWidth + (this.data.detailInfo.screenWidthUnit === 'PERCENT' ? '%' : 'px');
        let popupHeight =
          this.data.detailInfo.screenHeight + (this.data.detailInfo.screenHeightUnit === 'PERCENT' ? '%' : 'px');

        if (this.data.detailInfo.screenType === 'WINDOW') {
          popupLeft = 0;
          popupTop = 0;
          popupWidth = window.innerWidth - 35;
          popupHeight = window.innerHeight - 90;
        }

        this.$el.css({
          position: 'absolute',
          left: popupLeft,
          top: popupTop,
          'z-index': 101,
        });

        this.$el.find('.sys_pop').css({
          background: this.data.detailInfo.bgColor,
        });

        if (this.data.detailInfo.resizable) {
          this.$el.find('.box .view img').css({
            width: '100%',
          });
        }

        this.$el.find('.box .view').css({
          width: popupWidth,
          height: popupHeight,
          overflow: 'scroll',
        });
      }
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
  }

  shopby.designPopup.Normal = Normal;
})();

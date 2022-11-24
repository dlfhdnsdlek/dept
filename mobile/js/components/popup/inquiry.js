/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-14
 */

(() => {
  class Inquiry {
    constructor($parent, option, callback) {
      const compiled = Handlebars.compile($('#inquiryPopupTemplate').html());
      this.$el = $(compiled(option));
      $parent.append(this.$el);

      this.option = option;
      this.callback = callback;
      this.inquiryTypes = shopby.cache.getMall().inquiryType;
      this.originData = null;

      this.initiate();
    }
    initiate() {
      this.setOption();
      this.render();
      this.bindEvents();
    }
    setOption() {
      const defaultOption = {
        title: '',
        content: '',
        inquiryType: this.inquiryTypes[0],
        imageUrls: [],
        originalImageUrls: [],
        type: 'registration',
      };
      this.option = Object.assign(defaultOption, this.option);
    }
    render() {
      const { name } = shopby.cache.getBoardsConfig().inquiryConfig;
      $('.h_tit').text(name);
      this.renderInquiryContents();
      this.originData = this.updateInquiryData();
    }
    renderInquiryContents() {
      $('#inquiryContents').render(this.generateInquiryData());
    }
    bindEvents() {
      this.$el
        .on('input paste', 'textarea[name="content"], input[name="title"]', this.onInputText)
        .on('change', 'input[type="file"]', this.onChangeAttachments.bind(this))
        .on('click', '#attachmentImage', this.onClickDeleteBtn.bind(this))
        .on('click', '.btn_box, .close_btn', this.onClickSaveBtn.bind(this));
    }
    onChangeAttachments(event) {
      const uploadImageCallback = (data, { name }) => {
        this.option.imageUrls.push(data.imageUrl);
        this.option.originalImageUrls.push(name);
        this.updateInquiryData();
        this.renderInquiryContents();
      };
      shopby.helper.attachments.onChangeAttachments(event, uploadImageCallback, this.option.imageUrls.length);
    }

    generateInquiryData() {
      const {
        answerMailTemplateUsed,
        answerSmsTemplateUsed,
        attachmentUsed,
        smsUsed,
        emailUsed,
      } = shopby.cache.getBoardsConfig().inquiryConfig;
      const { imageUrls, type } = this.option;
      const hasSmsNotification = smsUsed && answerSmsTemplateUsed;
      const hasEmailNotification = emailUsed && answerMailTemplateUsed;

      return {
        hasAnswerNotifications: hasSmsNotification || hasEmailNotification,
        hasAttachment: attachmentUsed || imageUrls.length > 0,
        inquiryTypesDisabled: type !== 'registration',
        inquiryTypes: this.inquiryTypes,
        hasEmailNotification,
        hasSmsNotification,
        attachmentUsed,
        ...this.option,
      };
    }
    onInputText({ target }) {
      const pattern = shopby.regex.noCommonSpecial;
      const { value } = target;

      if (value.match(pattern)) {
        $(target).val(value.replace(pattern, ''));
      }

      const maxLength = target.getAttribute('maxlength');
      $(target).next().text(`${value.length}/${maxLength}`);
    }

    onClickDeleteBtn({ target }) {
      const { type } = target.dataset;
      if (type !== 'delete') return;

      shopby.confirm({ message: '첨부파일을 삭제하시겠습니까?' }, ({ state }) => {
        if (state !== 'ok') return;
        const index = $(target).closest('li').data('image-id');

        this.option.imageUrls.splice(index, 1);
        this.option.originalImageUrls.splice(index, 1);
        this.updateInquiryData();
        this.renderInquiryContents();
      });
    }
    onClickSaveBtn({ target }) {
      const { type } = target.dataset;
      switch (type) {
        case 'negative':
          this.cancelBtnHandler();
          break;
        case 'positive':
          this.saveBtnHandler();
          break;
        default:
          break;
      }
    }
    cancelBtnHandler() {
      const currentData = this.updateInquiryData();
      if (!shopby.utils.isEqual(this.originData, currentData)) {
        shopby.confirm({ message: '변경된 정보를 저장하지 않고 이동하시겠습니까?' }, ({ state }) => {
          if (state !== 'ok') return;
          this.close();
        });
      } else {
        this.close();
      }
    }
    async saveBtnHandler() {
      try {
        this.validateInquiry();
        const data = this.updateInquiryData();
        const requestBody = {
          inquiryTitle: data.title,
          inquiryContent: data.content,
          originalFileName: data.originalImageUrls,
          uploadedFileName: data.imageUrls,
          answerSmsSendYn: data.answerSmsSend,
          answerEmailSendYn: data.answerEmailSend,
        };
        this.option.type === 'registration'
          ? await this.postInquiry(data, requestBody)
          : await this.putInquiry(data, requestBody);
        this.close();
      } catch (e) {
        shopby.alert(e.message);
      }
    }
    updateInquiryData() {
      this.option.title = this.$el.find('input[name="title"]').val();
      this.option.content = this.$el.find('textarea[name="content"]').val();
      this.option.inquiryTypeNo = this.$el.find('select[name="type"] option:selected').data('type');
      this.option.answerSmsSend = this.$el.find('input[id="smsAgree"]').is(':checked');
      this.option.answerEmailSend = this.$el.find('input[id="emailAgree"]').is(':checked');
      return { ...this.option, imageUrls: [...this.option.imageUrls] };
    }
    validateInquiry() {
      const title = this.$el.find('input[name="title"]').val();
      const content = this.$el.find('textarea[name="content"]').val();
      if (title === '') {
        throw new Error('제목을 입력해주세요.');
      }
      if (content === '') {
        throw new Error('내용을 입력해주세요.');
      }
    }
    async postInquiry({ inquiryTypeNo }, requestBody) {
      try {
        requestBody.inquiryTypeNo = inquiryTypeNo;
        await shopby.api.manage.postInquiries({ requestBody });
        shopby.alert('문의가 등록되었습니다.', () => this.callback());
      } catch (e) {
        console.error(e);
      }
    }
    async putInquiry({ inquiryNo }, requestBody) {
      try {
        const request = {
          pathVariable: {
            inquiryNo: inquiryNo.toString(),
          },
          requestBody,
        };
        await shopby.api.manage.putInquiriesInquiryNo(request);
        shopby.alert('문의가 수정되었습니다.', () => this.callback());
      } catch (e) {
        console.error(e);
      }
    }
  }

  shopby.registerPopupConstructor('inquiry', Inquiry);
})();

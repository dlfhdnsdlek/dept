/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author Eunbi Kim
 * @since 2021-7-14
 */

$(() => {
  shopby.my.inquiry = {
    $inquiryDetail: $('#inquiryDetail'),
    inquiryNo: shopby.utils.getUrlParam('inquiryNo'),
    inquiryConfig: shopby.cache.getBoardsConfig().inquiryConfig,
    inquiryDetail: null,
    attachImages: null,

    async initiate() {
      shopby.my.menu.init('#myPageLeftMenu');
      this.render();
      await this.fetchInquiry(this.inquiryNo);
      this.getAttachmentImages();
      this.bindEvents();
    },
    render() {
      $('.inquiriesName').render({ name: this.inquiryConfig.name });
    },
    renderInquiryDetail() {
      this.$inquiryDetail.render({
        ...this.inquiryDetail,
        inquiryContent: this.inquiryDetail.inquiryContent.replace(shopby.regex.space, '<br/>'),
      });
    },
    async fetchInquiry() {
      try {
        const pathVariable = {
          inquiryNo: this.inquiryNo,
        };
        const { data } = await shopby.api.manage.getInquiriesInquiryNo({ pathVariable });
        this.inquiryDetail = data;
        const answerRegisterYmdt =
          (this.inquiryDetail && this.inquiryDetail.answer && this.inquiryDetail.answer.answerRegisterYmdt) || '';
        this.inquiryDetail.answerRegisterYmd =
          answerRegisterYmdt && answerRegisterYmdt.length > 0 ? answerRegisterYmdt.split(' ')[0] : '';
        this.renderInquiryDetail();
      } catch (e) {
        console.error(e);
      }
    },
    bindEvents() {
      this.$inquiryDetail
        .on('click', '.btn_right_box', this.onClickDeleteOrEditBtn.bind(this))
        .on('click', '.add_file_area', this.onClickAttachmentImages.bind(this));
    },
    onClickDeleteOrEditBtn({ target }) {
      const { type } = target.dataset;
      switch (type) {
        case 'delete':
          this.deleteBtnHandler();
          break;
        case 'edit':
          this.editBtnHandler();
          break;
        default:
          break;
      }
    },
    getAttachmentImages() {
      this.attachImages = this.inquiryDetail.imageUrls.map(imageUrl => ({ imageUrl }));
    },
    onClickAttachmentImages({ target }) {
      shopby.popup('slide-images', {
        title: '첨부파일',
        imageObjectList: this.attachImages,
        clickedImageIndex: $(target.closest('li')).index(),
      });
    },
    deleteBtnHandler() {
      shopby.confirm({ message: '문의글을 삭제하시겠습니까?' }, ({ state }) => {
        if (state !== 'ok') return;
        this.fetchDeleteInquiries();
      });
    },
    fetchDeleteInquiries() {
      try {
        const pathVariable = {
          inquiryNo: this.inquiryNo,
        };
        shopby.api.manage.deleteInquiriesInquiryNo({ pathVariable });
        shopby.alert('삭제되었습니다.', () => location.replace('/pages/my/inquiries.html'));
      } catch (e) {
        console.error(e);
      }
    },
    editBtnHandler() {
      const {
        inquiryNo,
        inquiryTitle,
        inquiryContent,
        imageUrls,
        answerSmsSend,
        answerEmailSend,
        inquiryType,
        originalImageUrls,
      } = this.inquiryDetail;
      shopby.popup(
        'inquiry',
        {
          type: 'modification',
          title: inquiryTitle,
          content: inquiryContent,
          answerSmsSend,
          answerEmailSend,
          imageUrls,
          inquiryType,
          originalImageUrls,
          inquiryNo,
        },
        data => {
          if (data && data.state === 'close') return;
          this.fetchInquiry();
        },
      );
    },
  };
  shopby.start.initiate(shopby.my.inquiry.initiate.bind(shopby.my.inquiry));
});

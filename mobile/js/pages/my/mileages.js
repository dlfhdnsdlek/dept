/*
 * © NHN Commerce Corp. All rights reserved.
 * NHN Corp. PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 *
 * @author HyeYeon Park
 * @author JongKeun Kim
 * @since 2021.7.13
 */

$(() => {
  shopby.mileages = {
    initiate() {
      this.my.initiate();
      this.search.initiate();

      window.onpopstate = this.onPopState.bind(this);
    },

    get accumulationConfig() {
      return shopby.cache.getMall().accumulationConfig;
    },

    onPopState() {
      this.search.search();
    },

    my: {
      initiate() {
        this.accumulations.initiate().catch(console.error);
      },

      accumulations: {
        async initiate() {
          const summary = await this._getData();
          const {
            accumulations: { totalAmt },
          } = summary;
          const accumulationConfig = shopby.mileages.accumulationConfig;
          this.render(totalAmt, accumulationConfig);
        },
        async _getData() {
          return shopby.api.member.getProfileSummary().then(({ data }) => data);
        },
        render(totalAmt, accumulationConfig) {
          const { accumulationUnit, accumulationName } = accumulationConfig;
          $('.accumulation_top_box').render({ totalAmt, accumulationUnit, accumulationName });
          $('#accumulationTitle').render({ accumulationName });
        },
      },
    },

    search: {
      dateRange: null,
      pagination: null,
      initiate() {
        this.renderComponents();
        this.search();
      },
      renderComponents() {
        this.renderSearchForm();
        this.renderPagination();
      },
      renderSearchForm() {
        this.dateRange = new shopby.dateRange('#dateSelector', this.search.bind(this, true));
      },
      renderPagination() {
        this.pagination = new shopby.readMore(this.appendMileages.bind(this), '#btnMoreMileages', 5);
      },

      search() {
        this.pagination.pageNumber = 1;
        this.fetchMileages().then(data => {
          const { totalCount } = data;
          shopby.mileages.content.render(data);
          this.pagination.render(totalCount);
        });
      },
      async fetchMileages() {
        const { pageSize, pageNumber } = this.pagination;
        const { start, end } = this.dateRange;

        const request = {
          queryString: {
            pageNumber,
            pageSize,
            orderStatusType: 'BUY_CONFIRM',
            startYmd: start,
            endYmd: end,
          },
        };

        return shopby.api.manage.getProfileAccumulations(request).then(({ data }) => data);
      },
      async appendMileages() {
        const { items, totalCount } = await this.fetchMileages();
        const mileages = shopby.mileages.content.getMileages(items);
        const $mileages = $('#mileages');
        const compiled = Handlebars.compile($mileages.html());
        $mileages
          .parent()
          .find('tbody')
          .append($(compiled(mileages)).find('tr'));
        this.pagination.render(totalCount);
      },
    },

    content: {
      render(data) {
        const { items } = data;
        const res = this.getMileages(items);
        const mileages = res.map(mileage => ({
          ...mileage,
          isNoExpirationDate: this.isNoExpirationDate(mileage.expireYmdt),
        }));
        this.renderMileages(mileages);
      },
      get operatorEnum() {
        return {
          GIVE_AVAILABLE: '+',
          GIVE_CANCELED: '-',
          SUBTRACTION_USED: '-',
          SUBTRACTION_CANCELED: '+',
        };
      },
      getMileages(items) {
        return items.map(items => ({
          ...items,
          operator: this.operatorEnum[items.accumulationStatus], // '+'|'-'
        }));
      },
      renderMileages(data) {
        const $mileages = $('#mileages');
        const compiled = Handlebars.compile($mileages.html());
        $mileages.next().remove();
        $mileages.parent().append(compiled(data));
      },
      isNoExpirationDate(expireYmdt) {
        return expireYmdt && expireYmdt.split('-')[0] === '9999';
      },
    },
  };

  shopby.start.initiate(shopby.mileages.initiate.bind(shopby.mileages));
});

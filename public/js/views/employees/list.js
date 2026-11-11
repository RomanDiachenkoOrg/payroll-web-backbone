define([
  'jquery',
  'underscore',
  'backbone',
  'collections/employees',
  'collections/departments',
  'utils/format',
  'utils/paginate',
  'utils/errors',
  'text!templates/employees/list.html',
  'text!templates/employees/rows.html'
], function ($, _, Backbone, Employees, Departments, format, paginate, errors, listTpl, rowsTpl) {
  'use strict';

  var PER_PAGE = 10;

  var EmployeeListView = Backbone.View.extend({
    template: _.template(listTpl),
    rowsTemplate: _.template(rowsTpl),

    events: {
      'input #employee-search': 'onSearch',
      'keyup #employee-search': 'onSearch',
      'change #filter-department': 'onFilter',
      'change #filter-status': 'onFilter',
      'click th.sortable': 'onSort',
      'click .pagination a': 'onPage',
      'click .js-deactivate': 'onDeactivate',
      'click .js-activate': 'onActivate'
    },

    initialize: function () {
      this.employees = new Employees();
      this.departments = new Departments();
      this.criteria = _.extend({ q: '', departmentId: '', status: 'active', sortBy: 'name', sortDir: 'asc' },
        EmployeeListView.lastCriteria || {});
      this.page = 1;
      this.loaded = false;
      this.onSearch = _.debounce(this.onSearch, 200);

      var self = this;
      $.when(this.employees.fetch(), this.departments.fetch())
        .done(function () {
          self.loaded = true;
          self.render();
        })
        .fail(function (xhr) {
          if (xhr.status !== 401) { window.App.flash.error(errors.fromXhr(xhr).message); }
        });
      this.listenTo(this.employees, 'change:active', this.renderRows);
    },

    render: function () {
      this.$el.html(this.template({
        criteria: this.criteria,
        departments: this.departments.toJSON(),
        canEdit: window.App.session.can('employees:edit')
      }));
      if (this.loaded) {
        this.renderRows();
      }
      return this;
    },

    renderRows: function () {
      var list = this.employees.query(this.criteria, this.departments);
      var pages = paginate.pageCount(list.length, PER_PAGE);
      this.page = paginate.clamp(this.page, pages);
      var range = paginate.range(list.length, this.page, PER_PAGE);

      this.$('#employee-rows').html(this.rowsTemplate({
        employees: paginate.slice(list, this.page, PER_PAGE),
        departments: this.departments,
        fmt: format,
        canEdit: window.App.session.can('employees:edit')
      }));
      this.$('.list-summary').text(list.length
        ? 'Showing ' + range.from + '-' + range.to + ' of ' + list.length + ' employees'
        : 'No employees match your filters.');
      this.renderPager(pages);

      this.$('th.sortable').removeClass('sorted').find('.glyphicon').remove();
      this.$('th.sortable[data-sort="' + this.criteria.sortBy + '"]')
        .addClass('sorted')
        .append(' <span class="glyphicon glyphicon-triangle-' + (this.criteria.sortDir === 'desc' ? 'bottom' : 'top') + '"></span>');
    },

    renderPager: function (pages) {
      var $ul = this.$('.pagination').empty();
      if (pages <= 1) { return; }
      $ul.append('<li class="' + (this.page === 1 ? 'disabled' : '') + '"><a href="#" data-page="' + (this.page - 1) + '" aria-label="Previous">&laquo;</a></li>');
      for (var i = 1; i <= pages; i++) {
        $ul.append('<li class="' + (i === this.page ? 'active' : '') + '"><a href="#" data-page="' + i + '">' + i + '</a></li>');
      }
      $ul.append('<li class="' + (this.page === pages ? 'disabled' : '') + '"><a href="#" data-page="' + (this.page + 1) + '" aria-label="Next">&raquo;</a></li>');
    },

    saveCriteria: function () {
      EmployeeListView.lastCriteria = _.clone(this.criteria);
    },

    onSearch: function () {
      var q = $.trim(this.$('#employee-search').val());
      if (q === this.criteria.q) { return; }
      this.criteria.q = q;
      this.page = 1;
      this.saveCriteria();
      this.renderRows();
    },

    onFilter: function () {
      this.criteria.departmentId = this.$('#filter-department').val();
      this.criteria.status = this.$('#filter-status').val();
      this.page = 1;
      this.saveCriteria();
      this.renderRows();
    },

    onSort: function (e) {
      var key = $(e.currentTarget).data('sort');
      if (this.criteria.sortBy === key) {
        this.criteria.sortDir = this.criteria.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.criteria.sortBy = key;
        this.criteria.sortDir = 'asc';
      }
      this.saveCriteria();
      this.renderRows();
    },

    onPage: function (e) {
      e.preventDefault();
      var $li = $(e.currentTarget).parent();
      if ($li.hasClass('disabled') || $li.hasClass('active')) { return; }
      this.page = Number($(e.currentTarget).data('page'));
      this.renderRows();
    },

    onDeactivate: function (e) {
      var employee = this.employees.get($(e.currentTarget).data('id'));
      window.App.confirm({
        title: 'Deactivate employee',
        message: 'Deactivate ' + employee.fullName() + '? They will be excluded from future pay runs.',
        confirmLabel: 'Deactivate',
        danger: true
      }).done(function () {
        employee.deactivate()
          .done(function () { window.App.flash.success(employee.fullName() + ' has been deactivated.'); })
          .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
      });
    },

    onActivate: function (e) {
      var employee = this.employees.get($(e.currentTarget).data('id'));
      employee.activate()
        .done(function () { window.App.flash.success(employee.fullName() + ' is active again.'); })
        .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
    }
  });

  return EmployeeListView;
});

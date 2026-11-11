define([
  'jquery',
  'underscore',
  'backbone',
  'collections/departments',
  'collections/employees',
  'models/department',
  'views/departments/form',
  'views/employees/list',
  'utils/errors',
  'text!templates/departments/list.html'
], function ($, _, Backbone, Departments, Employees, Department, DepartmentFormView, EmployeeListView,
             errors, listTpl) {
  'use strict';

  var DepartmentListView = Backbone.View.extend({
    template: _.template(listTpl),

    events: {
      'click .js-new': 'create',
      'click .js-edit': 'edit',
      'click .js-delete': 'destroy',
      'click .js-show-employees': 'showEmployees'
    },

    initialize: function () {
      this.collection = new Departments();
      this.employees = new Employees();
      this.loaded = false;
      var self = this;
      $.when(this.collection.fetch(), this.employees.fetch())
        .done(function () {
          self.loaded = true;
          self.render();
          self.listenTo(self.collection, 'add remove change sort', self.render);
        })
        .fail(function (xhr) {
          if (xhr.status !== 401) { window.App.flash.error(errors.fromXhr(xhr).message); }
        });
    },

    render: function () {
      var employees = this.employees;
      this.$el.html(this.template({
        loaded: this.loaded,
        departments: this.collection.toJSON(),
        canEdit: window.App.session.can('departments:edit'),
        managerName: function (id) {
          var e = id && employees.get(id);
          return e ? e.fullName() : '-';
        }
      }));
      return this;
    },

    find: function (e) {
      return this.collection.get($(e.currentTarget).closest('tr').data('id'));
    },

    activeEmployees: function () {
      return new Employees(this.employees.filter(function (e) { return e.get('active'); }));
    },

    create: function () {
      new DepartmentFormView({
        model: new Department(),
        collection: this.collection,
        employees: this.activeEmployees()
      }).open();
    },

    edit: function (e) {
      new DepartmentFormView({
        model: this.find(e),
        collection: this.collection,
        employees: this.activeEmployees()
      }).open();
    },

    destroy: function (e) {
      var dept = this.find(e);
      window.App.confirm({
        title: 'Delete department',
        message: 'Delete the department ' + dept.get('name') + '? This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      }).done(function () {
        dept.destroy({ wait: true })
          .done(function () { window.App.flash.success('Department ' + dept.get('name') + ' deleted.'); })
          .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
      });
    },

    // jump to the employee list filtered by this department
    showEmployees: function (e) {
      var dept = this.find(e);
      EmployeeListView.lastCriteria = _.extend({}, EmployeeListView.lastCriteria, { departmentId: String(dept.id) });
    }
  });

  return DepartmentListView;
});

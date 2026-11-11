define([
  'jquery',
  'underscore',
  'views/common/modal',
  'utils/forms',
  'utils/errors',
  'text!templates/departments/form.html'
], function ($, _, ModalView, forms, errors, formTpl) {
  'use strict';

  var DepartmentFormView = ModalView.extend({
    bodyTemplate: _.template(formTpl),

    initialize: function (options) {
      this.collection = options.collection;
      this.employees = options.employees;
      this.title = this.model.isNew() ? 'New department' : 'Edit ' + this.model.get('name');
      this.submitLabel = this.model.isNew() ? 'Create department' : 'Save changes';
    },

    templateData: function () {
      return {
        d: this.model.toJSON(),
        employees: this.employees.map(function (e) { return e.toJSON(); })
      };
    },

    onSubmit: function () {
      var $form = this.$('form');
      var data = forms.serialize($form);
      var attrs = {
        name: $.trim(data.name),
        code: $.trim(data.code).toUpperCase(),
        costCenter: $.trim(data.costCenter),
        managerEmployeeId: data.managerEmployeeId ? Number(data.managerEmployeeId) : null
      };
      var errs = this.model.validate(_.extend({}, this.model.attributes, attrs));
      if (errs) {
        forms.showErrors($form, errs);
        return;
      }
      var self = this;
      var isNew = this.model.isNew();
      this.setBusy(true);
      this.model.save(attrs, { wait: true, validate: false })
        .done(function () {
          if (isNew) { self.collection.add(self.model); }
          self.collection.sort();
          window.App.flash.success('Department ' + self.model.get('name') + (isNew ? ' created.' : ' saved.'));
          self.close();
        })
        .fail(function (xhr) {
          var err = errors.fromXhr(xhr);
          forms.showErrors($form, err.fields);
          self.showError(err.message);
          self.setBusy(false);
        });
    }
  });

  return DepartmentFormView;
});

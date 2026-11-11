define([
  'jquery',
  'underscore',
  'backbone',
  'models/employee',
  'collections/departments',
  'collections/simple',
  'utils/forms',
  'utils/errors',
  'text!templates/employees/form.html',
  'text!templates/employees/deduction-row.html'
], function ($, _, Backbone, Employee, Departments, simple, forms, errors, formTpl, deductionRowTpl) {
  'use strict';

  var EmployeeFormView = Backbone.View.extend({
    template: _.template(formTpl),
    deductionRowTemplate: _.template(deductionRowTpl),

    events: {
      'submit #employee-form': 'save',
      'change input[name=payType]': 'togglePayType',
      'click .js-add-deduction': 'addDeduction',
      'click .js-remove-deduction': 'removeDeduction',
      'change select.deduction-type': 'defaultAmount',
      'click .js-cancel': 'cancel'
    },

    initialize: function (options) {
      this.model = new Employee(options.employeeId ? { id: Number(options.employeeId) } : {});
      this.departments = new Departments();
      this.deductionTypes = new simple.DeductionTypes();
      this.loaded = false;
      this.dirty = false;

      var self = this;
      var requests = [this.departments.fetch(), this.deductionTypes.fetch()];
      if (!this.model.isNew()) {
        requests.push(this.model.fetch());
      }
      $.when.apply($, requests)
        .done(function () {
          self.loaded = true;
          self.render();
        })
        .fail(function (xhr) {
          if (xhr.status === 404) {
            window.App.flash.error('Employee not found.');
            window.App.navigate('employees');
          }
        });
    },

    render: function () {
      if (!this.loaded) {
        this.$el.html('<div class="app-loading text-muted">Loading&hellip;</div>');
        return this;
      }
      this.$el.html(this.template({
        e: this.model.toJSON(),
        isNew: this.model.isNew(),
        departments: this.departments.toJSON()
      }));
      var self = this;
      _.each(this.model.get('deductions'), function (d) {
        self.appendDeductionRow(d);
      });
      this.togglePayType();
      this.$el.on('change.dirty', ':input', function () { self.dirty = true; });
      return this;
    },

    appendDeductionRow: function (d) {
      var $rows = this.$('#deduction-rows');
      $rows.append(this.deductionRowTemplate({
        d: d || { typeId: '', amount: '' },
        index: $rows.children().length,
        types: this.deductionTypes.toJSON()
      }));
      this.$('.no-deductions').toggleClass('hidden', $rows.children().length > 0);
    },

    addDeduction: function (e) {
      e.preventDefault();
      this.appendDeductionRow(null);
      this.$('#deduction-rows tr:last select').focus();
    },

    removeDeduction: function (e) {
      e.preventDefault();
      $(e.currentTarget).closest('tr').remove();
      // keep the input names contiguous for error mapping
      this.$('#deduction-rows tr').each(function (i) {
        $(this).find('.deduction-amount').attr('name', 'deduction' + i);
      });
      this.$('.no-deductions').toggleClass('hidden', this.$('#deduction-rows tr').length > 0);
    },

    defaultAmount: function (e) {
      var $sel = $(e.currentTarget);
      var $amount = $sel.closest('tr').find('.deduction-amount');
      var type = this.deductionTypes.get($sel.val());
      if (type && !$amount.val()) {
        $amount.val(type.get('defaultAmount'));
      }
    },

    togglePayType: function () {
      var hourly = this.$('input[name=payType]:checked').val() === 'hourly';
      this.$('.salary-group').toggleClass('hidden', hourly);
      this.$('.rate-group').toggleClass('hidden', !hourly);
    },

    readForm: function () {
      var data = forms.serialize(this.$('#employee-form'));
      var deductions = [];
      this.$('#deduction-rows tr').each(function () {
        var typeId = $(this).find('.deduction-type').val();
        if (typeId) {
          deductions.push({ typeId: Number(typeId), amount: $(this).find('.deduction-amount').val() });
        }
      });
      return {
        firstName: $.trim(data.firstName),
        lastName: $.trim(data.lastName),
        email: $.trim(data.email),
        phone: $.trim(data.phone),
        title: $.trim(data.title),
        departmentId: data.departmentId ? Number(data.departmentId) : null,
        payType: data.payType,
        annualSalary: data.payType === 'salaried' ? data.annualSalary : null,
        hourlyRate: data.payType === 'hourly' ? data.hourlyRate : null,
        hireDate: $.trim(data.hireDate),
        pensionOptIn: !!data.pensionOptIn,
        deductions: deductions
      };
    },

    save: function (e) {
      e.preventDefault();
      var $form = this.$('#employee-form');
      var attrs = this.readForm();
      var clientErrors = this.model.validate(_.extend({}, this.model.toJSON(), attrs));
      if (clientErrors) {
        forms.showErrors($form, clientErrors);
        this.$('.form-error').text('Please correct the highlighted fields.').removeClass('hidden');
        return;
      }
      forms.clearErrors($form);
      this.$('.form-error').addClass('hidden');

      var self = this;
      var wasNew = this.model.isNew();
      var $btn = this.$('button[type=submit]').prop('disabled', true);
      this.model.save(attrs, { wait: true, validate: false })
        .done(function () {
          self.dirty = false;
          window.App.navigate('employees/' + self.model.id);
          window.App.flash.success(self.model.fullName() + (wasNew ? ' has been added.' : ' has been updated.'));
        })
        .fail(function (xhr) {
          var err = errors.fromXhr(xhr);
          forms.showErrors($form, err.fields);
          self.$('.form-error').text(err.message).removeClass('hidden');
        })
        .always(function () {
          $btn.prop('disabled', false);
        });
    },

    cancel: function (e) {
      e.preventDefault();
      var target = this.model.isNew() ? 'employees' : 'employees/' + this.model.id;
      if (!this.dirty) {
        window.App.navigate(target);
        return;
      }
      window.App.confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Leave this page and discard them?',
        confirmLabel: 'Discard',
        danger: true
      }).done(function () {
        window.App.navigate(target);
      });
    }
  });

  return EmployeeFormView;
});

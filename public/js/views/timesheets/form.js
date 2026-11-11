define([
  'jquery',
  'underscore',
  'backbone',
  'models/timesheet',
  'collections/employees',
  'views/timesheets/reject',
  'utils/forms',
  'utils/errors',
  'utils/format',
  'utils/validators',
  'text!templates/timesheets/form.html'
], function ($, _, Backbone, Timesheet, Employees, RejectView, forms, errors, format, validators, formTpl) {
  'use strict';

  // Monday of the current week as YYYY-MM-DD
  function currentMonday() {
    var d = new Date();
    var offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return format.isoDate(d);
  }

  function weekDates(weekStart) {
    if (!validators.isDate(weekStart)) {
      return ['', '', '', '', '', '', ''];
    }
    var parts = weekStart.split('-');
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + i);
      out.push((d.getMonth() + 1) + '/' + d.getDate());
    }
    return out;
  }

  var TimesheetFormView = Backbone.View.extend({
    template: _.template(formTpl),

    events: {
      'submit #timesheet-form': 'saveDraft',
      'click .js-save-submit': 'saveAndSubmit',
      'click .js-delete': 'destroy',
      'click .js-approve': 'approve',
      'click .js-reject': 'reject',
      'input .hours-input': 'updateTotals',
      'change .hours-input': 'updateTotals',
      'change #ts-week-start': 'updateDates'
    },

    initialize: function (options) {
      var session = window.App.session;
      this.model = new Timesheet(options.timesheetId ? { id: Number(options.timesheetId) } : {
        weekStart: currentMonday(),
        employeeId: session.get('employeeId')
      });
      this.chooseEmployee = this.model.isNew() && session.can('timesheets:any-employee');
      this.employees = new Employees();
      this.loaded = false;

      var self = this;
      var requests = [];
      if (!this.model.isNew()) { requests.push(this.model.fetch()); }
      if (this.chooseEmployee) { requests.push(this.employees.fetch()); }
      $.when.apply($, requests)
        .done(function () {
          self.loaded = true;
          self.render();
          self.listenTo(self.model, 'change:status', self.render);
        })
        .fail(function (xhr) {
          if (xhr.status === 404) {
            window.App.flash.error('Timesheet not found.');
            window.App.navigate('timesheets');
          }
        });
    },

    isEditable: function () {
      var session = window.App.session;
      return this.model.isEditable() &&
        (session.get('role') === 'admin' || this.model.isNew() || this.model.get('employeeId') === session.get('employeeId'));
    },

    canDecide: function () {
      var session = window.App.session;
      var ts = this.model;
      if (ts.isNew() || ts.get('status') !== 'Submitted') { return false; }
      if (session.get('role') === 'admin') { return true; }
      return session.get('role') === 'manager' &&
        ts.get('departmentId') === session.get('departmentId') &&
        ts.get('employeeId') !== session.get('employeeId');
    },

    render: function () {
      if (!this.loaded) {
        this.$el.html('<div class="app-loading text-muted">Loading&hellip;</div>');
        return this;
      }
      this.$el.html(this.template({
        t: this.model.toJSON(),
        isNew: this.model.isNew(),
        editable: this.isEditable(),
        canDecide: this.canDecide(),
        chooseEmployee: this.chooseEmployee,
        employees: _.map(this.employees.filter(function (e) { return e.get('active'); }), function (e) { return e.toJSON(); }),
        days: Timesheet.DAYS,
        dates: weekDates(this.model.get('weekStart')),
        fmt: format
      }));
      this.updateTotals();
      return this;
    },

    readForm: function () {
      var $form = this.$('#timesheet-form');
      var data = forms.serialize($form);
      var hours = [];
      for (var i = 0; i < 7; i++) {
        hours.push(data['hours' + i]);
      }
      var attrs = {
        weekStart: $.trim(data.weekStart || ''),
        hours: hours,
        notes: data.notes || ''
      };
      if (this.chooseEmployee) {
        attrs.employeeId = data.employeeId ? Number(data.employeeId) : null;
      }
      return attrs;
    },

    updateTotals: function () {
      var hours = _.map(this.$('.hours-input'), function (input) { return $(input).val(); });
      var preview = new Timesheet({ hours: hours });
      this.$('.ts-total').text(format.hours(preview.total()));
      this.$('.ts-overtime').text(preview.overtime() ? format.hours(preview.overtime()) : '-');
    },

    updateDates: function () {
      var dates = weekDates($.trim(this.$('#ts-week-start').val()));
      this.$('.day-name').each(function (i) { $(this).text(dates[i]); });
    },

    save: function (thenSubmit) {
      var $form = this.$('#timesheet-form');
      var attrs = this.readForm();
      forms.clearErrors($form);
      this.$('.form-error').addClass('hidden');

      var errs = this.model.validate(_.extend({}, this.model.attributes, attrs)) || {};
      if (this.chooseEmployee && !attrs.employeeId) {
        errs.employeeId = 'Select an employee.';
      }
      if (!_.isEmpty(errs)) {
        forms.showErrors($form, errs);
        return;
      }

      attrs.hours = _.map(attrs.hours, Number);
      var self = this;
      var wasNew = this.model.isNew();
      this.$('.form-actions .btn').prop('disabled', true);
      this.model.save(attrs, { wait: true, validate: false })
        .done(function () {
          if (thenSubmit) {
            self.model.submit()
              .done(function () {
                window.App.flash.success('Timesheet submitted for approval.');
                window.App.navigate('timesheets');
              })
              .fail(function (xhr) {
                window.App.flash.error(errors.fromXhr(xhr).message);
              });
          } else {
            window.App.flash.success('Timesheet saved as draft.');
            if (wasNew) {
              window.App.router.navigate('timesheets/' + self.model.id, { replace: true });
            }
            self.render();
          }
        })
        .fail(function (xhr) {
          var err = errors.fromXhr(xhr);
          self.$('.form-error').text(err.message).removeClass('hidden');
          forms.showErrors($form, err.fields);
          self.$('.form-actions .btn').prop('disabled', false);
        });
    },

    saveDraft: function (e) {
      e.preventDefault();
      this.save(false);
    },

    saveAndSubmit: function (e) {
      e.preventDefault();
      this.save(true);
    },

    destroy: function () {
      var model = this.model;
      window.App.confirm({
        title: 'Delete timesheet',
        message: 'Delete this draft timesheet for the week of ' + format.date(model.get('weekStart')) + '?',
        confirmLabel: 'Delete',
        danger: true
      }).done(function () {
        model.destroy({ wait: true })
          .done(function () {
            window.App.flash.success('Timesheet deleted.');
            window.App.navigate('timesheets');
          })
          .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
      });
    },

    approve: function () {
      var model = this.model;
      model.approve()
        .done(function () { window.App.flash.success('Approved timesheet of ' + model.get('employeeName') + '.'); })
        .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
    },

    reject: function () {
      new RejectView({ model: this.model }).open();
    }
  });

  return TimesheetFormView;
});

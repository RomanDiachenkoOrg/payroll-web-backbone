/*
 * Settings / administration: tax brackets & rates, users, audit log.
 * One view with a sub-template per tab (#settings/rates, #settings/users, #settings/audit).
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'models/settings',
  'collections/simple',
  'collections/departments',
  'utils/format',
  'utils/forms',
  'utils/errors',
  'text!templates/settings/index.html',
  'text!templates/settings/rates.html',
  'text!templates/settings/users.html',
  'text!templates/settings/audit.html'
], function ($, _, Backbone, Settings, simple, Departments, format, forms, errors,
             indexTpl, ratesTpl, usersTpl, auditTpl) {
  'use strict';

  function pct(rate) {
    return Math.round(Number(rate) * 10000) / 100;
  }

  function fromPct(value) {
    if (value === '' || value === null || value === undefined) { return ''; }
    return Math.round(Number(value) * 100) / 10000;
  }

  var SettingsView = Backbone.View.extend({
    template: _.template(indexTpl),
    ratesTemplate: _.template(ratesTpl),
    usersTemplate: _.template(usersTpl),
    auditTemplate: _.template(auditTpl),

    events: {
      'submit #rates-form': 'saveRates',
      'click .js-reset': 'resetRates',
      'click .js-add-bracket': 'addBracket',
      'click .js-remove-bracket': 'removeBracket',
      'change .bracket-to': 'syncBrackets',
      'submit #audit-filter': 'filterAudit',
      'click .js-clear': 'clearAudit'
    },

    initialize: function (options) {
      this.tab = _.indexOf(['rates', 'users', 'audit'], options.tab) >= 0 ? options.tab : 'rates';
      this.auditFilter = SettingsView.lastAuditFilter || { entity: '', action: '', user: '', from: '', to: '' };
    },

    render: function () {
      this.$el.html(this.template({ tab: this.tab }));
      this[this.tab]();
      return this;
    },

    $tab: function () {
      return this.$('.settings-tab');
    },

    fail: function (xhr) {
      if (xhr.status !== 401) { window.App.flash.error(errors.fromXhr(xhr).message); }
    },

    // ---- tax & rates ----

    rates: function () {
      var self = this;
      this.settings = new Settings();
      this.settings.fetch()
        .done(function () {
          self.draft = self.settings.toJSON();
          self.renderRates();
        })
        .fail(_.bind(this.fail, this));
    },

    renderRates: function () {
      this.$tab().html(this.ratesTemplate({ s: this.draft, pct: pct }));
    },

    // copy the current inputs back into this.draft (keeps edits when adding/removing rows)
    readRates: function () {
      var data = forms.serialize(this.$('#rates-form'));
      var brackets = _.map(this.draft.taxBrackets, function (b, i, all) {
        return {
          from: data['from' + i] === '' ? '' : Number(data['from' + i]),
          to: i === all.length - 1 ? null : (data['to' + i] === '' ? '' : Number(data['to' + i])),
          rate: fromPct(data['rate' + i])
        };
      });
      this.draft = {
        currency: this.draft.currency,
        taxBrackets: brackets,
        socialRate: fromPct(data.socialRate),
        pensionRate: fromPct(data.pensionRate),
        payDay: data.payDay
      };
      return this.draft;
    },

    syncBrackets: function () {
      var self = this;
      this.$('.bracket-to').each(function () {
        var i = Number(this.name.replace('to', ''));
        self.$('[name="from' + (i + 1) + '"]').val($(this).val());
      });
    },

    addBracket: function () {
      this.readRates();
      var list = this.draft.taxBrackets;
      var last = list[list.length - 1];
      last.to = Number(last.from) + 1000;
      list.push({ from: last.to, to: null, rate: last.rate });
      this.renderRates();
    },

    removeBracket: function (e) {
      this.readRates();
      var index = Number($(e.currentTarget).data('index'));
      var list = this.draft.taxBrackets;
      list.splice(index, 1);
      // re-link the bounds so the brackets stay contiguous
      for (var i = 0; i < list.length; i++) {
        list[i].from = i === 0 ? 0 : list[i - 1].to;
      }
      list[list.length - 1].to = null;
      this.renderRates();
    },

    resetRates: function () {
      this.draft = this.settings.toJSON();
      this.renderRates();
    },

    saveRates: function (e) {
      e.preventDefault();
      var $form = this.$('#rates-form');
      var attrs = this.readRates();
      var self = this;
      forms.clearErrors($form);
      this.$('.form-error').addClass('hidden');
      this.$('#save-rates').prop('disabled', true);
      this.settings.save(attrs, { wait: true })
        .done(function () {
          self.draft = self.settings.toJSON();
          self.renderRates();
          window.App.flash.success('Settings saved.');
        })
        .fail(function (xhr) {
          var err = errors.fromXhr(xhr);
          self.$('.form-error').text(err.message).removeClass('hidden');
          // server reports rates as fractions; the form shows percent
          forms.showErrors($form, err.fields);
          self.$('#save-rates').prop('disabled', false);
        });
    },

    // ---- users ----

    users: function () {
      var self = this;
      var users = new simple.Users();
      var departments = new Departments();
      $.when(users.fetch(), departments.fetch())
        .done(function () {
          self.$tab().html(self.usersTemplate({
            users: users.toJSON(),
            departments: departments,
            fmt: format
          }));
        })
        .fail(_.bind(this.fail, this));
    },

    // ---- audit log ----

    audit: function () {
      var self = this;
      var log = new simple.AuditLog();
      var params = _.pick(this.auditFilter, function (v) { return v !== ''; });
      log.fetch({ data: params })
        .done(function () {
          self.$tab().html(self.auditTemplate({
            entries: log.toJSON(),
            f: self.auditFilter,
            fmt: format
          }));
        })
        .fail(_.bind(this.fail, this));
    },

    filterAudit: function (e) {
      e.preventDefault();
      var data = forms.serialize(this.$('#audit-filter'));
      this.auditFilter = {
        entity: data.entity || '',
        action: data.action || '',
        user: $.trim(data.user || ''),
        from: $.trim(data.from || ''),
        to: $.trim(data.to || '')
      };
      SettingsView.lastAuditFilter = this.auditFilter;
      this.audit();
    },

    clearAudit: function () {
      this.auditFilter = { entity: '', action: '', user: '', from: '', to: '' };
      SettingsView.lastAuditFilter = null;
      this.audit();
    }
  });

  SettingsView.pct = pct;
  SettingsView.fromPct = fromPct;

  return SettingsView;
});

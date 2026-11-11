/*
 * Unit tests for the dependency-free AMD modules in public/js/utils,
 * loaded through the node build of RequireJS.
 */
'use strict';

var path = require('path');
var expect = require('chai').expect;
var requirejs = require('requirejs');

requirejs.config({
  baseUrl: path.join(__dirname, '..', '..', 'public', 'js'),
  nodeRequire: require
});

describe('client utils', function () {
  var validators, format, paginate, csv;

  before(function () {
    validators = requirejs('utils/validators');
    format = requirejs('utils/format');
    paginate = requirejs('utils/paginate');
    csv = requirejs('utils/csv');
  });

  describe('validators', function () {
    it('checks email addresses', function () {
      expect(validators.isEmail('jane@acme.test')).to.equal(true);
      expect(validators.isEmail('jane@acme')).to.equal(false);
      expect(validators.isEmail('')).to.equal(false);
    });

    it('accepts only positive numbers', function () {
      expect(validators.isPositiveNumber('12.5')).to.equal(true);
      expect(validators.isPositiveNumber('0')).to.equal(false);
      expect(validators.isPositiveNumber('-3')).to.equal(false);
      expect(validators.isPositiveNumber('abc')).to.equal(false);
      expect(validators.isPositiveNumber('')).to.equal(false);
    });

    it('validates calendar dates', function () {
      expect(validators.isDate('2026-02-28')).to.equal(true);
      expect(validators.isDate('2026-02-30')).to.equal(false);
      expect(validators.isDate('28/02/2026')).to.equal(false);
    });

    it('rejects hire dates in a later month', function () {
      expect(validators.isNotInFuture('2026-11-01', '2026-11-11')).to.equal(true);
      expect(validators.isNotInFuture('2026-12-01', '2026-11-11')).to.equal(false);
      expect(validators.isNotInFuture('2027-01-15', '2026-11-11')).to.equal(false);
    });

    it('knows Mondays', function () {
      expect(validators.isMonday('2026-11-09')).to.equal(true);
      expect(validators.isMonday('2026-11-10')).to.equal(false);
    });

    it('limits hours to 0-24', function () {
      expect(validators.isValidHours('0')).to.equal(true);
      expect(validators.isValidHours('24')).to.equal(true);
      expect(validators.isValidHours('24.5')).to.equal(false);
      expect(validators.isValidHours('')).to.equal(false);
    });
  });

  describe('format', function () {
    it('formats money', function () {
      expect(format.money(1234.5)).to.equal('$1,234.50');
      expect(format.money(-12)).to.equal('-$12.00');
      expect(format.money(null)).to.equal('');
    });

    it('formats dates', function () {
      expect(format.date('2026-11-03')).to.equal('Nov 3, 2026');
      expect(format.month('2026-09')).to.equal('September 2026');
    });

    it('formats percentages without float noise', function () {
      expect(format.percent(0.15)).to.equal('15%');
      expect(format.percent(0.035)).to.equal('3.5%');
    });
  });

  describe('paginate', function () {
    it('slices pages', function () {
      var list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      expect(paginate.slice(list, 2, 10)).to.deep.equal([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      expect(paginate.pageCount(20, 10)).to.equal(2);
      expect(paginate.pageCount(0, 10)).to.equal(1);
    });

    it('clamps the page number', function () {
      expect(paginate.clamp(0, 3)).to.equal(1);
      expect(paginate.clamp(7, 3)).to.equal(3);
      expect(paginate.clamp('2', 3)).to.equal(2);
    });

    it('computes the visible range', function () {
      expect(paginate.range(20, 2, 10)).to.deep.equal({ from: 11, to: 20 });
      expect(paginate.range(0, 1, 10)).to.deep.equal({ from: 0, to: 0 });
    });
  });

  describe('csv', function () {
    it('quotes cells when needed', function () {
      expect(csv.cell('plain')).to.equal('plain');
      expect(csv.cell('a,b')).to.equal('"a,b"');
      expect(csv.cell('say "hi"')).to.equal('"say ""hi"""');
    });

    it('builds a document with a header row', function () {
      var out = csv.build([{ key: 'name', label: 'Name' }, { key: 'n', label: 'N', format: function (v) { return v * 2; } }],
        [{ name: 'x', n: 2 }]);
      expect(out).to.equal('Name,N\r\nx,4\r\n');
    });
  });
});

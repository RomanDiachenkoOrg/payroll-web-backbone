# Acme Payroll - web client (Backbone.js)

Browser client for the Acme payroll / HR system: employees, weekly timesheets, monthly pay runs,
payslips, departments, cost reports and administration of tax rates.

It is a classic single page application from the Backbone era: AMD modules loaded with RequireJS,
Underscore templates, jQuery DOM handling and Bootstrap 3 styling. There is no build step - the
browser loads the files in `public/` and the third-party libraries checked into `vendor/`.

A small Express server (`server.js`) serves the static files and a REST API that keeps its data in
JSON files on disk, so the whole thing runs with a single command.

## Tech stack

| Layer      | Library                                   |
|------------|-------------------------------------------|
| MVC        | Backbone.js 1.1.2                         |
| DOM / Ajax | jQuery 1.11.3                             |
| Templates  | Underscore.js 1.7.0 (`_.template`) via the RequireJS `text!` plugin |
| Modules    | RequireJS 2.1 (AMD)                       |
| UI         | Bootstrap 3.3 (CSS + JS plugins: modal, dropdown, collapse, alert) |
| Server     | Node.js + Express 4, JSON file storage    |
| Tests      | Mocha + Chai + Supertest                  |
| Lint       | JSHint                                    |

## Prerequisites

- Node.js 18 or newer (tested with 20 and 24)
- npm 9+
- A browser (any evergreen browser; IE9+ should work for the client code)

## Running

```bash
npm install
npm start
```

Open <http://localhost:8080/>. Use `PORT=3000 npm start` to choose another port.

On the first start the server copies `data/seed/*.json` to `data/db/`; all changes are written to
`data/db/`. To start over with the demo data:

```bash
npm run reset-data
```

`DATA_DIR=/some/path npm start` stores the data somewhere else.

## Demo accounts

Password for all accounts: `Passw0rd!`

| Email                | Role     | Can do |
|----------------------|----------|--------|
| `admin@acme.test`    | Admin    | Everything: employees, pay runs, departments, settings, audit log |
| `manager@acme.test`  | Manager (Engineering) | Sees Engineering employees, approves / rejects their timesheets, pay runs (read-only), reports |
| `employee@acme.test` | Employee | Own profile and payslips, own timesheets |

## Screens / routes

Hash based routes (`public/js/router.js`):

| Route                     | Screen |
|---------------------------|--------|
| `#login`, `#logout`       | Sign in / sign out |
| `#` (empty)               | Dashboard: headcount, last payroll, pending timesheets, next pay date, cost by department |
| `#employees`              | Employee list: search, department / status filter, sorting, paging, deactivate |
| `#employees/new`, `#employees/:id/edit` | Employee form with validation and deductions |
| `#employees/:id`, `#me`   | Employee profile, salary history (add raise), payslips |
| `#timesheets`             | Timesheet list with status filter; submit, approve, reject with reason |
| `#timesheets/new`, `#timesheets/:id` | Weekly timesheet (Mon-Sun, 0-24 h per day) |
| `#payruns`                | Pay runs; create a new run for a period |
| `#payruns/:id`            | Pay run lines; calculate, approve, mark as paid (locked), CSV export |
| `#payslips/:id`           | Payslip breakdown, print view, CSV download |
| `#departments`            | Departments CRUD |
| `#reports`                | Payroll cost by department for a period, CSV export |
| `#settings/rates`         | Tax brackets, social / pension rates, pay day |
| `#settings/users`         | Users |
| `#settings/audit`         | Audit log with filters |

### Payroll rules

- Salaried: gross = annual salary / 12
- Hourly: rate x regular hours + 1.5 x rate x overtime (hours above 40 in a week, approved timesheets only)
- Income tax on monthly gross: 0% up to 1,000, 15% from 1,000 to 4,000, 25% above 4,000 (editable)
- Social contribution 5% of gross, pension 3% of gross for enrolled employees
- Other deductions (health insurance, parking, ...) per employee
- Net = gross - tax - social - pension - other, rounded half-up to cents, USD

## Project structure

```
server.js                 entry point (Express)
server/
  app.js                  app factory: middleware, API routes, static files
  store.js                JSON file store (data/db/*.json)
  auth.js                 sessions (cookie), password hashing, role checks
  payroll.js              pay calculation rules
  routes/                 REST endpoints (/api/...)
data/seed/                demo data copied to data/db on first start
scripts/                  build-seed.js (regenerates the seed), reset-data.js
public/
  index.html
  css/                    app.css, print.css
  js/
    main.js               RequireJS config
    app.js                global App namespace, bootstrapping
    router.js             hash routes + access checks
    session.js            current user, permissions
    models/  collections/ Backbone models and collections
    views/                Backbone views (one folder per area)
    templates/            Underscore templates (*.html)
    utils/                formatting, validation, CSV, paging, form helpers
vendor/                   jQuery, Underscore, Backbone, RequireJS, Bootstrap
test/
  server/                 API and payroll calculation tests
  client/                 tests for the AMD utility modules (loaded with r.js in Node)
```

## Tests

```bash
npm test        # mocha, runs headless in Node
npm run lint    # jshint
```

The client utility modules are AMD modules without browser dependencies, so they are loaded through
the Node build of RequireJS and tested together with the server code.

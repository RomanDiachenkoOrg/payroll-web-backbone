require.config({
  baseUrl: 'js',
  paths: {
    jquery: '/vendor/jquery/jquery-1.11.3.min',
    underscore: '/vendor/underscore/underscore-min',
    backbone: '/vendor/backbone/backbone-min',
    bootstrap: '/vendor/bootstrap/js/bootstrap.min',
    text: '/vendor/requirejs/text'
  },
  shim: {
    bootstrap: {
      deps: ['jquery'],
      exports: 'jQuery.fn.modal'
    }
  },
  urlArgs: 'v=1.4.2',
  waitSeconds: 30
});

require(['app'], function (App) {
  App.start();
});

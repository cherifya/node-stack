'use strict';

/* Filters */

angular.module('myApp.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]);

angular.module('myApp.filters', []).
  filter('startFrom', function() {
    return function(input, start) {
        start = Math.max(0, start);
        start = +start; //parse to int
        return input.slice(start);
    }
});

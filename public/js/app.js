'use strict';

String.prototype.gsSplitTags = function() {
  return this.split(',').map(function(x){
    return x.trim();
  });
};

// Get the union of n arrays
Array.prototype.union =
  function() {
    var a = [].concat(this);
    var l = arguments.length;
    for(var i=0; i<l; i++) {
      a = a.concat(arguments[i]);
    }
    return a.unique();
  };

// Return new array with duplicate values removed
Array.prototype.unique =
  function() {
    var a = [];
    var l = this.length;
    for(var i=0; i<l; i++) {
      for(var j=i+1; j<l; j++) {
        // If this[i] is found later in the array
        if (this[i] === this[j])
          j = ++i;
      }
      a.push(this[i]);
    }
    return a;
  };

// Remove values from an array optionally using a custom function
Array.prototype.remove =
  function(f) {
    if (!f)
      f = function(i) {return i == undefined || i == null ? true : false;};
    var l = this.length;
    var n = 0;
    for(var i=0; i<l; i++)
      f(this[i]) ? n++ : this[i-n] = this[i];
    this.length = this.length - n;
  };


// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
      templateUrl: 'partials/index',
      controller: IndexCtrl
    });
    $routeProvider.when('/profile', {
        templateUrl: 'partials/profile/index',
        controller: ProfileCtrl
    });
    /*$routeProvider.otherwise({
      redirectTo: '/'
    });*/
    $locationProvider.html5Mode(true);
  }]);
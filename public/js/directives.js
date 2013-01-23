'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
    .directive('dropdown', function () {
    return function (scope, elm, attrs) {
         $(elm).dropdown();
        };
    })
  .directive('bootTooltip', function($timeout) {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
          //console.log('linking...');
          //invoke x-editable init
          $timeout(function() {
            $(elm).tooltip({
              
            });
          });
        }
    };
  })
  .directive('profileEditable', function($timeout) {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
          //console.log('linking...');
          //invoke x-editable init
          $timeout(function() {
            $(elm).editable({
              emptytext: 'Click to edit',
              validate: function(value) {
                  if($.trim(value) == '') {
                      return 'This field is required';
                  }
              },
              success: function(response, newValue) {
                scope.successText = 'Profile successfully updated.';
                scope.$apply();
              } 
            });
          });
        }
    };
  });

'use strict';

/* Controllers */

function NavBarController($scope, $location) {
    $scope.onTwitterLogin = function()
    {
        // a direct window.location to overcome Angular intercepting your call!
        window.location = "/auth/twitter";
    };

    $scope.onGithubLogin = function()
    {
        // a direct window.location to overcome Angular intercepting your call!
        window.location = "/auth/github";
    };

    $scope.onLogout = function () {
        // a direct window.location to overcome Angular intercepting your call!
        window.location = "/logout";
    };

    $scope.navClass = function (page) {
        var currentRoute = $location.path().substring(1) || 'home';
        return page === currentRoute ? 'active' : '';
    };
}

function ContactFormCtrl($scope, $http, $location) {

  $scope.resetAlerts = function() {
    $scope.successText = null;
    $scope.errorText = null;
  };

  $scope.closeAlert = function() {
    $scope.resetAlerts();
  };

  $http({method: 'GET', url: '/api/user'}).
    success(function(data, status, headers, config) {
      $scope.name = data.user.name;
      $scope.email = data.user.email;
    }).
    error(function () {

    });

  $scope.submitMessage = function () {
    //clear messages
    $scope.resetAlerts();
    //$scope.$digest();

    if ($.trim($scope.email) == '') {
      $scope.errorText = 'Please fill in your email.';
      return;
    }
    else if ($.trim($scope.message) == '') {
      $scope.errorText = 'Please enter a message to send.';
      return;
    }

    $http.post('/feedback', {
      pk: 1,
      name: $scope.name,
      email: $scope.email,
      message: $scope.message
    }).
    success(function(data, status, headers, config) {
      $scope.successText = 'Message successfully sent. Thanks for your feedback.';
    }).
    error(function(data, status) {
      $scope.errorText = 'An error occured. Please try again.';
    });
  };
}

function ProfileCtrl($scope, $http, $location) {
  $scope.receiveNews = true;
  $scope.successText = null;
  $scope.errorText = null;

  var modelWatcher = function(newValue, oldValue) {
    if (newValue != oldValue) {
      $scope.editUser();
    }
  };

  $http({method: 'GET', url: '/api/user'}).
    success(function(data, status, headers, config) {
      $scope.receiveNews = data.user.newsletter;
      //$scope.text = data.post.text;
      $scope.$watch('receiveNews', modelWatcher);
    }).
    error(function () {
      $scope.$watch('receiveNews', modelWatcher);
    });

  $scope.editUser = function () {
    $http.post('/api/user', {
      pk: 1,
      name: 'newsletter',
      value: $scope.receiveNews
    }).
    success(function(data, status, headers, config) {
      $scope.successText = 'Profile successfully updated.';
    }).
    error(function(data, status) {
      $scope.errorText = 'An error occured. Please try again.';
    });
  };
}

function IndexCtrl($scope, $http, $filter) {
  $scope.stars = [];

  $scope.$on('$viewContentLoaded', function() {
    $(function(){
      // carousel demo
      $('#myCarousel').carousel();
    });
  });

  $scope.loading = true;

  $http({method: 'GET', url: '/api/stars'}).
  success(function(data, status, headers, config) {
    var stars = data.stars;
    //order by most recent stars
    $scope.stars = $filter('orderBy')(stars, '-pushed_at');
    //$scope.resetStars();

    $scope.loading = false;
  }).
  error(function (data, status, headers, config) {
    // TODO: display a nice error message?
    $scope.errorText = "Sorry. Cannot get data from the server. Please try again.";

    $scope.loading = false;
  });
}

function LoginCtrl($scope,$location)
{
    $scope.onLoginClick = function()
    {
        // a direct window.location to overcome Angular intercepting your call!
        window.location = "/auth/github";
    };
}

function AddPostCtrl($scope, $http, $location) {
  $scope.submitPost = function () {
    $http.post('/api/addPost', {
      title: $scope.title,
      text: $scope.text
    }).
    success(function(data, status, headers, config) {
      $location.path('/');
    });
  };
}

function ReadPostCtrl($scope, $http, $routeParams) {
  $http({method: 'GET', url: '/api/post/' + $routeParams.id}).
    success(function(data, status, headers, config) {
      $scope.post = data.post;
    });
}

function EditPostCtrl($scope, $http, $location, $routeParams) {
  $http({method: 'GET', url: '/api/post/' + $routeParams.id}).
    success(function(data, status, headers, config) {
      $scope.title = data.post.title;
      $scope.text = data.post.text;
    });

  $scope.editPost = function () {
    $http.post('/api/editPost', {
      id: $routeParams.id,
      title: $scope.title,
      text: $scope.text
    }).
    success(function(data, status, headers, config) {
      $location.path('/readPost/' + $routeParams.id);
    });
  };
}

function DeletePostCtrl($scope, $http, $location, $routeParams) {
  $http({method: 'GET', url: '/api/post/' + $routeParams.id}).
    success(function(data, status, headers, config) {
      $scope.post = data.post;
    });

  $scope.deletePost = function () {
    $http.post('/api/deletePost', {
      id: $routeParams.id
    }).
    success(function(data, status, headers, config) {
      $location.path('/');
    });
  };

  $scope.home = function () {
    $location.path('/');
  };
}

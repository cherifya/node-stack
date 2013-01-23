var everyauth = require('everyauth'),
    conf = require('./conf'),
    Users = require('./models/users'),
    request = require('request'),
    logger = require('tracer').console({level: conf.app.logLevel});

module.exports = function () {

    /**
     * EVERYAUTH AUTHENTICATION
     * -------------------------------------------------------------------------------------------------
     * allows users to log in and register using OAuth services
     **/

    everyauth.debug = true;

    // Configure Facebook auth
    var usersById = {},
        nextUserId = 0,
        usersByFacebookId = {},
        usersByTwitId = {},
        usersByGhId = {};

    everyauth.
        everymodule.
        findUserById(function (id, callback) {
            
            Users.find(id, function(err, user) {
                //console.log("Find user.  typeof id:", typeof id);
                //console.log("Found user ", user);

                //Jugglingdb-mongo replace ids by their string representation
                //We don't want that or it will mess up our queries down the line
                if(typeof user.id === 'string') {
                    user.id = Users.schema.ObjectID(user.id);
                }

                callback(err, user);
            });
            //callback(null, usersById[id]);
        });


    everyauth
      .github
      .scope('repo')
      .appId(conf.github.appId)
      .appSecret(conf.github.appSecret)
      .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {

        var promise = this.Promise();
        Users.findOrCreateUser(accessToken, ghUser, promise);

        promise.callback(function(value) {
            var user = value;
            logger.log("Registered user: ", user);
            //console.log("Typeof id:", typeof user.id);
            //update user's repos

            user.refreshStars();
        });
        return promise;
      })
      .redirectPath('/');
      
      logger.log('Github auth support activated...');
};
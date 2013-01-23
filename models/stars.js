var models = require('./index'),
    request = require('request'),
    conf = require('../conf'),
    qs = require('querystring'),
    logger = require('tracer').console({level: conf.app.logLevel});

var Star = models.Star;

// find or create a star relation between userId and repoId
// callback(err, instance)
Star.findOrCreateStar = function (userId, repoId, callback) {
    //logger.log('%s <--> %s ?', userId, repoId);

    if (!callback) {
        //our default callback only prints an error if any
        callback = function (err, star) {
            logger.log(err);
        };
    }

    if (arguments.length < 2) {

        return new Error("Provide userId and repoId.");

    } else {
        //find or create a star
        Star.findOne({where: {userId: userId, repoId: repoId}}, function (err, star) {
            if (star) {

                //star exists
                star.unstarred = false;
                star.save({}, function (err) {
                    if (err) {
                        logger.error("Error updating star ", star.id);
                        return callback(err);
                    }

                    //update id and return
                    if(typeof star.id === 'string') {
                        star.id = Star.schema.ObjectID(star.id);
                    }

                    callback(null, star);
                });

            }
            else {
                //star doesn't exist. create
                Star.create({userId: userId, repoId: repoId}, function(err, star) {
                    if (err) {
                        logger.log('Error creating star: ', err);
                        return callback(err);
                    }

                    //logger.log('%s <--> %s', userId, repoId);

                    callback(null, star);
                });
            }
        });

    }
};

Star.prototype.unstarOnGithub = function(user, callback) {
    if (!user) callback(new Error("Need access token. Provide user object."));
    var star = this;
    
    this.repo(function(err, repo) {
        if (err) callback(err);

        var params = {
            access_token : user.accessToken
        };

        var url = conf.github.endpoint + '/user/starred/' + repo.owner_login + '/' + repo.name + '?' ;
        url += qs.stringify(params);

        logger.log('DELETE ', url);

        request.del({url: url, headers: {"Authorization": "bearer "+ user.accessToken}}, function(err, response) {
            logger.log('Error %s, Response ', err, response.statusCode, response.body, response.headers);
            if (!err && response.statusCode == 204) { //github returns 204 when the repo is unstared
                //delete successfull. return ourselve for chaining purposes
                callback(null, star);
            }
            else {
                //return error
                if (err) callback(err);
                else callback(new Error('Error when unstaring on Github: ' + response.body));
            }
        });
    });
};

module.exports = Star;
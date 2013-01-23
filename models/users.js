var models = require('./index'),
    request = require('request'),
    conf = require('../conf'),
    qs = require('querystring'),
    Repo = require('./repos'),
    Star = require('./stars'),
    logger = require('tracer').console({level: conf.app.logLevel}),
    Step = require('step');

var User = models.User;

var parseLinkHeader = function(link) {
    var comps = {},
        parts = link.split(',');
    parts.forEach(function(p) {
        var tmp = p.split(';');
        if (tmp.length === 2) {
            var url = tmp[0],
                rel = tmp[1];
            rel = rel.trim();
            //rel="next"
            rel = rel.substring(5, rel.length - 1);
            //<http://www.example.com>
            url = url.trim();
            url = url.substring(1, url.length - 1);

            comps[rel] = url;
        }
    });

    return comps;
};

//return true if response has a link header with a next component
var hasNextPage =  function(response) {
    if(!response || !response.headers || !response.headers.link) return false;

    var link = parseLinkHeader(response.headers.link);
    var result = (typeof link['next'] !== 'undefined');

    return result;
};

var getNextPage =  function(response, callback) {
    if(!response || !response.headers || !response.headers.link) return null;

    var link = parseLinkHeader(response.headers.link);

    if (typeof link.next !== undefined) {
        return link.next;
    }
    else return null;
};

var getLastPage =  function(response) {
    if(!response || !response.headers || !response.headers.link) return null;

    var link = parseLinkHeader(response.headers.link);

    if (typeof link.last !== undefined) {
        return link.last;
    }
    else return null;
};

// recursively load all pages of a REST API
// it uses the Link header to follow all pages
// callback(err, all_results)
var loadAllPages = function(url, callback) {

    var allStars = [];

    var getNext = function(res, results) {
        //logger.log('Get Next Page...', res.headers);
        //add results to buffer
        allStars = allStars.concat(results);

        //check if any more results
        if (hasNextPage(res)) {
            //load next page
            var nextUrl = getNextPage(res);
            logger.log('Loading next url : ', nextUrl);
            request.get({url: nextUrl, json: true }, function(err, response, stars) {
                if (!err && response.statusCode == 200) {
                    getNext(response, stars);
                }
                else {
                    callback(err, allStars);
                }
            });
        }
        else {
            //no more pages to load. return all results
            callback(null, allStars);
        }

    };

    request.get({url: url, json: true }, function(err, response, stars) {
        if (!err && response.statusCode == 200) {
            getNext(response, stars);
        }
        else {
            callback(err, allStars);
        }
    });

};

// find or create a user from Github auth data
//returns the promise object passed
User.findOrCreateUser = function (accessToken, sourceUser, promise) {
    var user;
    logger.log("Github responded with user ", sourceUser);
    if (arguments.length === 1) {

        return promise.fail(new Error("No github user provided."));

    } else {
    	//we do not want to use github id as our UUID
    	//so we rename it to gid. Our framework will automatically generate a UUID
        sourceUser.gid = sourceUser.id;
        delete sourceUser.id;
        sourceUser.accessToken = accessToken;

        //find or create a user
        User.findOne({where: {gid: sourceUser.gid}}, function (err, user) {
        	if (user) {
                //logger.log("DB returned user: ", user);
                user.accessToken = sourceUser.accessToken;
        		user.save(sourceUser, function (err) {

        		});
        		//user exists
        		//update and return
        		promise.fulfill(user);
        	}
        	else {
        		//user doesn't exist. create
        		User.create(sourceUser, function(err, user) {
		        	if (err) {
		        		logger.log('Error saving User: ', err);
		        		return promise.fail(err);
		        	}

		        	promise.fulfill(user);
		        });
        	}
        });

    }

    return promise;
};

User.prototype.refreshStars = function(cb) {
    var oauth = 
        { client_id: conf.github.appId
        , client_secret: conf.github.appSecret
        , access_token: this.accessToken
        }
      , url = conf.github.endpoint + '/users/' + this.login + '/starred?'
      , params = {
        access_token: this.accessToken,
        per_page: 100
      } ;
    url += qs.stringify(params);

    //if no callback given, implement placeholder to throw errors
    var callback = null;
    if (!cb) {
        callback = function (err, stars) {
            if (err) throw err;
        };
    }
    else callback = cb;
    // we wrap callback in our own inner come back to get a chance
    // to update user status
    cb = function (err, stars) {
        //flag user as not updating anymore before exiting
        //update user status
        user.updating = false;
        user.save();

        callback(err, stars);
    };

    var user = this;

    //first make sure that last update was at least 10 min ago
    var now = Date.now();
    var lastSync = user.synced_at;

    if (lastSync && ((now - lastSync)/(1000*60)) < 10) {
        //return list of all user stars
        return Star.all({where :{userId: user.id}}, cb);
    }

    //flag user as being updated with github
    user.updating = true;
    user.save();

    var processStars = function(err, gStars) {
        if (err) {
            logger.error("Error retrieving users starred repos : ", err);

            return cb(err);
        }
        
        logger.log("%d stars returned from Github...", gStars.length);

        Step(
            function updateOrCreateRepos () {
                var group = this.group();

                //update our stars database
                gStars.forEach(function(gStar) {
                    //init unstarred attribute to false since Github returned it
                    gStar.unstarred = false;

                    //create or update repo
                    Repo.findOrCreateRepo(gStar, group());
                });

            },

            function updateOrCreateStars (err, repos) {
                if (err) return cb(err);

                var group = this.group();

                //update our stars database
                repos.forEach(function(repo) {
                    //create or update  star
                    Star.findOrCreateStar(user.id, repo.id, group());
                });

            },

            function updateDeletedStars (err, stars) {
                if (err) return cb(err);

                var group = this.group();

                //for all stars not returned from github
                //set unstarred attribute to false
                var updatedStarsIds = stars.map(function (s) {return s.id;});
                logger.log('Updated %d stars in DB.', stars.length);

                Star.all({
                    where: {
                        userId: user.id,
                        _id: {
                            nin: updatedStarsIds
                        }
                    }
                },
                function (err, dstars) {
                    if (err) return cb(err);

                    logger.log('Found %d unsstarred stars in DB. Marking them...', dstars.length);

                    dstars.forEach(function (deletedStar) {
                        deletedStar.unstarred = true;
                        deletedStar.save(group());
                    });
                });
            },

            function returnResult(err, dstars) {
                if (err) return cb(err);

                //update last sync date
                user.synced_at = Date.now();
                user.save();

                //return list of all user stars
                Star.all({where :{userId: user.id}}, cb);
            }
        );
    };

    //now actually load ALL stars from github (not just first page)
    loadAllPages(url, processStars);
};

module.exports = User;
var models = require('./index'),
    request = require('request'),
    conf = require('../conf'),
    qs = require('querystring'),
    logger = require('tracer').console({level: conf.app.logLevel});

var Repo = models.Repo;

// find or create a user from Github auth data
//returns the promise object passed
//callback(err, instance)
Repo.findOrCreateRepo = function (repoData, callback) {
    
    //logger.log("Github responded with repo ", repoData);
    if (arguments.length !== 2) {

        return new Error("No github repo provided.");

    } else {
        //we do not want to use github id as our UUID
        //so we rename it to gid. Our framework will automatically generate a UUID
        repoData.gid = repoData.id;
        delete repoData.id;

        repoData.owner_type = repoData.owner.type;
        repoData.owner_login = repoData.owner.login;
        repoData.owner_gid = repoData.owner.id;
        repoData.owner_avatar_url = repoData.owner.avatar_url;

        //find or create a repo
        Repo.findOne({where: {gid: repoData.gid}}, function (err, repo) {
            if (err) return callback(err);

            if (repo) {
                //repo exists
                //update and return

                //update frequently changing fields
                repo.watchers_count = repoData.watchers_count;
                repo.forks_count = repoData.forks_count;
                repo.pushed_at = repoData.pushed_at;
                repo.updated_at = repoData.updated_at;
                repo.created_at = repoData.created_at;

                repo.save({}, function (err) {
                    if (err) {
                        logger.error("Error updating repo ", repo.full_name);
                        return callback(err);
                    }

                    callback(null, repo);
                });
                
            }
            else {
                //repo doesn't exist. create
                Repo.create(repoData, function(err, repo) {
                    if (err) {
                        logger.error('Error saving repo: ', err);
                        return callback(err);
                    }

                    logger.log('Added repo %s ... ', repo.full_name);

                    callback(null, repo);
                });
            }
        });

    }
};

module.exports = Repo;
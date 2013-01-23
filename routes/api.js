var conf = require('../conf'),
  Users = require('../models/users'),
  Repos = require('../models/repos'),
  Stars = require('../models/stars'),
  request = require('request'),
  Step = require('step'),
  logger = require('tracer').console({level: conf.app.logLevel}),
  scrapers = require('../github-scrapers');

/*
 * Serve JSON to our AngularJS client
 */

function error(status, msg) {
  var err = new Error(msg);
  err.status = status;
  return err;
}

// GET /api/stars
exports.stars = function (req, res) {

  req.user.stars(function(err, stars) {
    if (err) throw err;

    Step(
      function readStarsRepo() {

        var group = this.group();
        stars.forEach(function(star) {
          star.repo(group());
        });
      },
      function processStarsAndRepos(err, repos) {
        if (err ) {
          res.json(500, {
            error: "Server error" + err
          });
          return;
        }

        var newRepos = [];

        //add star data to each repo
        repos.map(function(repo, i){
          if(repo) {
            //add star id to repo
            repo = repo.toObject();
            repo['star_id'] = stars[i].id;
            repo['tags'] = stars[i].tags;
            repo['unstarred'] = stars[i].unstarred;
            newRepos.push(repo);
          }
        });

        //return results
        res.json({
          stars: newRepos
        });
      }
    );

  });
};

// GET /api/updatestars
// Refresh stars from github
exports.updateStars = function (req, res) {

  //throw an error if request too frequent
  var now = Date.now();
  var lastSync = req.user.synced_at;

  if (lastSync && ((now - lastSync)/(1000*60)) < 10) {
      throw new Error("Please wait 10 min between refresh.");
  }

  req.user.refreshStars(function(err, stars) {
    if (err) throw err;

    Step(
      function readStarsRepo() {

        var group = this.group();
        stars.forEach(function(star) {
          star.repo(group());
        });
      },

      function processStarsAndRepos(err, repos) {
        if (err ) throw err;

        var newRepos = [];

        //add star data to each repo
        repos.map(function(repo, i){
          if(repo) {
            //add star id to repo
            repo = repo.toObject();
            repo['star_id'] = stars[i].id;
            repo['tags'] = stars[i].tags;
            repo['unstarred'] = stars[i].unstarred;
            newRepos.push(repo);
          }
        });

        //return results
        res.json({
          stars: newRepos
        });
      }
    );

  });
};

//GET /api/star/:id
exports.star = function (req, res) {
  var id = req.params.id;

  Stars.find(id, function (err, star) {
    if (err || !star) {
      res.json(404, {
        error: "Unknown id."
      });
      return;
    }
    
    if (!star.userId.equals(req.user.id)) {
      res.json(401, {
        error: "Permission denied."
      });
      return;
    }

    star.repo( function (err, repo){
      if(repo) {
        //add star id to repo
        repo = repo.toObject();
        repo['star_id'] = star.id;
        repo['tags'] = star.tags;
      }
      res.json({
        star: repo
      });
    });

  });

};

// POST /api/stars
exports.editStars = function (req, res) {
  var pks = req.body.pk,
    tags = req.body.tags;

  //we are expecting an array of ids and tags
  if (Object.prototype.toString.apply(pks) !== '[object Array]') pks = [pks];
  if (Object.prototype.toString.apply(tags) !== '[object Array]') tags = [tags];

  Step(
    function readStarRecords() {
      var group = this.group();

      pks.forEach(function(pk) {
        Stars.find(pk, group());
      });
    },

    function processStars(err, stars) {
      if (err) throw err;

      var group = this.group();

      stars.forEach(function(star, i) {
        if (!star.userId.equals(req.user.id)) {
          throw new Error("Permission denied.");
        }
        star.tags = tags[i];
        star.save({}, group());
      });
    },

    function returnResults(err) {
      if (err) throw err;

      //OK. all fine
      return res.json();
    }
  );
};

// DELETE /api/stars
exports.deleteStars = function (req, res) {
  var pks = req.body.pk || req.body.pks;

  //we are expecting an array of ids and tags
  if (Object.prototype.toString.apply(pks) !== '[object Array]') pks = [pks];
  //if (Object.prototype.toString.apply(tags) !== '[object Array]') tags = [tags];

  Step(
    function readStarRecords() {
      var group = this.group();

      pks.forEach(function(pk) {
        Stars.find(pk, group());
      });
    },

    function deleteStarsOnGithub(err, stars) {
      if (err) throw err;

      var group = this.group();

      stars.forEach(function(star, i) {
        //make sure the stars belong to the loggedin user
        if (!star.userId.equals(req.user.id)) {
          throw new Error("Permission denied.");
        }
        
        star.unstarOnGithub(req.user, group());
      });
    },

    function deleteStarsInDb(err, stars) {
      if (err) throw err;

      var group = this.group();

      stars.forEach(function(star, i) {
        
        star.destroy(group());
      });
    },

    function returnResults(err) {
      if (err) throw err;

      //OK. all fine
      return res.json(true);
    }
  );
};

//GET /api/user
exports.user = function (req, res) {
  //if we are here, it means user is logged.
  //send user data
  res.json({
    user: req.user.toObject()
  });

};

// POST /api/user
exports.editUser = function (req, res) {

  var pk = req.body.pk,
      name = req.body.name,
      value = req.body.value;


  Step(

    function processChanges(err) {
      if (err) throw err;

      var user = req.user;

      user[name] = value;

      //save in db
      user.save({}, this); //pass this as callback function
    },

    function returnResults(err) {
      if (err) throw err;

      //OK. all fine
      return res.json(true);
    }
  );
};

// GET /popular/starred
exports.popularStarred = function (req, res) {

  scrapers.githubPopularStarred(function(err, stars) {
    if (err) throw err;

    //return results
    res.json({
      starred: stars
    });

  });
};

// GET /popular/starred
exports.popularForked = function (req, res) {

  scrapers.githubPopularForked(function(err, stars) {
    if (err) throw err;

    //return results
    res.json({
      starred: stars
    });

  });
};

// GET /popular/starred
exports.popularInteresting = function (req, res) {

  scrapers.githubInteresting(function(err, stars) {
    if (err) throw err;

    //return results
    res.json({
      starred: stars
    });

  });
};

exports.deletePost = function (req, res) {
  var id = req.body.id;

  if (id >= 0 && id < data.posts.length) {
    data.posts.splice(id, 1);
    res.json(true);
  } else {
    res.json(false);
  }
};

exports.addPost = function (req, res) {
  data.posts.push(req.body);
  res.json(req.body);
};
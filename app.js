
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    everyauth = require('everyauth'),
    conf = require('./conf'),
    api = require('./routes/api'),
    RedisStore = require('connect-redis')(express),
    logger = require('tracer').console({level: conf.app.logLevel});

require('./github-auth')();

var app = module.exports = express();

// create an error with .status. we
// can then use the property in our
// custom error handler (Connect repects this prop as well)

function error(status, msg) {
  var err = new Error(msg);
  err.status = status;
  return err;
}

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });
  app.use(express.logger());
  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(conf.app.passphrase)); //hubstars hash
  // production only
  if ('production' == app.get('env')) {
    //in production user RedisStore for session management
    app.use(express.session({ store: new RedisStore({db: 'hubstars'}), secret: conf.app.passphrase, cookie: { maxAge: conf.app.sessiontimeout } }));
  }
  else {
    //development
    //app.use(express.session({ store: new RedisStore({db: 'hubstars'}), secret: conf.app.passphrase }));
    //default to memory store session
    app.use(express.session({ secret: conf.app.passphrase, cookie: { maxAge: conf.app.sessiontimeout } }));
  }

  //everyauth middleware : twitter, facebook... sso
  app.use(everyauth.middleware());

  //session messages middleware
  app.use(function(req, res, next){
    var err = req.session.error
      , msg = req.session.success
      , user = req.user;

    //console.log("User session : ", req.session);
    
    res.locals.message = '';
    if (err) {
      delete req.session.error;
      res.locals.message = '<p class="msg error">' + err + '</p>';
    }
    if (msg) {
      delete req.session.success;
      res.locals.message = '<p class="msg success">' + msg + '</p>';
    }

    res.locals.currentUser = undefined;
    if (req.user) res.locals.currentUser = req.user;

    res.locals.loggedIn = false;
    if (req.loggedIn) res.locals.loggedIn = req.loggedIn;

    next();
  });

  //make sure request to /api subpaths are authentication
  app.use('/api', function(req, res, next){

    // key isnt present
    if (!req.user) return next(error(400, 'Unauthorized request. Please login.'));

    next();
  });

  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

  //error middleware
  app.use(function(err, req, res, next){
    logger.error(err.stack);
    // whatever you want here, feel free to populate
    // properties on `err` to treat it differently in here.
    res.send(err.status || 500, { error: err.message });
  });

  // our custom JSON 404 middleware. Since it's placed last
  // it will be the last middleware called, if all others
  // invoke next() and do not respond.
  app.use(function(req, res){
    res.status(404).render('404');
  });
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

// Routes
app.get('/', routes.index);
app.get('/trends', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API

app.get('/api/stars', api.stars);
app.get('/api/star/:id', api.star);
app.post('/api/stars', api.editStars);

app.get('/api/user', api.user);
app.post('/api/user', api.editUser);


var port = parseInt(conf.app.port || 3000, 10);
app.listen(port, function(){
  logger.log("Express server listening on port %d in %s mode", port, app.settings.env);
});

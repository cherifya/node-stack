var Schema = require('jugglingdb').Schema;
var conf = require('../conf');

//load db config from config files
var schema = new Schema('mongodb', {
    database: conf.mongo.database,
    host: conf.mongo.host,
    port: conf.mongo.port
}); 

// define models
var Repo = exports.Repo = schema.define('Repo', {
    addedDate:      { type: Date,    default: Date.now },
    gid: Number,
    name:        String,
    full_name:		  String,
    description: 	  String, 
    url: 	  String,
    homepage:   String,
    language: String,
    watchers_count: Number,
    forks_count: Number,
    private: {type:Boolean, default:false} ,
    pushed_at: Date,
    updated_at: Date,
    created_at: Date,
    html_url:   String,
    owner_type: String,
    owner_avatar_url:   String,
    owner_gid:  Number,
    owner_login:    String
});

// simplier way to describe model
var User = exports.User = schema.define('User', {
    name:         String,
    bio:          Schema.Text,
    gid:           Number,
    joinedAt:     { type: Date,    default: Date.now },
    login:        String,
    email:		  String,
    avatar_url: 	  String, 
    repos_url: 	  String,
    starred_url:   String,
    accessToken:  String,
    type: 		  String,
    updating:   {type:Boolean, default:false},
    synced_at:     Date,
    newsletter:   {type:Boolean, default:true}
});

//User.hasMany(Repo,   {as: 'repos',  foreignKey: 'userId'});
User.validatesPresenceOf('gid', 'email', 'login');
User.validatesFormatOf('email', {'with': /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i});

var Star = exports.Star = schema.define('Star', {
    tags:    String,
    unstarred: {type:Boolean, default:false}
});

User.hasMany(Star,   {as: 'stars',  foreignKey: 'userId'});
Repo.hasMany(Star,   {as: 'stargazers',  foreignKey: 'repoId'});

Star.belongsTo(User, {as: 'owner', foreignKey: 'userId'});
Star.belongsTo(Repo, {as: 'repo', foreignKey: 'repoId'});
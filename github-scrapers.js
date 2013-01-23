var request = require('request'),
    htmlparser = require('htmlparser'),
    soupselect = require('soupselect').select,
    conf = require('./conf'),
    logger = require('tracer').console({level: conf.app.logLevel});

function scrapeGithubPopularRepos(url, cb) {
    request.get({url: url}, function(err, response) {
        // now we have the whole body, parse it and select the nodes we want...
        var handler = new htmlparser.DefaultHandler(function(err, dom) {
            if (err) {
                cb(err);
            } else {
                var repos = [];
                // soupselect happening here...
                var sources = soupselect(dom, '.repolist .source');

                logger.log("%d Top repos from github scraped.", sources.length);

                sources.forEach(function(source) {
                    var titles = soupselect(source, 'h3 a');
                    titles = titles.map(function(title) {
                        return title.attribs.href;
                    });
                    var title = titles[0];
                    var owner_name = title.split('/')[1];
                    var name = title.split('/')[2];

                    var lang = soupselect(source, '.repo-stats li')[0];
                    if (lang) {
                        lang = lang.children[0].raw;
                        lang = lang.trim();
                    }

                    var stargazers = soupselect(source, '.repo-stats li.stargazers a');
                    if (stargazers[0] && stargazers[0].children[2]) {
                        stargazers = stargazers[0].children[2].raw;
                        if (stargazers) {
                            stargazers = parseInt(stargazers.replace(',', ''), 10);
                        }
                        else stargazers = null;
                    }

                    var forks = soupselect(source, '.repo-stats li.forks a');
                    if (forks[0] && forks[0].children[2]) {
                        forks = forks[0].children[2].raw;
                        if (forks) {
                            forks = parseInt(forks.replace(',', ''), 10);
                        }
                        else forks = null;
                    }

                    logger.log(" %s " , title, lang, stargazers, forks  );
                    repos.push({
                        fullname: owner_name + '/' + name,
                        name: name,
                        owner_login: owner_name,
                        html_url: "https://github.com" + "/" + owner_name + '/' + name,
                        language: lang,
                        watchers_count: stargazers,
                        forks_count: forks
                    });

                });

                //send result
                cb(null, repos);
            }
        });

        var parser = new htmlparser.Parser(handler);
        parser.parseComplete(response.body);
    });
}

module.exports.githubPopularStarred = function (cb) {
    scrapeGithubPopularRepos('https://github.com/popular/starred', cb);
};

module.exports.githubPopularForked = function (cb) {
    scrapeGithubPopularRepos('https://github.com/popular/forked', cb);
};

module.exports.githubInteresting = function (cb) {
    scrapeGithubPopularRepos('https://github.com/repositories', cb);
};
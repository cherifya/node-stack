var conf = require('../conf'),
  logger = require('tracer').console({level: conf.app.logLevel});

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index',{title:"Yo"});
};

exports.privacy = function(req, res){
  res.render('privacy');
};

exports.partials = function (req, res) {
  var name = req.params.name;
  res.render('partials/' + name);
};

// POST /feedback
exports.feedback = function (req, res) {
  var name = req.body.name,
    email = req.body.email,
    message = req.body.message;

  logger.log(name, email, message);

  var nodemailer = require("nodemailer");

  var transport = null;

  if (process.env.NODE_ENV != 'production ') {
    transport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
      auth: {
        user: "chef.ya@gmail.com",
        pass: "0n3piece10"
      }
    });
  }
  else transport = nodemailer.createTransport("sendmail");

  var mailOptions = {
    to: "Webmaster <webmaster@hubstars.ycsoft.org>", // sender address
    from: name + " <"  + email + ">", // list of receivers
    subject: "Feedback from Hubstars", // Subject line
    text: message // plaintext body
  };

  transport.sendMail(mailOptions, function(error, response){
      if(error){
          console.log(error);
          throw error;
      }else{
          console.log("Email sent: " + response.message);
          res.json(true);
      }

      // if you don't want to use this transport object anymore, uncomment following line
      transport.close(); // shut down the connection pool, no more messages
  });

};
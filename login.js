/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
var app = express();
var config = require("./config");

var User = require("./models/user")

var passport = require("passport"),
    FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user,done) {
  done(null,user.id)
})

passport.deserializeUser(function(id,done) {
  User.findOne(id, function(err,user) {
    done(err,user)
  });
});

passport.use(new FacebookStrategy({
    clientID: config.development.fb.appID,
    clientSecret: config.development.fb.appSecret,
    callbackURL: config.development.fb.url + "fbauthed"
    },
    function(accessToken, refreshToken,profile,done) {
      process.nextTick(function() {
        var query = User.findOne({'fbID': profile.id})
        query.exec(function(err, oldUser) {
          if (oldUser) {
            console.log('Existing User: ' + oldUser.name + ' found and logged in!')
            done(null,oldUser)
          }
          else {
            var newUser = new User();
            newUser.fbID = profile.id
            newUser.name = profile.displayName;
            newUser.email = profile.emails[0].value;

            newUser.save(function(err) {
              if(err) throw err;
              console.log("New User: " + newUser.name + ' created and logged in!')
              done(null, newUser);
            });
          }
        });
      });
    })); 

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.session({secret: 'fasfasasasfasfa'}));
  app.use(passport.initialize());
  app.use(passport.session())
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});
app.configure('development', function(){
  app.use(express.errorHandler());
});
app.get('/', routes.index);
app.get('/fbauth', passport.authenticate('facebook',{scope: 'email'}))
app.get('/fbauthed', passport.authenticate('facebook',{failureRedirect:'/',successRedirect:'/index.html'}))
app.get('/logout',function(req,res) {
    req.logOut();
    res.redirect('/');
})
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

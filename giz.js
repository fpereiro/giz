/*
giz - v0.3.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source (but not yet!).
*/

(function () {

   // *** SETUP ***

   var bcrypt = require ('bcryptjs');
   var Redis  = require ('redis');

   var giz = exports;

   giz.config = {
      expires: 60 * 60,
      redis:  []
   }

   // error, result. result is either falsy or the user.
   giz.auth  = function (session, callback) {
      giz.db.get ('session', session, function (error, user) {
         if (error)         return callback (error);
         if (user === null) return callback (null, null);
         giz.db.set ('session', session, user, function (error) {
            if (error)      return callback (error);
            giz.db.hget ('users', user, '*', function (error, data) {
               if (error) return callback (error);
               data.id = user;
               callback (null, data);
            });
         });
      });
   }

   // only look for error. second parameter will tell you if session existed or not, but you shouldn't care normally.
   giz.logout = function (session, callback) {
      giz.db.delete ('session', session, callback);
   }

   // error, result. result is either falsy or the session.
   // allows for multiple sessions with a given user.
   giz.login = function (user, pass, callback) {
      giz.db.hget ('users', user, 'pass', function (error, hash) {
         if (error) return callback (error);
         if (hash === null) return callback ('User doesn\'t exist!');
         bcrypt.compare (pass, hash, function (error, result) {
            if (error || ! result) return callback (error || 'Invalid password!', result);
            bcrypt.genSalt (20, function (error, result) {
               if (error) return callback (error);
               giz.db.set ('session', result, user, function (error) {
                  callback (error, result);
               });
            });
         });
      });
   }

   // error, result. error is the only thing that matters.
   giz.signup = function (user, pass, callback) {
      giz.db.hget ('users', user, 'pass', function (error, hash) {
         if (error) return callback (error);
         if (hash)  return callback ('User already exists!');
         bcrypt.genSalt (10, function (error, salt) {
            if (error) return callback (error);
            bcrypt.hash (pass, salt, function (error, hash) {
               if (error) return callback (error);
               giz.db.hset ('users', user, 'pass', hash, callback);
            });
         });
      });
   }

   // signup + login
   giz.signlog = function (user, pass, callback) {
      giz.signup (user, pass, function (error) {
         if (error) return callback (error);
         giz.login (user, pass, callback);
      });
   }

   // create token to recover password
   giz.recover = function (user, callback) {
      giz.db.hget ('users', user, '*', function (error, User) {
         if (error)         return callback (error);
         if (User === null) return callback ('User doesn\'t exist!');
         bcrypt.genSalt (20, function (error, token) {
            token = token.replace (/\//g, '');
            if (error) return callback (error);
            bcrypt.genSalt (10, function (error, salt) {
               if (error) return callback (error);
               bcrypt.hash (token, salt, function (error, hash) {
                  if (error) return callback (error);
                  giz.db.set ('token', user, hash, function (error) {
                     if (error) return callback (error);
                     callback (null, token);
                  });
               });
            });
         });
      });
   }

   // use token to set new password. if token is true, password is overwritten
   giz.reset = function (user, token, newPass, callback) {
      var change = function () {
         giz.db.delete ('token', user, function (error) {
            if (error) return callback (error);
            bcrypt.genSalt (10, function (error, salt) {
               if (error) return callback (error);
               bcrypt.hash (newPass, salt, function (error, hash) {
                  if (error) return callback (error);
                  giz.db.hset ('users', user, 'pass', hash, callback);
               });
            });
         });
      }
      if (token === true) return change ();
      giz.db.get ('token', user, function (error, hash) {
         if (error) return callback (error);
         if (hash === null) return callback ('No token found!');
         bcrypt.compare (token, hash, function (error, result) {
            if (error || ! result) return callback (error || 'Invalid token!', result);
            change ();
         });
      });
   }

   // destroy user account
   giz.destroy = function (user, callback) {
      giz.db.delete ('users', user, callback);
   }

   giz.db = {
      init: function () {
         if (! giz.redis) giz.redis = Redis.createClient.apply (Redis, giz.config.redis).on ('error', log);
      },
      get: function (entity, id, callback) {
         giz.db.init ();
         giz.redis.get (entity + ':' + id, callback);
      },
      hget: function (entity, id, field, callback) {
         giz.db.init ();
         if (field === '*') giz.redis.hgetall (entity + ':' + id, callback);
         else               giz.redis.hget    (entity + ':' + id, field, callback);
      },
      set: function (entity, id, value, callback) {
         giz.db.init ();
         if (entity === 'session' || entity === 'token') giz.redis.setex (entity + ':' + id, giz.config.expires, value, callback);
         else                                            giz.redis.set   (entity + ':' + id, value, callback);
      },
      hset: function (entity, id, field, value, callback) {
         giz.db.init ();
         giz.redis.hset (entity + ':' + id, field, value, callback);
      },
      delete: function (entity, value, callback) {
         giz.db.init ();
         giz.redis.del (entity + ':' + value, callback);
      }
   }

}) ();

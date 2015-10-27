/*
giz - v0.1.1

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/

(function () {

   // *** SETUP ***

   var bcrypt = require ('bcryptjs');
   var dale   = require ('dale');
   var Redis  = require ('redis');
   var teishi = require ('teishi');

   var log    = teishi.l;

   var giz = exports;

   giz.config = {
      session: 60 * 60,
      redis: []
   }

   // error, result. result is either falsy or the user.
   giz.auth  = function (session, callback) {
      giz.db.get ('session', session, function (error, user) {
         if (error) return callback (error);
         giz.db.hget ('users', user, '*', callback);
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
            if (error || ! result) return callback (error, result);
            bcrypt.genSalt (20, function (error, result) {
               if (error) return callback (error);
               giz.db.set ('session', result, user, function (error) {
                  callback (error, error ? false : result);
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
         if (entity === 'session') giz.redis.setex (entity + ':' + id, giz.config.session, value, callback);
         else                      giz.redis.set   (entity + ':' + id, value, callback);
      },
      hset: function (entity, id, field, value, callback) {
         giz.db.init ();
         giz.redis.hset (entity + ':' + id, field, value, callback);
      },
      delete: function (entity, value, callback) {
         giz.db.init ();
         giz.redis.del (entity + ':' + value, callback);
      },
   }

}) ();

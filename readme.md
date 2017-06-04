# giz

> "You can't trust code that you did not totally create yourself." --Ken Thompson

giz is a bunch of auth functions for web applications.

## Current status of the project

The current version of giz, v0.3.0, is considered to be *somewhat stable* and *somewhat complete*. [Suggestions](https://github.com/fpereiro/giz/issues) and [patches](https://github.com/fpereiro/giz/pulls) are welcome. Future changes planned are:

- Add annotated source code.

## Installation

The dependencies of giz are two:

- [bcryptjs](https://github.com/dcodeio/bcrypt.js), which is used to hash passwords and password recovery tokens.
- [redis](https://github.com/NodeRedis/node_redis), which is used as the default datastore.

To install, type `npm i giz`.

giz should work with any version of node. However, if you use the default db (redis), you'll need 0.10.0 or newer, plus a redis server available.

## Usage

### Functions

- `giz.auth`: takes a session token and a callback. If successful, the callback receives as its second argument an object with the form `{id: ..., pass: ...}`.
- `giz.logout`: takes a session token and a callback.
- `giz.login`: takes an user, a password and a callback. If successful, the callback receives as its second argument a session.
- `giz.signup`: takes an user, a password and a callback.
- `giz.signlog`: takes an user, a password and a callback. It attempts to signup the user and then immediately log them in.
- `giz.recover`: takes an user and a callback. If successful, the callback receives as its second argument a token for resetting the user's password.
- `giz.reset`: takes an user, a password recovery token (generated with `giz.recover`), a new password and a callback.
- `giz.destroy`: takes an user and a callback. Deletes the user.

### Config & using a different db

`giz.config` is an object that accepts the following keys:

- `giz.config.expires`: the number of seconds of inactivity before a token or session expires. By default this value is 3600.
- `giz.config.redis`: if you want giz to use redis by default and to create its own connection, this should be an array of the arguments you want to pass to `redis.createClient`. By default this value is an empty array.

You can also pass an existing redis client to giz, simply by setting `giz.redis = yourRedisClient`.

If you want to avoid using redis altogether (or doing it in your own way), you need to override the six functions in `giz.db` - all of them are used from all parts of the code, except for `giz.db.init` which is used by the other functions in `giz.db`. These functions are quite straightforward, comprising about 25 lines in total. If you need help implementing your own version of these functions, please [open an issue](https://github.com/fpereiro/giz/issues) and I will be glad to help you.

## Source code

The complete source code is contained in `giz.js`. It is about 170 lines long.

Annotated source code will be forthcoming when the library stabilizes.

## License

giz is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

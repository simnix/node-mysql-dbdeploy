var deploy = require('./lib/deploy');
var ensureDB = require('./lib/ensuredb');

/**
 * config must be object of format
 * {
 *   "db" : {
 *     "user": "<username>",
 *     "pass": "<password>",
 *     "host": "<hostname>",
 *     "port": <port>,
 *     "database": "<database>"
 *   },
 *   "dbdeploy" {
 *     "deployFile" : "<path to deploy file>",
 *     "undoFile" : "<path to undo file>",
 *     "changelogTable": "<name of db table for changelog>",
 *     "deltas": "<path to deltas dir>"
 *   }
 * }
 *
 * E.g.
 *
 * {
 *   "db" : {
 *     "user": "root",
 *     "pass": "root",
 *     "host": "localhost",
 *     "port": 3306,
 *     "database": "test"
 *   },
 *   "dbdeploy": {
 *     "deployFile": "/tmp/dbdeploy_deploy.sql",
 *     "undoFile": "/tmp/dbdeploy_undo.sql",
 *     "changelogTable": "changelog",
 *     "deltasDir": "deltas"
 *   }
 * }
 */
module.exports = function(config, next) {
  return function() {
    ensureDB(config.db, function(err) {
      if (err) {
        return next(err);
      }
      deploy.applyAllDeltas(config, next);
    });
  };
};

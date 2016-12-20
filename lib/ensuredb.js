var mysql = require('mysql');
var util = require('util');
var _ = require('underscore');

var debug = require('debug')('dbdeploy.ensureDB');

module.exports = ensureDB;

/**
 * Ensures the database exists if it does not the user/password must have
 * permission to create a database otherwise this will error.
 *
 * @param  {[type]}   dbConfig {
 *     "user": "<username>",
 *     "pass": "<password>",
 *     "host": "<hostname>",
 *     "port": <port>,
 *     "database": "<database>"
 *   }
 * @param  {Function} next     std nodejs callback with just err
 */
function ensureDB(dbConfig, next) {
  debug('dbConfig: ', dbConfig);
  var databaseConfig = _.clone(dbConfig);
  var dbName = databaseConfig.database;
  util.log(util.format("[ensuredb-%s] starting...", dbName));

  delete databaseConfig.database;

  var db = mysql.createConnection(databaseConfig);
  db.connect(function onDbConnect(err) {
    if (err) {
      util.log(util.format('[ensuredb-%s] could not connect: ', dbName, err));
      console.trace();
      return next(err);
    }
    util.log(util.format("[ensuredb-%s] Connected.", dbName));
  });

  db.query("CREATE DATABASE IF NOT EXISTS "+dbName, function ensureDBQuery(err) {
    if (err) {
      util.log(util.format('[ensuredb-%s] could not create: ', dbName, err));
      console.trace();
      return next(err);
    }
    util.log(util.format("[ensuredb-%s] database ensured.", dbName));
    return next();
  });
}

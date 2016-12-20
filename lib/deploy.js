/**
 * JS version of DBDeploy.
 *
 * @todo make a reusable module that is passed config
 * @todo clean up the code its a bit hacked together while porting from
 * php
 */
var mysql = require('mysql');
var util = require('util');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('dbdeploy');
var helpers = require('./helpers');
var exec = helpers.exec;
var fileExists = helpers.fileExists;

module.exports = {
    applyAllDeltas: applyAllDeltas,
    createDeployAndUndo: createDeployAndUndo
};

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
function applyAllDeltas(config, next) {
    debug('deployAnyDb: config: ', config);
    var cmd = "rm -Rf /tmp/dbdeploy*";
    exec(cmd, function() {
      createDeployAndUndo(config, dbdeployComplete);
    }, "Cleaned dbdeploy files.");
    function dbdeployComplete(err, config) {
      if (err) {
        return util.log(util.format('[dbdeploy-%s] error while creating deploy and undo files: ', config.db.databse, err));
      }
      debug("dbdeploy deploy and undo created");
      var deployFile = config.dbdeploy.deployFile;
      debug('deployAnyDb:deployFile:', deployFile);

      if (fileExists(deployFile)) {
        var dbConfig = _.clone(config.db);
        dbConfig.multipleStatements = true;
        var db = mysql.createConnection(dbConfig);
        db.connect(function onDbConnect(err) {
          if (err) {
            util.log(util.format('[dbdeploy-%s] could not connect: ', config.db.database, err));
            console.trace();
            // @todo try to reconnect if message = 'No database selected'
            // exit for now as then the process will get restarted
            process.exit(1);
          }
        });

        var sql = fs.readFileSync(deployFile).toString();
        db.query(sql, function (err) {
          if (err) {
            util.log(util.format('[dbdeploy-%s] error while applying deploy: ', config.db.database, err));
            console.trace();
            process.exit(1);
          }
          util.log(util.format("[dbdeploy-%s] applied the deploy.sql file", config.db.database));
          callNext();
        });
      }
      else {
        util.log("[dbdeploy-%s] no deploy sql to apply at ", config.db.database, deployFile);
        callNext();
      }
    }
    function callNext() {
      if (typeof next === 'function') {
        next();
      }
    }
}

function createDeployAndUndo(config, cb) {
  debug('config: ', config);
  var db = mysql.createConnection(config.db);
  db.connect(function dbConnectError(err) {
      if (err) {
        util.log(util.format('[dbdeploy-%s] Error could not connect: ', config.db.database, err));
        console.trace();
        // @todo try to reconnect if message = 'No database selected'
        // exit for now as then the process will get restarted
        process.exit(1);
      }
      debug('Connected');
  });

  util.log(util.format("[dbdeploy-%s] Ensuring changelog table [%s.%s] exists", config.db.database, config.db.database, config.dbdeploy.changelogTable));
    var sql = "" +
      "CREATE TABLE IF NOT EXISTS `"+config.db.database+"`.`"+config.dbdeploy.changelogTable+"` (" +
      "  `change_number` bigint(20) NOT NULL," +
      "  `delta_set` varchar(10) NOT NULL," +
      "  `start_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
      "  `complete_dt` timestamp NULL DEFAULT NULL," +
      "  `applied_by` varchar(100) NOT NULL," +
      "  `description` varchar(500) NOT NULL," +
      "  PRIMARY KEY (`change_number`)" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='DBDeploy changelog for easy db migrations';" +
      "";
  var query = db.query(sql);
  query.on('error', dbError);
  query.on('result', function ensuredChangelogExists(result) {
    debug('ensuredChangelogExists: err: ', result);
    util.log('[dbdeploy-%s] Getting applied changed numbers from DB', config.db.database);
    sql = "SELECT change_number " +
            "  FROM " + config.dbdeploy.changelogTable +
            "  WHERE delta_set = 'Main'" +
            "    AND complete_dt IS NOT NULL" +
            "  ORDER BY change_number";
    var appliedQuery = db.query(sql, function appliedChangeNumberResult(err, rows) {
      debug('appliedQuery:', err, rows);
      if (err) {
        if (_.isFunction(cb)) {
          cb(err);
        }
        return;
      }
      var appliedChangeNumbers = _.map(rows, function(row) {
        return row.change_number;
      });
      debug('appliedChangeNumbers:', appliedChangeNumbers);
      var lastChangeAppliedInDb = getLastChangeAppliedInDb(appliedChangeNumbers);
      util.log(util.format("[dbdeploy-%s] Last change applied: ", config.db.database, lastChangeAppliedInDb));
      createDeploySQL(lastChangeAppliedInDb);
      if (_.isFunction(cb)) {
        cb(null, config);
      }
    });
    appliedQuery.on('error', dbError);
  });

  function dbError(err) {
    util.log(util.format("[dbdeploy-%s] Error %s sql: %s", config.db.database, err.message, err.sql));
    console.trace();
    // @todo try to reconnect if message = 'No database selected'
    // exit for now as then the process will get restarted
    process.exit(1);
  }

  function getLastChangeAppliedInDb(appliedChangeNumbers) {
    if (_.isEmpty(appliedChangeNumbers)) {
      return 0;
    }
    return _.last(appliedChangeNumbers);
  }

  function createDeploySQL(lastChangeAppliedInDb) {
    clearAnyPreviousFiles(config);
    createOutputFile(lastChangeAppliedInDb, config.dbdeploy.deployFile, false);
    createOutputFile(lastChangeAppliedInDb, config.dbdeploy.undoFile, true);
  }

  function clearAnyPreviousFiles(config) {
    clearFile(config.dbdeploy.deployFile);
    clearFile(config.dbdeploy.undoFile);
  }

  function clearFile(filePath) {
    if (fileExists(filePath)) {
      try {
        fs.unlinkSync(filePath);
      }
      catch (e) {
        util.log(util.format('[dbdeploy-%s] Error clearing file, continuing: ', config.db.database, filePath));
        // @TODO bad practice to catch and do nothing but unlinkSync will only fail
      }
    }
  }

  function createOutputFile(lastChangeAppliedInDb, filePath, isUndo) {
    var doUndoText = "deploy";
    if (isUndo) {
      doUndoText = "undo";
    }
    util.log(util.format("[dbdeploy-%s] Creating %s at: %s", config.db.database, doUndoText, filePath));
    var sql = generateSql(lastChangeAppliedInDb, isUndo);

    if (sql.length === 0) {
      util.log("  - No deltas to apply.");
    }
    else {
      fs.writeFileSync(filePath, sql);
    }
  }

  function generateSql(lastChangeAppliedInDb, isUndo) {
    var files = getDeltasFiles(isUndo);

    var filesThatNeedToBeRead = _.filter(files, function fileNeedsToBeRead(file) {
      var filename = path.basename(file);
      var number = _.first(filename.split('_'));
      return number > lastChangeAppliedInDb;
    });

    return _.map(filesThatNeedToBeRead, function getDeployOrUndoSql(file) {
      var fileChange = {"name": file};
      var filename = path.basename(file);
      fileChange.number = _.first(filename.split('_'));
      var sql = "";
      util.log(util.format(" - Applying %s", fileChange.name));
      sql += '-- Fragment begins: ' + fileChange.number + ' --' + "\n";

      if (!isUndo) {
        sql += "INSERT INTO " + config.dbdeploy.changelogTable +
               "   (change_number, delta_set, applied_by, description)" +
               " VALUES (" + fileChange.number + ", 'Main'" +
               "  , 'dbdeploy', '" + fileChange.name + "')" +
               " ON DUPLICATE KEY UPDATE description=description;\n";
      }

      // read the file
      var contents = fs.readFileSync(fileChange.name).toString();
      // allow construct with and without space added
      var parts = contents.split('-- //@UNDO');
      if (parts.length === 1) {
        parts = contents.split('--//@UNDO');
      }

      if (isUndo) {
        sql += parts[1];
        sql += "\nDELETE FROM " + config.dbdeploy.changelogTable +
               "  WHERE change_number = " + fileChange.number +
               "  AND delta_set = 'Main';\n";
      }
      else {
        sql += parts[0];
        sql += "UPDATE " + config.dbdeploy.changelogTable +
               "  SET complete_dt = NOW() " +
               "  WHERE change_number = " + fileChange.number +
                 "  AND delta_set = 'Main';\n";
      }

      sql += "-- Fragment ends: " + fileChange.number + " --\n";
      return sql;

    }).join("\n");
  }

  function getDeltasFiles(isUndo) {
    var files = fs.readdirSync(config.dbdeploy.deltasDir);
    files.sort();
    if (isUndo) {
      files.reverse();
    }
    return _.map(files, function(file) {
      return path.join(config.dbdeploy.deltasDir, file);
    });
  }
}

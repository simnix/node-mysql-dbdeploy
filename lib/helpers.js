var util = require('util');
var debug = require('debug')('dbdeploy.helpers');

module.exports = {
  fileExists: fileExists,
  exec: exec
};

/*** Helper functions **/
function fileExists(path) {
  try {
    return require('fs').statSync(path).isFile();
  } catch (e) {
    return false;
  }
}

function exec(cmd, next, successMsg, failMsg) {
  if (typeof successMsg === 'undefined') {
    successMsg = cmd;
  }
  if (typeof failMsg === 'undefined') {
    failMsg = cmd;
  }
  debug("exec: %s", cmd);
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    if (stdout.length) {
      debug('stdout: ' + stdout);
    }
    if (stderr.length) {
      debug('stderr: ' + stderr);
    }
    if (error !== null) {
      util.log(util.format("Failed %s", failMsg));
      util.log(util.format('exec error: ', error));
    }
    else {
      debug("Success %s", successMsg);
    }
    if (typeof next === 'function') {
      next(error, stdout);
    }
  });
}

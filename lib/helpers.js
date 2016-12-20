var util = require('util');

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
  util.log(util.format("exec: %s", cmd));
  require('child_process').exec(cmd, function(error, stdout, stderr) {
    if (stdout.length) {
      util.log('stdout: ' + stdout);
    }
    if (stderr.length) {
      util.log('stderr: ' + stderr);
    }
    if (error !== null) {
      util.log(util.format("Failed %s", failMsg));
      util.log(util.format('exec error: ', error));
    }
    else {
      util.log(util.format("Success %s", successMsg));
    }
    if (typeof next === 'function') {
      next(error, stdout);
    }
  });
}

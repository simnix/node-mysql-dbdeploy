# node-mysql-dbdeploy [![Build Status](https://travis-ci.org/simnix/node-mysql-dbdeploy.svg?branch=master)](https://travis-ci.org/simnix/node-mysql-dbdeploy.svg?branch=master) [![Dependency Status](https://david-dm.org/simnix/node-mysql-dbdeploy.svg)](https://david-dm.org/simnix/node-mysql-dbdeploy.svg) [![Coverage Status](https://coveralls.io/repos/github/simnix/node-mysql-dbdeploy/badge.svg?branch=master)](https://coveralls.io/github/simnix/node-mysql-dbdeploy?branch=master)

MySQL DB Deploy for Node.js

See http://dbdeploy.com for concepts.

## Status

Initial draft of extracting this package from project code. Similar to the ```dbdeploy``` npm package.

## Install

```
npm install --save node-mysql-dbdeploy
```

## Usage

```
var util = require('util');
var dbdeploy = require('node-mysql-dbdeploy');
var config = {
  "db" : {
    "user": "root",
    "pass": "root",
    "host": "localhost",
    "port": 3306,
    "database": "test"
  },
  "dbdeploy": {
    "deployFile": "/tmp/dbdeploy_deploy.sql",
    "undoFile": "/tmp/dbdeploy_undo.sql",
    "changelogTable": "changelog",
    "deltasDir": "deltas"
  }
};
dbdeploy(config, function complete(err, config) {
  if (err) {
    util.log(util.format('dbdeploy error: ', err));
  }
  util.log('dbdeploy: finished');
  process.exit();
});
```

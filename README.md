# node-mysql-dbdeploy
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

});
```

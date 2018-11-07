const fs = require('fs');
const join = require('path').join;

module.exports = function (pth, cb) {
  var ngjson = join(pth, 'angular.json');
  fs.exists(ngjson, function (exists) {
    if (exists) {
      fs.readFile(ngjson, function (err, data) {
        cb(err, err ? null : { path: pth, data: JSON.parse(data) });
      });
    }
    else {
      cb(null, null); // no error but no angular.json
    }
  });
};
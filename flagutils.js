request = require('request');
async = require('async');

var flagcodes = require('/home/richard/Meteor/fantasybiathlon-backend-utils/flagcodes.json');

function makeflagurl(nat) {
    return 'http://flagspot.net/images/' + flagcodes[nat].charAt(0) + '/' + flagcodes[nat] + '.gif';
}

function makeflagsavefile(nat) {
    return '/home/richard/Meteor/fantasybiathlon-backend-utils/flagfiles/' + nat + '.gif';
}

var downloadflag = function(nat, cb) {
  var file = fs.createWriteStream(makeflagsavefile(nat));
  var request = http.get(makeflagurl(nat), function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      cb();
    });
  });
};

function downloadallflags() {
    async.each(Object.keys(flagcodes), downloadflag, function() {console.log("DONE");});
}

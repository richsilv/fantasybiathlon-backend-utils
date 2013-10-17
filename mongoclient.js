/*jslint smarttabs:true */
var uu = require('underscore');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose');
var http = require('http');
var fs = require('fs');
var Schema = mongoose.Schema;
var raceSchema = mongoose.Schema({
    RaceId:String,
    km:[Number],
    catId:String,
    DisciplineId:String,
    StatusId:Number,
    StatusText:String,
    HasLiveData:Boolean,
    IsLive:Boolean,
    StartTime:Date,
    Description:String,
    ShortDescription:String,
    ResultsCredit:String,
    TimingCredit:String,
    HasAnalysis:Boolean
});
var meetingSchema = mongoose.Schema({
    SeasonId:String,
    EventId:String,
    StartDate:Date,
    EndDate:Date,
    Description:String,
    ShortDescription:String,
    Organizer:String,
    Nat:String,
    MedalSetId:String,
    Level:Number,
    IsActual:Boolean,
    IsCurrent:String
});
var resultSchema = mongoose.Schema({
    StartOrder:Number,
    ResultOrder:Number,
    IRM:String,
    IBUId:String,
    Name:String,
    ShortName:String,
    Nat:String,
    Bib:Number,
    Leg:Number,
    Rank:Number,
    Rnk:String,
    Shootings:[Number],
    ShootingTotal:Number,
    RunTime:String,
    TotalTime:Number,
    WC:String,
    NC:String,
    NOC:String,
    StartTime:String,
    StartRow:Number,
    StartLane:Number,
    BibColor:String,
    Behind:Number,
    StartGroup:String,
    RaceId:String,
    EventId:String
});
var athleteSchema = mongoose.Schema({
    IBUId:String,
    Nat:String,
    Name:String,
    ShortName:String,
    Gender:String,
    Height:Number,
    Weight:Number
});

var Race = mongoose.model('Race', raceSchema);
var Meeting = mongoose.model('Meeting', meetingSchema);
var Result = mongoose.model('Result', resultSchema);
var Athlete = mongoose.model('Athlete', athleteSchema);

function monconnect(dbase) {
    mongoose.connect('mongodb://localhost/' + dbase);
}

function monprocess(cb) {
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error: '));
    db.once('open', cb);
}

function saveSet(set, schema, cb) {
    var saveItem = function(itemdeets, callback) {
	var item = new schema(itemdeets);
	item.save(callback);
    };
    async.map(set, saveItem, cb);
}

function flattenArray(array) {
    if (Object.prototype.toString.call(array) != '[object Array]') {
	return [array];
    }
    out = [];
    for (var ii in array) {
	if (Object.prototype.toString.call(array[ii]) === '[object Array]') {
	    for (var jj in array[ii]) {
		out.push(array[ii][jj]);
	    }
	}
	else {
	    out.push(array[ii]);
	}
    }
    return out;
}

function getnations(athletes, cb) {
    var nations = [];
    for (var i = 0; i < athletes.length; i++) {
	if (nations.indexOf(athletes[i].Nat) < 0) {
	    nations.push(athletes[i].Nat);
	}
    }
    if (typeof cb === 'undefined') {
	return nations;
    }
    else {
	return cb(null, nations);
    }
}

var flagcodes = require('/home/richard/Meteor/fantasybiathlon-backend-utils/flagcodes.json')

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
}

function downloadallflags() {
    async.each(Object.keys(flagcodes), downloadflag, function() {console.log("DONE");});
}

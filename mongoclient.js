/*jslint smarttabs:true */
var uu = require('underscore');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose');
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

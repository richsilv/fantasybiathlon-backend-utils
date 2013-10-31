cs/*jslint smarttabs:true */
var _this = this;

var uu = require('underscore');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose');
var http = require('http');
var fs = require('fs');
var tc = require('trycatch');
var csv = require('csv');

var finishpoints = [0, 30, 25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
var relaypoints = [0, 15, 10, 8, 6, 4, 3, 2, 1];
var smallpoints = [0, 10, 7, 5, 3, 1];

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
    HasAnalysis:Boolean,
    EventId:String
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
    EventId:String,
    TotalRank: Number,
    ShootTime: Number,
    ShootRank: Number,
    ShootScore: Number,
    RangeTime: Number,
    RangeRank: Number,
    CourseTime: Number,
    CourseRank: Number,
    Points: Number,
    RaceTime: Date
});
var athletesetup = {
    IBUId:String,
    Nat:String,
    Name:String,
    ShortName:String,
    Gender:String,
    Height:Number,
    Weight:Number,
    Price:Number
};
var athleteSchema = mongoose.Schema(athletesetup);
var fantasyteamSchema = mongoose.Schema({
    UserID:String,
    Name:String,
    transfers:Number,
    Athletes:{},
    teamHistory:{}
});
var statisticSchema = mongoose.Schema({
    Type:String,
    Data:{}
});

var Race = mongoose.model('Race', raceSchema);
var Meeting = mongoose.model('Meeting', meetingSchema);
var Result = mongoose.model('Result', resultSchema);
var Athlete = mongoose.model('Athlete', athleteSchema);
var FantasyTeam = mongoose.model('FantasyTeam', fantasyteamSchema);
var Statistic = mongoose.model('Statistic', statisticSchema);

function monconnect(dbase, portno) {
    if (typeof portno == 'undefined') {portno = 27017;}
    mongoose.connect('mongodb://localhost:' + portno + '/' + dbase);
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
    nations = [];
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

function sumplayerpoints(outputvar) {
    var sumresults = function(err, results) {
	output = {};
	console.log(results.length + ' records');
	results.forEach(function(r, i) {
	    console.log('record number ' + i);
	    if (Object.keys(output).indexOf(r.IBUId) > -1) {
		output[r.IBUId].Points += r.Points;
		output[r.IBUId].Count += 1;
	    }
	    else {
		output[r.IBUId] = {Name: r.Name, Points: r.Points, Count: 1};
	    }
	});
	console.log("DONE");
	global[outputvar] = output;
	return output;
    };
    console.log("hi!");
    Result.find({}).exec(function(err, results) {
	if (!err) {
	    console.log("Summing...");
	    sumresults(err, results);
	}
	else {
	    console.log("ERROR!");
	    console.log(err);
	}
    });
}

addshootingscore = function() {
    var shootingscore = function(err, results) {
	console.log(results.length + ' records');
	results.forEach(function(r, i) {
	    console.log('record number ' + i);
	    if (r.RangeTime && typeof r.ShootingTotal != 'undefined') {
		Result.update(r, {ShootScore: r.RangeTime + (r.ShootingTotal * 1000)}, {}, function(err, num) {
		    if (!err) console.log('Record updated: ' + r.RaceId + ', ' + r.IBUId);
		    else console.log(err);
		});
	    }
	});
    };
    Result.find({}, function(err, res) {
	if (!err) shootingscore(err, res);
	else console.log(err);
    });
};

writepoints = function(variable, filename) {
    var points = Object.keys(variable).reduce(function(tot, r) {return tot + r + ',' + variable[r].Name + ',' + variable[r].Points + ',' + variable[r].Count + '\n';}, '');
    fs.writeFile(filename, points, function(err) {if (err) throw err; console.log('saved');});
};


removecountries = function() {

    Athlete.remove({$where: "this.IBUId.trimRight().length < 10"}, function(err, res) {console.log(res);});
    Meeting.remove({$where: "this.EventId.substr(0, 2) === 'SB'"}, function(err, res) {console.log(res);});
    Race.remove({$where: "this.EventId.substr(0, 2) === 'SB'"}, function(err, res) {console.log(res);});
    Result.remove({$where: "this.IBUId.trimRight().length < 10"}, function(err, res) {console.log(res);});
    Result.remove({$where: "this.RaceId.substr(14, 1) === 'J'"}, function(err, res) {console.log(res);});
    Result.remove({$where: "this.EventId.substr(0, 2) === 'SB'"}, function(err, res) {console.log(res);});
};

updateresultpoints = function(r) {
    var points = 0;
    if (typeof r == 'undefined') {
	console.log('no result!');
    }
    if (r.ResultOrder > 998) {
	Result.update(r, {Points: points}, {}, function(err, num) {
	    if (!err) console.log('Updated: ' + r.RaceId + ' - ' + r.IBUId + ' (DNF)');
	    else console.log(err);
	});
    }
    else if (r.RaceId.substr(r.RaceId.length-2) === 'RL') {
	points += relaypoints[r.ResultOrder] ? relaypoints[r.ResultOrder] : 0;
	if (r.Shootings.reduce(function(tot, x) {return tot + x;}, 0) === 0) {points += 5;}
	Result.update(r, {Points: points}, {}, function(err, num) {
	    if (!err) console.log('Updated: ' + r.RaceId + ' - ' + r.IBUId);
	    else console.log(err);
	});
    }
    else {
	points += finishpoints[r.ResultOrder] ? finishpoints[r.ResultOrder] : 0;
	if (r.CourseRank != 'undefined') {
	    points += smallpoints[r.CourseRank] ? smallpoints[r.CourseRank] : 0;
	}
	points += (r.ShootingTotal === 0 ? 5 : 0);
	points += (r.Shootings.reduce(function(total, x) {return x === 0 ? total+1 : total;}, 0));
	if (r.ShootScore != 'undefined') {
	    Result.find({RaceId: r.RaceId}, null, {sort: {ShootScore: 1}}, function(err, res) {
		for (var i = 0; i < smallpoints.length - 1; i++) {
		    if (res[i].IBUId === r.IBUId) points += smallpoints[i+1];
		}
		Result.update(r, {Points: points}, {}, function(err, num) {
		    if (!err) console.log('Updated: ' + r.RaceId + ' - ' + r.IBUId);
		    else console.log(err);
		});
	    });
	}
    }
};

updateallpoints = function(force) {
    var filter = {};
    if (!force) {
	filter['Points'] = null;
    }
    Result.find(filter, function(err, res) {
	res.forEach(updateresultpoints);
    });
};

test = function() {
    monconnect('biathlon', 3002);
    var raceid = 'BT1213SWRLCP01SMSP';
    var ibuid = 'BTCAN13107198501';
    Result.findOne({RaceId: raceid, IBUId: ibuid}, function(err, res) {global.example = res;});
};

function aintob(a, b, match, fields) {
    for (var i = 0; i < a.length; i++) {
	filter = {};
	for (var j = 0; j < match.length; j++) {
	    filter[match[j]] = a[i][match[j]];
	}
	info = {};
	for (j = 0; j < fields.length; j++) {
	    info[fields[j]] = a[i][fields[j]];
	}
	b.update(filter, info, {}, function() {
	    output = '';
	    for (j = 0; j < match.length; j++) {
		output += a[i][match[j]] + ' ';
	    }
	    console.log(output);
	});
    }
}

function updateracetimes(force) {
    Race.find({}, function(err, res) {
	res.map(function(r) {
	    console.log(r.RaceId);
	    if (force) {
		Result.update({RaceId: r.RaceId}, {RaceTime: r.StartTime}, {multi: true}, function(err, ins) {console.log('Updated ' + ins.IBUId + ', ' + ins.RaceId);});
	    }
	    else {
		Result.update({RaceTime: {$exists: false}, RaceId: r.RaceId}, {RaceTime: r.StartTime}, {multi: true}, function(err, ins) {console.log('Updated ' + ins.IBUId + ', ' + ins.RaceId);});
	    }
	});
    });
}

function writeprices(infile) {
    csv()
	.from.path(__dirname+'/'+infile, { delimiter: ',', escape: '"' })
	.transform( function(row){
	    row.unshift(row.pop());
	    return row;
	})
	.on('record', function(row,index){
	    console.log('#'+index+' '+JSON.stringify(row));
	})
	.on('close', function(count){
	    // when writing to a file, use the 'close' event
	    // the 'end' event may fire before the file has been written
	    console.log('Number of lines: '+count);
	})
	.on('error', function(error){
	    console.log(error.message);
	});
}

function averageperformance(enddate) {
    if (!enddate) enddate = new Date();
    var data = [];
    Race.find({StartTime: {$lte: enddate}}, function(err, races) {
	FantasyTeam.find({}, function(err, teams) {
	    var teamnum = teams.length;
	    var aths;
	    var total;
	    async.each(races, function(race, cbo) {
		console.log(race.RaceId + ' started');
		var total = 0;
		async.each(teams, function(team, cbi) {
		    if (team.teamHistory.length) aths = team.teamHistory.reduce(function(pre, cur) {
			return (cur[1] > pre[1] && cur[1] <= race.StartTime) ? cur : pre;
		    });
		    else aths = [[], []];
		    Result.find({RaceId: race.RaceId, IBUId: {$in: aths[0]}}, function(err, res) {
			total += res.reduce(function(tot, r) {return tot + r.Points;}, 0);
			cbi();
		    });
		}, function(err) {
		    data.push([race.StartTime, (total / teamnum)]);
		    console.log(race.RaceId + ' finished');
		    cbo(err);
		});
	    }, function(err) {
		data = data.sort(function(a, b) {return a[0] > b[0] ? 1 : -1;});
		var dates = [];
		var avgs = [];
		data.forEach(function(d) {
		    dates.push(d[0]);
		    avgs.push(d[1] + (avgs.length ? avgs[avgs.length - 1] : 0));
		});
		global._data = [dates, avgs];
		Statistic.update({Type: "averagepoints"}, {Type: "averagepoints", Data: [dates, avgs]}, {upsert: true}, function(err, num) {
		    if (!err) console.log("wrote " + num + " stat items.");
		});
	    });
	});
    });
}

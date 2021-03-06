/*jslint smarttabs:true */
var uu = require('underscore');
var async = require('async');
var request = require('request');

var _data = {};
var DEBUG = true;
var log = function(xx) {
    if (DEBUG) {
	console.log("%s at %s", xx, new Date());
    }
};
function save(inst, name) {
    if (DEBUG) { global._data[name] = inst; }
}

function season2meetings_data(season, cb) {
    log(arguments.callee.name);
    var params = { Level: 0, SeasonId: season, _: 1359993916314, callback: ''};
    var err_resp_body2meeting_data = function(err, resp, body) {
	if (!err && resp.statusCode == 200) {
	    var meeting_data = JSON.parse(body, dateReviver);
	    var meeting_filter = function(meeting) {
		return containsone(meeting.EventId, ["SWRLCH", "SWRLCP", "SWRLOG"]);
	    };
	    cb(null, uu.filter(meeting_data, meeting_filter));
	}
    };
    request({url: 'http://datacenter.biathlonresults.com/modules/sportapi/api/Events', qs: params}, err_resp_body2meeting_data);
}

function meeting_data2races_data(meeting, cb) {
    log(arguments.callee.name);
    var params = { EventId: meeting, _: 1359993916314, callback: ''};
    var err_resp_body2races_data = function(err, resp, body) {
	if (!err && resp.statusCode == 200) {
	    var races_data = JSON.parse(body, dateReviver);
	    var races_filter = function(race) {
		return containsone(race.RaceId, ["SW", "SM"]);
	    };
	    races_data = uu.filter(races_data, races_filter);
	    races_data.forEach(function(race) {
		race.EventId = meeting;
		race.km = parsekm(race.km);
	    });
	    cb(null, races_data);
	}
    };
    request({url: 'http://datacenter.biathlonresults.com/modules/sportapi/api/Competitions', qs: params}, err_resp_body2races_data);
}

function meetings_data2races_data(meetings, cb) {
    log(arguments.callee.name);
    var eventids = [];
    for (var ii in meetings) {
	eventids.push(meetings[ii].EventId);
    }
    async.map(eventids, meeting_data2races_data, cb);
}

function race_data2results_data(meeting, race, cb) {
    log(arguments.callee.name);
    var params = { RaceId: race, _: 1359993916314, callback: ''};
    var err_resp_body2results_data = function(err, resp, body) {
	if (!err && resp.statusCode == 200) {
	    var results_data = JSON.parse(body, dateReviver);
	    results_data = results_data.Results;
	    if (results_data !== undefined) {
		results_data.forEach(function(result) {
		    result.RaceId = race;
		    result.EventId = meeting;
		    result.ShootingTotal = parseInt(result.ShootingTotal, 10);
		    result.Shootings = getnumbers(result.Shootings);
		    result.TotalTime = timetosecs(result.TotalTime);
		    result.Behind = timetosecs(result.Behind);
		    result.Rank = parseInt(result.Rank, 10);
		    if (isNaN(result.Rank)) { result.Rank = 999; }
		    if (isNaN(result.TotalTime)) { result.TotalTime = 86399; }
		    if (isNaN(result.ShootingTotal)) { result.ShootingTotal = -1; }
		});
	    }
	    else {
		results_data = [];
	    }
	    cb(null, results_data);
	}
    };
    request({url: 'http://datacenter.biathlonresults.com/modules/sportapi/api/Results', qs: params}, err_resp_body2results_data);
}

function races_data2results_data(races, cb) {
    log(arguments.callee.name);
    var raceids = [];
    for (var ii in races) {
	raceids.push({race: races[ii].RaceId, meeting: races[ii].EventId});
    }
    async.map(raceids, function(raceid, cb) {race_data2results_data(raceid.meeting, raceid.race, cb);}, cb);
}

function result_data2analysis_data(result, cb) {
    var raceid = result.RaceId;
    var ibuid = result.IBUId;
    var params = { RaceId: raceid, IBUId: ibuid, RT: 340203, _: 1359993916314, callback: ''};
    var err_resp_body2analysis_data = function(err, resp, body) {
	if (!err && resp.statusCode == 200) {
	    var analysis_data = JSON.parse(body, dateReviver);
	    if (analysis_data !== undefined) {
		analysis_data.Values.forEach(function(packet) {
		    if (packet.FieldId === 'STTM') {
			result.ShootTime = timetosecs(packet.Value);
			result.ShootRank = parseInt(packet.Rank, 10);
			if (isNaN(result.ShootRank)) {result.ShootRank = 999;}
		    }
		    else if (packet.FieldId === 'FINN') {
			result.TotalRank = parseInt(packet.Rank, 10);
			if (isNaN(result.TotalRank)) {result.TotalRank = 999;}
		    }
		    else if (packet.FieldId === 'A0TR') {
			result.RangeTime = timetosecs(packet.Value);
			result.RangeRank = parseInt(packet.Rank, 10);
			if (isNaN(result.RangeRank)) {result.RangeRank = 999;}
		    }
		    else if (packet.FieldId === 'A0TC') {
			result.CourseTime = timetosecs(packet.Value);
			result.CourseRank = parseInt(packet.Rank, 10);
			if (isNaN(result.CourseRank)) {result.CourseRank = 999;}
		    }
		});
	    }
	    cb(null, result);
	}
    };
    request({url: 'http://datacenter.biathlonresults.com/modules/sportapi/api/Analysis', qs: params}, err_resp_body2analysis_data);
}

function results_data2analysis_data(results, cb) {
    log(arguments.callee.name);
    async.mapLimit(results, 1020, function(result, cb) {result_data2analysis_data(result, cb);}, cb);
}

function ibuid2athlete_bio(ibuid, cb) {
    log(arguments.callee.name);
    var params = { IBUId: ibuid, _: 1359993916314, callback: '', RT: 340203};
    var err_resp_body2athlete_bio = function(err, resp, body) {
	if(!err && resp.statusCode == 200) {
	    var athlete_bio = JSON.parse(body, dateReviver);
	    athlete_bio = athlete_bio.Bios;
	    athlete_bio.IBUId = ibuid;
	    cb(null, athlete_bio);
	}
    };
    request({url: 'http://datacenter.biathlonresults.com/modules/sportapi/api/bios', qs: params}, err_resp_body2athlete_bio);
}

function results_data2athlete_bios(results, cb) {
    log(arguments.callee.name);
    ibuids = stripathletes(results);
    var fillindetails = function(err, athlete_bios) {
	athlete_list = [];
	for (var i = 0; i < athlete_bios.length; i++) {
	    var newathlete = {};
	    if (athlete_bios[i] !== null && athlete_bios[i].IBUId.length > 10) {
		for (var j = 0; j < results.length; j++) {
		    if (athlete_bios[i].IBUId === results[j].IBUId) {
			newathlete.IBUId = results[j].IBUId;
			newathlete.Nat = results[j].Nat;
			newathlete.Name = results[j].Name;
			newathlete.ShortName = results[j].ShortName;
			var gender = results[j].RaceId.charAt(15);
			if (gender === "X") {
			    if (results[j].Leg > 2) {gender = "M";}
			    else {gender = "W";}
			}
			newathlete.Gender = gender;
			for (var k = 0; k < athlete_bios[i].length; k++) {
			    if (athlete_bios[i][k].Group === 'PD') {
				if (athlete_bios[i][k].Description === 'Height' && parseInt(athlete_bios[i][k].Value, 10)) {
				    newathlete.Height = parseInt(athlete_bios[i][k].Value.replace('.', ''), 10);
				}
				if (athlete_bios[i][k].Description === 'Weight' && parseInt(athlete_bios[i][k].Value, 10)) {
				    newathlete.Weight = parseInt(athlete_bios[i][k].Value, 10);
				}
			    }
			}
		    }
		}
	    }
	    if (Object.getOwnPropertyNames(newathlete).length > 0) {athlete_list.push(newathlete);}
	}
	cb(err, athlete_list);
    };
    async.map(ibuids, ibuid2athlete_bio, fillindetails);
}

function example2schema(example) {
    var typelookup = {string: 'String', number: 'Number', date: 'Date', boolean: 'Boolean', array: 'Array', objectid: 'ObjectId', mixed: 'Mixed', null: 'String'};
    var schema = {};
    for (var k in Object.keys(example)) {
	var type = toType(example[Object.keys(example)[k]]);
	schema[Object.keys(example)[k]] = typelookup[type];
    }
    return JSON.stringify(schema).replace(/"/g, "");
}

function dateReviver(key, value) {
    var a;
    if (typeof value === 'string') {
	a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
	if (a) {
	    return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
			    +a[5], +a[6]));
	}
    }
    return value;
}

function containsone(subj, poss) {
    for (var ii in poss) {
	if (subj.search(poss[ii]) >= 0) {
	    return true;
	}
    }
    return false;
}

function gensaver(variable, attr, flatten, cb) {
    var outputsaver = function(err, data) {
	if (flatten) {
	    variable[attr] = flattenArray(data);
	}
	else {
	    variable[attr] = data;
	}
	if (typeof cb !== "undefined") {
	    cb(null, data);
	}
    };
    return outputsaver;
}

function consolelogger(err, data) {
    console.log(data);
}

function toType(obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

function runscript(season) {
    global._data = {};
    global._out = {};
    async.series({Meetings: function(callback) {var savemeetings = gensaver(global._data, 'Meetings', true, callback);
						season2meetings_data(season, savemeetings);
					       },
		  Races: function(callback) {var saveraces = gensaver(global._data, 'Races', true, callback);
					     meetings_data2races_data(global._data.Meetings, saveraces);
					    },
		  Results: function(callback) {var saveresults = gensaver(global._data, 'Results', true, callback);
					       races_data2results_data(global._data.Races, saveresults);
					      },
		  Analysis: function(callback) {var saveanalysis = gensaver(global._data, 'Analysis', true, callback);
						results_data2analysis_data(global._data.Results, saveanalysis);
					       },
		  Athletes: function(callback) {var saveathletes = gensaver(global._data, 'Athletes', false, callback);
						results_data2athlete_bios(global._data.Results, saveathletes);
					       }
		  },
		 function(err, result) {global._out = result;
					console.log("FINISHED");}
		);
}

function getnumbers(string) {
    var re = /[0-9]/g;
    var matches = [];
    var match;
    while(true) {
	match = re.exec(string);
	if (match !== null) { matches.push(parseInt(match[0], 10)); }
	else { break; }
    }
    return matches;
}

function timetosecs(string) {
    if (string === null) {return 86399;}
    timearray = string.replace('+','').split(':');
    time = 0;
    for (var i = 0; i < timearray.length; i++) {
	time += parseFloat(timearray[timearray.length - i - 1]) * Math.pow(60, i);
    }
    return time;
}

function parsekm(km) {
    if (km === null) {return 0;}
    sets = km.split('+');
    distance = [];
    for (var i = 0; i < sets.length; i++) {
	thisset = sets[i].split('x');
	if (thisset.length > 1) {
	    for (var j = 0; j < parseInt(thisset[0], 10); j++) {
		distance.push(parseFloat(thisset[1]));
	    }
	}
	else {
	    distance.push(parseFloat(thisset[0]));
	}
    }
    return distance;
}

function stripathletes(results) {
    athlist = [];
    for (var i = 0; i < results.length; i++) {
	if (athlist.indexOf(results[i].IBUId) < 0) {athlist.push(results[i].IBUId);}
    }
    return athlist;
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


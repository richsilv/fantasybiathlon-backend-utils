def parsefile(results):
	f = open(results, 'r')
	g = tuple(f.readlines())
	i = 0
	results = []
	while i < len(g):
		print g[i]
		if g[i] == 'Rank Bib Name Nat T \n':
			res = {'Name': g[i+6].partition(' ')[2].rsplit(' ', 1)[0]}
			res['Behind'] = float(g[i+18].split(' ')[0])
			res['EventId'] = "ZZZ"
			res['IBUId'] = "ZZZ"
			res['Nat'] = g[i+9].split(' ')[0]
			res['RaceId'] = "ZZZ"
			res['RaceTime'] = "ZZZ"
			res['Rank'] = int(g[i-1].split(' ')[0])
			res['ResultOrder'] = res.Rank
			res['ShootingTotal'] = int(g[i+14].split(' ')[0])
			shootingline = g[i+23].split(' ')
			res.Shootings = []
			for j in [1, 5, 9, 13] if len(shootingline) > 15 else [1, 5]:
				res.Shootings.append(int(shootingline[j]))
			res['TotalTime'] = time_convert(g[i+16].split(' ')[0])
			res['TotalRank'] = res.Rank
			res['ShootRank'] = 0
			res['ShootScore'] = 0
			res['RangeTime'] = time_convert(g[i+24].split(' ')[13])
			res['RangeRank'] = 0
			res['CourseRank'] = 0
			res['CourseTime'] = time_convert(g[i+25].split(' ')[16])
			results.append(res)
		i = i + 1
	return results


def time_convert(time_string):
	if not time_string or time_string == 'Lapped': return 86399
	if time_string == "0.0":
		return 0
	else:
		if time_string.find("+") == 0: time_string = time_string[1:]
		if time_string.find(":") < 0:
			time_string = "00:00:" + ("0" * (4-len(time_string))) + time_string
		elif time_string.find(":",3) < 0:
			time_string =  "00:" + ("0" * (7-len(time_string))) + time_string
		try:
			ct = datetime.datetime.strptime(time_string, "%H:%M:%S.%f")
		except:
			return 86399
		return datetime.timedelta(hours=ct.hour, minutes=ct.minute, seconds=ct.second, microseconds=ct.microsecond).total_seconds()
	return 86399
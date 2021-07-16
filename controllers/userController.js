const request = require("request");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const async = require("async");
const rimraf = require("rimraf");

var appDir = path.dirname(require.main.filename);

exports.getDetails = async (req, res, next) => {
	var total = 0,
		ac = 0,
		wrong = 0,
		tle = 0,
		runtime = 0,
		memorylimit = 0,
		other = 0,
		compilation = 0,
		hacked = 0,
		done = 0,
		maxRatingQuestion = 0;

	//Getting Params From Request
	var nick = req.body.nick;
	handle = nick.toString();
	nick = nick.split(/\s/).join("");

	//Making a URL
	const url = `https://codeforces.com/api/user.status?handle=${nick}`;

	//Making a request to the api
	request(url, (err, response, body) => {
		//If UserId is Invalid
		if (response.statusCode === 400) {
			done = 1;
			return res.render("home", {
				done: done,
				nick: "",
			});
		}
		//Otherwise get user details
		else if (response.statusCode === 200) {
			done = 2;
			var jsonObject = JSON.parse(body);
			var result = jsonObject.result;
			//Map to get rid of multiple accepted submissions of a given problem
			let probMap = new Map();
			//Result is an array of all the submissions
			async.forEach(
				result,
				function (solution, callback) {
					total = total + 1;
					//If conditions to handle all the verdicts
					if (solution.verdict === "OK") {
						var rating = solution.problem.rating;
						if (maxRatingQuestion < rating) {
							maxRatingQuestion = rating;
						}
						//Removing any special characters from the problem name & also removing spaces
						if (!probMap.has(solution.problem.name)) {
							ac = ac + 1;
							probMap.set(solution.problem.name, 1);
						}
					} else if (solution.verdict === "WRONG_ANSWER") {
						wrong = wrong + 1;
					} else if (solution.verdict === "TIME_LIMIT_EXCEEDED") {
						tle = tle + 1;
					} else if (solution.verdict === "RUNTIME_ERROR") {
						runtime = runtime + 1;
					} else if (solution.verdict === "MEMORY_LIMIT_EXCEEDED") {
						memorylimit = memorylimit + 1;
					} else if (solution.verdict === "COMPILATION_ERROR") {
						compilation = compilation + 1;
					} else if (solution.verdict === "CHALLENGED") {
						hacked = hacked + 1;
					} else {
						other = other + 1;
					}
					callback();
				},
				(err) => {
					if (err) {
						console.log(err);
						return res.render("home", {
							done: 1,
							nick: "",
						});
					}
					var user = nick;
					URL = `https://codeforces.com/profile/${nick}`;
					var accuracy = 0;
					if (total !== 0) {
						accuracy = (ac / total) * 100;
					}
					accuracy = accuracy.toFixed(2);
					return res.render("home", {
						nick: user,
						URL: URL,
						total: total,
						accuracy: accuracy,
						ac: ac,
						tle: tle,
						wrong: wrong,
						runtime: runtime,
						memorylimit: memorylimit,
						compilation: compilation,
						hacked: hacked,
						other: other,
						quesRating: maxRatingQuestion,
						done: done,
					});
				}
			);
		}
	});
};

//function to create zip file
var createZip = async (obj) => {
	const nick = obj.nick;
	const dataPath = path.join(appDir, "data", nick);
	var uploadDir = fs.readdirSync(dataPath);
	const zip = new AdmZip();

	for (var i = 0; i < uploadDir.length; i++) {
		var filePath = path.join(appDir, "data", nick, uploadDir[i]);
		zip.addLocalFile(filePath);
	}

	// Define zip file name
	let downloadName = nick + ".zip";
	obj.downloadName = downloadName;

	const data = zip.toBuffer();

	// save file zip in root directory
	var zipPath = path.join(appDir, "download", downloadName);
	zip.writeZip(zipPath);

	return data;
};

var createFile = (dirPath, code) => {
	Path = dirPath.toString();
	fs.writeFileSync(Path, code, (err) => {
		console.log(err);
	});
};

exports.downloadSolutions = (req, res, next) => {
	var nick = req.body.nick;

	const url = `https://codeforces.com/api/user.status?handle=${nick}`;

	//Making a request to the api
	request(url, (err, response, body) => {
		if(err){
			res.redirect('/');
		}
		else if (response.statusCode === 200) {
			var jsonObject = JSON.parse(body);
			var result = jsonObject.result;

			const folderPath = path.join(appDir, "data", nick);

			rimraf(folderPath, () => {
				fs.mkdir(folderPath, (err) => {
					if (err) {
						console.log(err);
					}
				});
				// Using async.eachseries to fetch solutions one by one so as to avoid block from the website
				async.eachSeries(
					result,
					async function (solution, callback) {
						//If conditions to keep count of all the verdicts
						var dirPath;
						var lang = solution.programmingLanguage.toString();
						lang = lang.substring(4, 7);
						if (solution.verdict === "OK" && lang === "C++") {
							var problemName = solution.problem.name
								.split(/\s/)
								.join("")
								.replace(/[^a-zA-Z ]/g, "");

							var id = solution.id;
							var contestId = solution.contestId;
							var solutionUrl = `https://codeforces.com/contest/${contestId}/submission/${id}`;

							request(solutionUrl, async (err, res, html) => {
								if (!err && res.statusCode === 200) {
									async function f() {
										var fileName = problemName + ".cpp";
										dirPath = path.join(appDir, "data", nick, fileName);
										// console.log(dirPath);
										const $ = await cheerio.load(html);
										const solutionBody = await $(".linenums");
										return await solutionBody.text();
									}

									f().then((result) => {
										callback(createFile(dirPath, result));
									});
								}
							});
						} else {
							callback();
						}
					},
					(err) => {
						if (err) {
							console.log(err);
						}
						// code to download zip file
						var obj = {
							nick: nick,
							downloadName: "",
						};
						createZip(obj)
							.then((data) => {
								res.set("Content-Type", "application/octet-stream");
								res.set(
									"Content-Disposition",
									`attachment; filename=${obj.downloadName}`
								);
								res.set("Content-Length", data.length);
								// console.log("All Files Downloaded!");
								res.send(data);
								var zipPath = path.join(appDir, "download", obj.downloadName);
								rimraf.sync(zipPath);
								rimraf.sync(folderPath);
							})
							.catch((err) => console.log(err));
					}
				);
			});
		}
		else{
			res.redirect('/');
		}
	});

};

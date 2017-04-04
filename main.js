var request = require('request');
var jsdom = require('jsdom');
var jquery = require('jquery');
var randomUserAgent = require('bluebird').promisifyAll(require('random-http-useragent'));

async function get_single_page(group, page) {
	request.post("https://www.computeruniverse.ru/list.asp", {
		json: {
			ajamode: "2",
			group: group.toString(),
			navigate: page.toString(),
			v: "0",
			o: "[POP],+[SC],+[VKB],+[N1],+[N2]",
		},
		headers: {
			'User-Agent': await randomUserAgent.getAsync(),
		}
	}, function (error, response, body) {
		if (error || response.statusCode != 200)
			return;
		jsdom.env(body, function(err, window) {
			if (err) {
				console.error(err);
				return;
			}
			var $ = jquery(window);
			console.log($("body").html());
		});
	});	
}

get_single_page(30001062, 2);

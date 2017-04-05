var request = require('request');
var jsdom = require('jsdom');
var jquery = require('jquery');
var beautify = require("json-beautify");
var randomUserAgent = require('bluebird').promisifyAll(require('random-http-useragent'));
var express = require('express');
var app = express();

function get_single_page(group, page) {
	return new Promise(async (resolve, reject) => {
		request.post("https://www.computeruniverse.ru/list.asp", {
			form: {
				ajamode: 2,
				group: group,
				navigate: page,
				v: 0,
				o: "[POP],+[SC],+[VKB],+[N1],+[N2]",
			},
			headers: {
				'User-Agent': await randomUserAgent.get(),
			}
		}, function (error, response, body) {
			if (error || response.statusCode != 200) {
				console.log(error+response.statusCode+body);
				reject();
				return;
			}
			jsdom.env(body, function(err, window) {
				if (err) {
					console.error(err);
					return;
				}
				var $ = jquery(window);
				var list = [];
				$(".productsTableRow").each(function() {
					var good = {};
					good.id = $(this).attr("id")-0;
					good.image = $(this).find("img").data("original");
					good.title = $(this).find(".listProductTitle").find(".ellipsisBlock").text();
					good.props = $(this).find(".props").find("li").map(function() {
						return $(this).find("span").map(function() { return $(this).text() }).toArray().reduce((a, b) => a + b);
					}).toArray();
					good.sale = $(this).find(".listPercentViewBig").text() || null;
					try {
						good.badPrice = /([0-9,]+)/g.exec($(this).find(".priceStrokeBlue").text())[0].replace(",", ".")-0;
					} catch(ex) {
						good.badPrice = null;
					}
					good.price =  /([0-9,]+)/g.exec($(this).find(".priceItalicBig").text())[0].replace(",", ".")-0;
					good.delivery = {
						where: $(this).find(".listStatusInfo strong").text(),
						status: $(this).find(".listStatusInfo span").text(),
					};
					list.push(good);
				});
				resolve(list);
			});
		});	
	});
}

app.get("/get/:group/:page", async (req, res) => {
	var list = await get_single_page(30001062, 2);
	res.json(beautify(list, null, 4, 100));
});	

app.get("/example", (req, res) => {
	 res.redirect('/get/30001062/2');
});

app.get("/test", (req, res) => {
	res.send("100zzz");
});

app.listen(99, function () { //3030
	console.log('coun stated');
});

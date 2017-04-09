var request = require('request');
var jsdom = require('jsdom');
var jquery = require('jquery');
var beautify = require("json-beautify");
var randomUserAgent = require('bluebird').promisifyAll(require('random-http-useragent'));
var express = require('express');
var app = express();

//Точка в стоимости товара

var global_list = {};

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
				console.log("ZZZZ");
				reject();
				return;
			}
			jsdom.env(body, function(err, window) {
				if (err) {
					console.error(err);
					reject();
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
					good.price =  /([0-9,.]+)/g.exec($(this).find(".priceItalicBig").text())[0].replace(".", "").replace(",", ".")-0;
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

/*app.get("/getupto/:group/:page", async (req, res) => {
	var lists = [];
	var list;
	var upto = req.params.page-0;
	var group = req.params.group;
	console.log("begin");
	for(var i = 0; i < upto; i++) {
		console.log(group + "-" + i);
		list = await get_single_page(group, i);
		lists.push(list);
	}
	res.send(beautify(lists, null, 8, 100).replace(/\n/g, "<br/>").replace(/\s/g, "&nbsp;"));
});*/

app.get("/get/:group/:page", async (req, res) => {
	var list = await get_single_page(req.params.group, req.params.page);
	global_list = list;
	res.send(beautify(list, null, 8, 100).replace(/\n/g, "<br/>").replace(/\s/g, "&nbsp;"));
});	

app.get("/example", (req, res) => {
	 res.redirect('/get/30001062/2');
});




var mysql = require('promise-mysql');
var connection;
 
pool = mysql.createPool({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'opencart',
	connectionLimit: 10
});

function update_item(item, res) {
	var title = item.title;
	var uc_code = item.id;
	var price = item.price;
	var image = item.image;
	
	var sql = "INSERT INTO `oc_product` (`product_id`, `model`, `sku`, `upc`, `ean`, `jan`, `isbn`, `mpn`, `location`, `quantity`, `stock_status_id`, `image`, `manufacturer_id`, `shipping`, `price`, `points`, `tax_class_id`, `date_available`, `weight`, `weight_class_id`, `length`, `width`, `height`, `length_class_id`, `subtract`, `minimum`, `sort_order`, `status`, `viewed`, `date_added`, `date_modified`) VALUES (NULL, '" + title + "', '', '" + uc_code + "', '', '', '', '', '', '939', '7', 'catalog/demo/htc_touch_hd_1.jpg', '5', '1', '" + price + "', '200', '9', '2009-02-03', '146.40000000', '2', '0.00000000', '0.00000000', '0.00000000', '1', '1', '1', '0', '1', '0', '2009-02-03 16:06:50', '2017-04-09 19:50:22')";
	
	pool.query(sql).then(function(item){
		var product_id = item.insertId;
		var sql2 = "INSERT INTO `oc_product_description` (`product_id`, `language_id`, `name`, `description`, `tag`, `meta_title`, `meta_description`, `meta_keyword`) VALUES ('" + product_id + "', '1', '" + title + "', '124124', '', '124124', '', '');"
		pool.query(sql2).then(function(item){
			res.json("Okay!");
		});
	});
}

app.get("/dor", (req, res) => {
	var f = global_list[0];
	update_item(f, res);
});

app.listen(99, function () { //3030
	console.log('coun stated');
});
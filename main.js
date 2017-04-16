var request = require('request'),
	jsdom = require('jsdom'),
	jquery = require('jquery'),
	beautify = require("json-beautify"),
	randomUserAgent = require('bluebird').promisifyAll(require('random-http-useragent')),
	path = require('path'),
	fs = require('fs'),
	argv = require('yargs').argv;

var global_list = {};

function download(uri, filename) {
	return new Promise((resolve, reject) => {
		request.head(uri, function(err, res, body){
			console.log('content-type:', res.headers['content-type']);
			console.log('content-length:', res.headers['content-length']);
			request(uri).pipe(fs.createWriteStream(filename)).on('close', function() {
				resolve();
			}).on('error', reject);
		});
	});
}

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

var mysql = require('bluebird').promisifyAll(require('promise-mysql'));
var connection;
 
pool = mysql.createPool({
	host: '185.117.152.135',
	//port: '/var/lib/mysql/mysql.sock',
	user: 'coun',
	password: 'yyyzzz002V',
	database: 'coun.shop',
	connectionLimit: 10
}); //admin y4566400kg

function compute_description_from_props(props) {
	return "<ul>"+props.map((a)=>`<li>${a}</li>`).reduce((a,b)=>a+b)+"</ul>";
}

function update_item(item, category_id) {
	return new Promise(async (resolve, reject) => {
		console.log("step 1");
		
		var title = item.title;
		var product_id = item.id;
		var price = item.price;
		var description = compute_description_from_props(item.props);
		var image = "catalog/coun/" + path.basename(item.image);
		
		if (!fs.existsSync("../public_html/image/" + image)) {
			await download(item.image, "../public_html/image/" + image);
		}
		
		console.log("step 2");
		
		var sql = `INSERT INTO oc_product (product_id, model, sku, upc, ean, jan, isbn, mpn, location, quantity, stock_status_id, image, manufacturer_id, shipping, price, points, tax_class_id, date_available, weight, weight_class_id, length, width, height, length_class_id, subtract, minimum, sort_order, status, viewed, date_added, date_modified) VALUES (${product_id}, '${title}', '', '', '', '', '', '', '', '6', '7', '${image}', 0, '1', '${price}', '0', '9', '2009-02-03', '146.40000000', '2', '0.00000000', '0.00000000', '0.00000000', '1', '1', '1', '0', '1', '0', '2009-02-03 16:06:50', '2017-04-09 19:50:22') ON DUPLICATE KEY UPDATE model=VALUES(model), sku=VALUES(sku), upc=VALUES(upc), ean=VALUES(ean), jan=VALUES(jan), isbn=VALUES(isbn), mpn=VALUES(mpn), location=VALUES(location), quantity=VALUES(quantity), stock_status_id=VALUES(stock_status_id), image=VALUES(image), manufacturer_id=VALUES(manufacturer_id), shipping=VALUES(shipping), price=VALUES(price), points=VALUES(points), tax_class_id=VALUES(tax_class_id), date_available=VALUES(date_available), weight=VALUES(weight), weight_class_id=VALUES(weight_class_id), length=VALUES(length), width=VALUES(width), height=VALUES(height), length_class_id=VALUES(length_class_id), subtract=VALUES(subtract), minimum=VALUES(minimum), sort_order=VALUES(sort_order), status=VALUES(status), viewed=VALUES(viewed), date_added=VALUES(date_added), date_modified=VALUES(date_modified);`;
		
		console.log("step 3");
		
		pool.query(sql).then(function(item){
			var sql2 = `REPLACE INTO oc_product_description (product_id, language_id, name, description, tag, meta_title, meta_description, meta_keyword) VALUES ('${product_id}', '1', '${title}', '${description}', '', '${title}', '', '');`;
			console.log("step 4");
			pool.query(sql2).then(function(item){
				var sql3 = `REPLACE INTO oc_product_to_category (product_id, category_id) VALUES (${product_id}, ${category_id});`;
				console.log("step 5");
				pool.query(sql3).then(function(item){
					var sql4 = `REPLACE INTO oc_product_to_store (product_id, store_id) VALUES (${product_id}, 0);`;
					pool.query(sql4).then(function(item){
						resolve();
					})
				});
			});
		});
	});
}

async function grub_products() { //example --from=1 --to=23 (с 23 до 1)
	var group = argv.group || 30001062;
	var from = argv.from || 1;
	var to = argv.to || 1;
	
	for(var page = to; page >= from; page--) {
		var list = await get_single_page(group, page);
		for(var i = 0; i < list.length; i++) {
			await update_item(list[i], group);
		}
	}
	console.log("END.");
	process.exit();
}

grub_products();

async function create_category(category_id, category_name) {
	
	var sql = `INSERT INTO oc_category (category_id, image, parent_id, top, column, sort_order, status, date_added, date_modified) VALUES ('${category_id}', '', '0', '0', '1', '0', '1', '', '');`;
	pool.query(sql).then(function(item){
		var sql2 = `INSERT INTO oc_category_description (category_id, language_id, name, description, meta_title, meta_description, meta_keyword) VALUES (${category_id}, '1', '${category_name}', '', '${category_name}', '', '');`;
		pool.query(sql2).then(function(item){
			var sql3 = `INSERT INTO oc_category_path (category_id, path_id, level) VALUES (${category_id}, ${category_id}, 0)`;
			pool.query(sql3).then(function(item){
				var sql4 = `INSERT INTO oc_category_path (category_id, path_id, level) VALUES (${category_id}, ${category_id}, 0);`;
			});
		});
	});
}
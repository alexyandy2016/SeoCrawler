var express = require('express'),
	path = require('path'),
	sm = require('sitemap'),
	redis = require('redis'),
	redis_conf = require('../config/config.js').redis,
	tools = require('../components/tools.js');
var router = express.Router();

/* GET api listing. */
router.get('/:appid/*', function(req, res) {
	if(req.params[0] == 'sitemap.xml') {
		client = redis.createClient(redis_conf.port, redis_conf.ip);
		if(redis_conf.db != 0)
			client.select(redis_conf.db);

		client.lrange([redis_conf.keyList + req.params.appid + ':' + tools.CurentDate(), '0', '-1'], function(err, response){
			if(!err && response.length != 0) {
				client.get(redis_conf.keyAppConf + req.params.appid, function(err, url){
					client.quit();
			        if(!err && url) {
			        	var sitemap = sm.createSitemap({
							hostname: url,
				            urls: []   
				        }); 

				        response.forEach(function (u) {
				        	if(u) {
				        		sitemap.add({url: u, changefreq: 'daily'});
				        	}
				        }); 
						
						sitemap.toXML( function (xml) {
				            res.header('Content-Type', 'application/xml');
				            res.send(xml);
				        }); 
			        } else {
			            res.send(404);
			        }
			    });
			} else {
				client.quit();
				res.send(404);
			}
		});
	} else {
	  	res.type('html');
	  	res.status(200).sendFile(path.join(__dirname, '../crawler/output/', req.params.appid, tools.md5('/' + req.params[0])));
	}
});

module.exports = router;
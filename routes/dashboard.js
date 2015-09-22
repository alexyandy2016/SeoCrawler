var crypto = require('crypto'),
	express = require('express'),
	redis = require('redis'),
	async = require('async'),
	childProcess = require('child_process'),
	redis_conf = require('../config/config.js').redis,
	tools = require('../components/tools.js');
var router = express.Router();

router.route('/app/add')
.post(function(req, res, next){
	var url = req.param('url').trim();
	var client = redis.createClient(redis_conf.port, redis_conf.ip);
	if(redis_conf.db != 0)
		client.select(redis_conf.db);

	client.lindex(redis_conf.keyAppList, '-1', function(err, len) {
		if(!len)
			len = 0;
		var appid = parseInt(len) + 1;
		if(url.match(/http(s)?:\/\/([\w-]+\.)+[\w-]+/)) {
			client.set(redis_conf.keyAppConf + appid, url, function(err, reply){
				client.rpush(redis_conf.keyAppList, appid, function(err, reply){
					client.quit();
					res.redirect('/dashboard/app/' + appid + '-1');
				});
			});
		} else {
			client.quit();
			next();
		}
	});
})
.get(function(req, res) {
	res.render('dashboard/appconf', {type: 'add'});
});

router.route('/app/setting-:appid')
.post(function(req, res, next) {
	var appid = req.params.appid;
	var url = req.param('url').trim();
	if(url.match(/http(s)?:\/\/([\w-]+\.)+[\w-]+/)) {
		var client = redis.createClient(redis_conf.port, redis_conf.ip);
		if(redis_conf.db != 0)
			client.select(redis_conf.db);
		client.set(redis_conf.keyAppConf + appid, url, function(err, reply){
			client.quit();
			res.render('dashboard/appconf', {appid: appid, url: url, type: 'setting'});
		});
	} else {
		next();
	}
})
.all(function(req, res) {
	var appid = req.params.appid;

	var client = redis.createClient(redis_conf.port, redis_conf.ip);
	if(redis_conf.db != 0)
		client.select(redis_conf.db);

	client.get(redis_conf.keyAppConf + appid, function(err, url){
		client.quit();
        if(!err && url) {
            res.render('dashboard/appconf', {appid: appid, url: url, type: 'setting'});
        } else {
            res.send(404);
        }
    });
});

router.get('/app/del-:appid', function(req, res) {
	var appid = req.params.appid;

	var client = redis.createClient(redis_conf.port, redis_conf.ip);
	if(redis_conf.db != 0)
		client.select(redis_conf.db);

	client.lrem(redis_conf.keyAppList, 0, appid, function(err, reply){
		client.del(redis_conf.keyAppConf + appid, function(err, reply) {
			client.quit();
			res.redirect('/dashboard');
		});
    });
});

router.get('/app/:appid-:type', function(req, res) {
	var appid = req.params.appid,
		type = req.params.type;

	var client = redis.createClient(redis_conf.port, redis_conf.ip);
	if(redis_conf.db != 0)
		client.select(redis_conf.db);

	client.get(redis_conf.keyAppState + appid, function(err, appState){
		if(type == 3) {	//队列
			var appArgs = [ redis_conf.keyQueue + appid + ':' + tools.CurentDate(), '0', '-1' ];
			client.lrange(appArgs, function(err, response){
				var list = [];
		    	if(!err && response.length != 0) {	
		    		async.eachSeries(response, function (url, callback) {
		    			var hostMatch = url.match(/http(s)?:\/\/([\w-]+\.)+[\w-]+/);
			            var basehost = hostMatch ? hostMatch[0] : url;
			            var md5Url = tools.md5(url.replace(basehost, ""));
					    client.get(redis_conf.keyItem + appid + ':' + tools.CurentDate() + ':' + md5Url, function(err, reply){
					    	if(!err && reply != null && reply != -1 && reply != 2) {
						    	list.push({url: url, state: reply});
		                    }
		                    callback(err, reply);
		                });
					}, function (err) {
						client.quit();
						res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
					});
		    	} else {
		    		client.quit();
		    		res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
		    	}
			});
		} else if (type == 2) {	//出错
			var appArgs = [ redis_conf.keyErrList + appid + ':' + tools.CurentDate(), '0', '-1' ];
			client.lrange(appArgs, function(err, response){
				var list = [];
		    	if(!err && response.length != 0) {
		    		async.eachSeries(response, function (url, callback) {
		    			var md5Url = tools.md5(url);
					    client.get(redis_conf.keyItem + appid + ':' + tools.CurentDate() + ':' + md5Url, function(err, reply){
					    	if(!err && reply != null && reply == -1) {
						    	list.push({url: url, state: reply});
		                    }
		                    callback(err, reply);
		                });
					}, function (err) {
						client.quit();
						res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
					});
		    	} else {
		    		client.quit();
		    		res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
		    	}
			});
		} else {	//成功
			var appArgs = [ redis_conf.keyList + appid + ':' + tools.CurentDate(), '0', '-1' ];
			client.lrange(appArgs, function(err, response){
				var list = [];
		    	if(!err && response.length != 0) {
		    		async.eachSeries(response, function (url, callback) {
		    			var md5Url = tools.md5(url);
					    client.get(redis_conf.keyItem + appid + ':' + tools.CurentDate() + ':' + md5Url, function(err, reply){
					    	if(!err && reply != null && reply != -1 && reply != 0) {
						    	list.push({url: url, state: reply});
		                    }
		                    callback(err, reply);
		                });
					}, function (err) {
						client.quit();
		    			res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
					});
		    	} else {
		    		client.quit();
		    		res.render('dashboard/app', {list: list, type: type, appid: appid, state: appState});
		    	}
			});
		}
	});
});

/* GET dashboard index. */
router.get('/', function(req, res) {
	var client = redis.createClient(redis_conf.port, redis_conf.ip);
	if(redis_conf.db != 0)
		client.select(redis_conf.db);
	var appArgs = [ redis_conf.keyAppList, '0', '-1' ];
    client.lrange(appArgs, function(err, response){
        if(!err && response.length != 0) {
        	var apps = [];
        	async.eachSeries(response, function (appid, callback) {
                //获取 appid 对应配置
                client.get(redis_conf.keyAppConf + appid, function(err, url){
                    if(!err && url) {
                    	console.log(url);
                    	apps.push({appid: appid, url: url});
                    }
                    callback(err, url);
                });
            }, function (err) {
                client.quit();
                res.render('dashboard/index', {apps: apps});
            });
        } else {
        	client.quit();
            res.render('dashboard/index', {apps: []});
        }
    });
});

module.exports = router;
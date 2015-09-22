var crypto = require('crypto'),
    path = require('path'),
    childProcess = require('child_process'),
    redis = require('redis'),
    fs = require('fs'),
    async = require('async'),
    program = require('commander'),
    ent = require('ent');

program
  .version('0.1.0')
  .option('-a, --appid [appid]', '执行某 APPID 抓取任务')
  .parse(process.argv);

var redis_ip = '192.168.1.112',  
    redis_port = 6379,
    keyAppConf = 'seocrawler:app:',
    keyAppList = 'seocrawler:applist',
    keyAppState = 'seocrawler:appstate:',
    keyList = 'seocrawler:list:',
    keyErrList = 'seocrawler:errlist:',
    keyItem = 'seocrawler:item:',
    keyQueue = 'seocrawler:queue:',
    waittimeout = 1000,
    client = redis.createClient(redis_port, redis_ip);

// 给字符串添加原型
String.prototype.in_array = function(arr){

    // 遍历是否在数组中
    for(var i=0,k=arr.length;i<k;i++){
        if(this==arr[i]){
            return true;    
        }
    }
 
    // 如果不在数组中就会返回false
    return false;
};

// 选择 DB
client.select(10, function() {});

client.on("error", function (err) {
    console.log("Client Error " + err);
});

var n = [],
    redisClient = [],
    maxNullNum = 20;
if (program.appid) {
    var appid = program.appid;
    //获取 appid 对应配置
    client.get(keyAppConf + appid, function(err, url){
        if(!err && url) {
            var date = CurentDate();
            client.rpush(keyQueue + appid + ':' + date, url);
            console.log('run ' + keyQueue + appid + ':' + date + ':' + url);
            redisClient[appid] = redis.createClient(redis_port, redis_ip);
            redisClient[appid].select(10, function() {});
            n[appid] = {1: 0, 2: 0, 3: 0};
            run(appid, 1);
            run(appid, 2);
            run(appid, 3);
        } else {
            console.error('Appid ' + appid + " has no conf." + err);
        }
        client.quit();
    });
} else {
    var appArgs = [ keyAppList, '0', '-1' ];
    client.lrange(appArgs, function(err, response){
        if(!err && response.length != 0) {
            async.eachSeries(response, function (appid, callback) {
                //获取 appid 对应配置
                client.get(keyAppConf + appid, function(err, url){
                    if(!err && url) {
                        var date = CurentDate();
                        client.rpush(keyQueue + appid + ':' + date, url);
                        console.log('run ' + keyQueue + appid + ':' + date + ':' + url);
                        redisClient[appid] = redis.createClient(redis_port, redis_ip);
                        redisClient[appid].select(10, function() {});
                        redisClient[appid].set(keyAppState + appid, 1);
                        n[appid] = {1: 0, 2: 0, 3: 0};
                        run(appid, 1);
                        run(appid, 2);
                        run(appid, 3);
                    } else {
                        console.error('Appid ' + appid + " has no conf." + err);
                    }
                    callback(err, url);
                });
            }, function (err) {
                client.quit();
            });
        } else {
            console.error('no appid list.');
            client.quit();
        }
    });
}

//订阅消息回调
function run(appid, num) {
	var date = CurentDate();
    redisClient[appid].lpop(keyQueue + appid + ':' + date, function (err, url){
        console.log(url + ' [crawler<' + appid + ":" + num + '> start]');
        if(url) {
            var hostMatch = url.match(/http(s)?:\/\/([\w-]+\.)+[\w-]+/);
            var basehost = hostMatch ? hostMatch[0] : url;
            var md5Url = md5(url.replace(basehost, ""));
            var filename = 'output/' + appid + '/' + md5Url;
            redisClient[appid].set(keyItem + appid + ':' + date + ':' + md5Url, 1);
            childProcess.exec('casperjs casper/test.js --url="' + url + '" --pagename="' + filename + '" --waittimeout=' + waittimeout, function(err, stdout, stderr) {  
                if (err) {
                    redisClient[appid].set(keyItem + appid + ':' + date + ':' + md5Url, -1);
                    redisClient[appid].rpush(keyErrList + appid + ':' + date, url.replace(basehost, ""));
                    console.error(stderr + url + ' [crawler<' + appid + ":" + num + '> end]');
                } else {
                    console.log(stdout + url + ' [crawler<' + appid + ":" + num + '> end]');  
                    var str = '';
                    try {
                        str = fs.readFileSync(filename, 'utf8');
                        redisClient[appid].set(keyItem + appid + ':' + date + ':' + md5Url, 2);
                        var replaceUrl = url;
                        var repUrl = replaceUrl.match(/(.*\/)/);
		                if(repUrl) {
		                	replaceUrl = repUrl[0];
		                }
                        var urlArr = getAHref(str, replaceUrl, basehost);
                        if(urlArr) {
                        	var md5urlArr = [];
                        	var md5keyArr = [];
                            for(var i=0,k=urlArr.length;i<k;i++){
                                urlArr[i] = ent.decode(urlArr[i]);
                                var originUrlItem = urlArr[i];
                                var subStr = originUrlItem.substr(originUrlItem.length - 2, 2);
                                if(subStr == '//') {
                                    console.log('key err droped: ' + originUrlItem + ' [crawler<' + appid + ":" + num + '> key err]');
                                } else {
                                    var md5urlArrKey = md5(urlArr[i]);
                                    if(!md5urlArr.hasOwnProperty(md5urlArrKey)) {
                                        md5urlArr[md5(urlArr[i])] = urlArr[i];
                                        md5keyArr.push(md5(urlArr[i]));
                                    }
                                }
                            }
                            async.eachSeries(md5keyArr, function (md5Url, callback) {
							    var realStr = md5urlArr[md5Url];
							    var str = basehost + realStr;
							    redisClient[appid].get(keyItem + appid + ':' + date + ':' + md5Url, function(err, reply){
							    	if(!err) {
								    	if(reply == null) {
									    	console.log(realStr + ' [crawler<' + appid + ":" + num + '> add queue]');
		                                    redisClient[appid].set(keyItem + appid + ':' + date + ':' + md5Url, 0);
		                                    redisClient[appid].rpush(keyList + appid + ':' + date, realStr);
		                                    redisClient[appid].rpush(keyQueue + appid + ':' + date, str);
		                                }
		                            }
                                    callback(err, reply);
                                });
							}, function (err) {});
                        }
                    } catch(e) {
                        console.error(e);
                        redisClient[appid].set(keyItem + appid + ':' + date + ':' + md5Url, -1);
                        redisClient[appid].rpush(keyErrList + appid + ':' + date, url.replace(basehost, ""));
                    }
                } 
                n[appid][num] = 0;
                run(appid, num);
            }); 
        } else {
        	console.log('failed times ' + (n[appid][num] + 1) + ' url: ' + url + ' [crawler<' + appid + ":" + num + '> end]');  
        	if(n[appid][num] <= maxNullNum) {
        		n[appid][num]++;
            	setTimeout(function(){run(appid, num);}, 3000);
        	} else if(n[appid][1] > maxNullNum && n[appid][2] > maxNullNum && n[appid][3] > maxNullNum) {
                redisClient[appid].set(keyAppState + appid, 0);
        		redisClient[appid].quit();
        	}
        }
    });
}

function getAHref(htmlstr, url, basehost){
    var reg = /<a.+?href=('|")?([^'"]+)('|")?(?:\s+|>)/gim;
    var arr = Array();
    while(tem=reg.exec(htmlstr)){
        var str = tem[2].trim();
        if(str.indexOf('javascript:') < 0 && str != '#') {
            var urlMatch = str.match(/http(s)?:\/\/([\w-]+\.)+[\w-]+/);
            if(urlMatch) {
                if(urlMatch[0] != basehost) {
                    continue;
                }
            } else {
                if(str[0] == '/')
                    str = basehost + str;
                else if(url.substr(url.length -1, 1) == '/')
                    str = url + str;
                else if(url.substr(url.length -2, 2) == '//')
                    continue;
                else
                    str = url + '/' + str;
            }

            var realStr = str.replace(basehost, '');
            if(realStr.in_array(arr)) {
                continue;
            }

            arr.push(realStr);
        }
    }
    return arr;
}

function CurentDate()
{ 
    var now = new Date();
   
    var year = now.getFullYear();       //年
    var month = now.getMonth() + 1;     //月
    var day = now.getDate();            //日
   
    var clock = year;
   
    if(month < 10)
        clock += "0";
   
    clock += month;
   
    if(day < 10)
        clock += "0";
       
    clock += day;
    return(clock); 
}



function md5 (text) {
  return crypto.createHash('md5').update(text).digest('hex');
}
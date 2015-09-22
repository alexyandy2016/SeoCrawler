module.exports.CurentDate = function()
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

module.exports.md5 = function(text) {
    var crypto = require('crypto')
    return crypto.createHash('md5').update(text).digest('hex');
}
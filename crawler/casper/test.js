var fs = require('fs');
var casper = require('casper').create({   
    verbose: true, 
    // logLevel: 'info',
    pageSettings: {
         loadImages:  false,        
         loadPlugins: false,         
         userAgent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.16 Safari/537.36'
    },
    httpStatusHandlers: {
        404: function(self, resource) {
            this.echo("failed", "COMMENT");
            this.exit(1);
        },
        500: function(self, resource) {
            this.echo("failed", "COMMENT");
            this.exit(1);
        },
        502: function(self, resource) {
            this.echo("failed", "COMMENT");
            this.exit(1);
        },
        503: function(self, resource) {
            this.echo("failed", "COMMENT");
            this.exit(1);
        },
    },
});

var url = casper.cli.get('url') || 'http://huodong.139life.com';
var test = casper.cli.get('test') || false;
var pagename = casper.cli.get('pagename') || 'test.html';
var waittimeout = casper.cli.get('waittimeout') || 5000;

var h = 0,
    max = 30,
    c = 1;
function repeat() {
   	casper.scrollToBottom();
    casper.wait(waittimeout, function() {
    	var bb = casper.getElementBounds('html');
   		if(c >= max || h == bb.height) {
   			// this.capture('test.png');
   			fs.write(pagename, this.getPageContent(), 'w');
   			this.echo("success", "COMMENT");
   			this.exit(0);
   		} else {
   			h = bb.height;
   		}
      c++;
   });
	casper.run(repeat);
}

casper.start();

casper.thenOpen(url).then(function() {
	test && console.log('Opening...');
});

casper.run(repeat);
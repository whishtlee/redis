var express = require('express')
var bodyParser = require('body-parser')
var request = require('request');
//const gearman = require("gearman");
//var gearman = new Gearman("task_gearman", 4730);
//var gearman = new Gearman("task_gearman", 4730);

//var request = require('request');

var redis = require('redis');

// cache_redis_master
var client = redis.createClient({
    port: 6379,
    host: 'cache_redis_master',
    retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});// cache_redis_master

// redis connect fails
client.on("error", function (error) {
    // console.log('redis 连接失败');
});

var app = express()

var tranTime = function (t, format) {
    var d = new Date(parseInt(t));
    var y = d.getFullYear();
    var m = (d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1);
    var t = d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
    var h = d.getHours() < 10 ? '0' + d.getHours() : d.getHours();
    var f = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes();
    if (isNaN(t)) {
        return '9999-01-01';
    } else if (format == 'H:s') {
        return h + ':' + f;
    } else if (format == 'H:s:o') {
        return y + '-' + m + '-' + t + ' ' + h + ':' + f + ':00';
    } else if (format == 'y-m-d') {
        return y + '-' + m + '-' + t;
    } else {
        return y + '-' + m + '-' + t + ' ' + h + ':' + f;
    }
};

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// POST /login gets urlencoded bodies
app.post('/PaymentNotice', urlencodedParser, function (req, res) {
    if (!req.body || !req.body.msg) return res.sendStatus(400)

		
    var r = JSON.parse(req.body.msg);
    //console.log(req.body.msg);
  //  gearman.submitJob("accumulate", req.body.msg);
    request.post({url: r.url, formData:{msg:req.body.msg}}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            if(body != "successfully")
            {
				console.log(tranTime(new Date().getTime()))
                console.log("unsuccessfully, url="+r.url);
				console.log("msg = "+req.body.msg);
				client.sadd("payment",req.body.msg)
				
                //gearman.submitJob("payment1", req.body.msg);
            }
            else{
				console.log(tranTime(new Date().getTime()))
                console.log("successfully, url="+r.url);
				console.log("msg = "+req.body.msg);
                res.send('success')
            }
        }
        else{
            console.log("response.statusCode="+response.statusCode+", url="+r.url);
            //gearman.submitJob("payment2", req.body.msg);
        }
    });

    res.send('success')
})
app.listen(8888)

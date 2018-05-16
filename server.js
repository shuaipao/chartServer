const express = require("express");
const bodyParser = require("body-parser");

const static=require('express-static');
const fs = require("fs");
const path = require('path');
const join = path.join;


var app = express();
app.all("*", function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,X-custom");
    res.setHeader("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    //接着执行下面的代码
    next();
});
app.use(bodyParser.urlencoded({extended: false}));

var pg = require('pg');

// 数据库配置
var config = {
    user:"mobstaz",
    database:"application_daily_info_dev",
    password:"l00nie",
    host:'pgm-bp1c326ytv3p97ef14830.pg.rds.aliyuncs.com',
    port:3433,
    // 扩展属性
    max:20, // 连接池最大连接数
    idleTimeoutMillis:3000, // 连接最大空闲时间 3s
}

// 日期处理
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}
function dateToStr(arr){
    var arr1 = arr;
    arr1.applyDate = formatDate(arr1.applyDate);
    return arr1;
}

function getBeforeDay(d, daysNumber) {
    d = new Date(d);
    d = +d - 1000 * 60 * 60 * 24 * daysNumber;
    d = new Date(d);
    var year = d.getFullYear();
    var mon = d.getMonth() + 1;
    var day = d.getDate();
    var s = year + "-" + (mon < 10 ? ('0' + mon) : mon) + "-" + (day < 10 ? ('0' + day) : day);
    return s;
}
// 创建连接池
var pool = new pg.Pool(config);
//分数段区间;

var jscoreImmediate = [0, 50, 50, 86, 86, 129, 129, 150, 150, 200, 200, 241, 241, 300, 300, 1000];

//数据处理函数
function dataBack(score, req, data) {
    var arrlength = 0;
    if (req.query.sectionIpt == "true") {
        arrlength = Math.ceil(req.query.maxScore / req.query.subSection);
    } else {
        arrlength = jscoreImmediate.length/2;
    }
    var chartArr = Array.apply(null, Array(arrlength)).map(() => 0);

    var backData = {
        today: {
            tableArr: [],
            chartData: JSON.parse(JSON.stringify(chartArr)),
            ratioData: []
        },
        lastWeek: {
            tableArr: [],
            chartData: JSON.parse(JSON.stringify(chartArr)),
            ratioData: []
        },
        last30Days: {
            tableArr: [],
            chartData: JSON.parse(JSON.stringify(chartArr)),
            ratioData: []
        }
    };
    var lastWeekDays = getBeforeDay(req.query.applyDate, 6);
    var last30Days = getBeforeDay(req.query.applyDate, 29);

    for (var i = 0; i < data.length; i++) {
        if (((req.query.productName == "全部") || (req.query.productName == data[i].productName)) && ((req.query.channelId == "0") || (req.query.channelId == data[i].channelId)) && ((req.query.isNew == "All") || ((req.query.isNew == 'isNew') && data[i].isNew)) && req.query.scoreName == data[i].scoreName) {
            if (new Date(data[i].applyDate) <= new Date(req.query.applyDate) && new Date(data[i].applyDate) >= new Date(last30Days)) {
                backData.last30Days.tableArr.push(data[i]);
                if (new Date(data[i].applyDate) <= new Date(req.query.applyDate) && new Date(data[i].applyDate) >= new Date(lastWeekDays)) {
                    if (data[i].applyDate == req.query.applyDate) {
                        backData.today.tableArr.push(data[i]);
                        for (var l = 0; l < backData.today.chartData.length; l++) {
                            if (data[i][data[i].scoreName] >= l * req.query.subSection && data[i][data[i].scoreName] < ((l + 1) * req.query.subSection)) {
                                backData.today.chartData[l]++;
                            }
                        }
                    }
                    backData.lastWeek.tableArr.push(data[i]);

                    if (req.query.sectionIpt == "true") {
                        for (var l = 0; l < arrlength; l++) {
                            if (data[i][data[i].scoreName] >= l * req.query.subSection && data[i][data[i].scoreName] < (l + 1) * req.query.subSection) {
                                backData.lastWeek.chartData[l]++;
                            }
                        }
                    } else {
                        for (var l = 0; l < (jscoreImmediate.length / 2); l++) {
                            if (data[i][data[i].scoreName] >= jscoreImmediate[l * 2] && data[i][data[i].scoreName] < jscoreImmediate[l * 2 + 1]) {
                                backData.lastWeek.chartData[l]++;
                            }
                        }
                    }
                }
                if (req.query.sectionIpt == "true") {
                    for (var l = 0; l < arrlength; l++) {
                        if (data[i][data[i].scoreName] >= l * req.query.subSection && data[i][data[i].scoreName] < ((l + 1) * req.query.subSection)) {
                            backData.last30Days.chartData[l]++;
                        }
                    }
                } else {
                    for (var l = 0; l < (jscoreImmediate.length / 2); l++) {
                        if (data[i][data[i].scoreName] >= jscoreImmediate[l * 2] && data[i][data[i].scoreName] < jscoreImmediate[l * 2 + 1]) {
                            backData.last30Days.chartData[l]++;
                        }
                    }
                }

            }
        }

    }


    function ratio(dataObj) {
        var allNum = 0;
        for (var k = 0; k < dataObj.chartData.length; k++) {
            allNum += dataObj.chartData[k];
        }
        for (var j = 0; j < dataObj.chartData.length; j++) {
            dataObj.ratioData[j] = (dataObj.chartData[j] / allNum * 100).toFixed(2);
        }
    }

    ratio(backData.today);
    ratio(backData.lastWeek);
    ratio(backData.last30Days);
    return backData;
}

//数组去重函数
function getCount(arr) {
    return arr.filter((val,index,self)=>self.indexOf(val) == index)
}



//home接口(获取开关列表)
app.get("/home", function (req, res) {
    var data = fs.readFileSync('./json/filterData.json').toString();
    data = JSON.parse(data);
    res.send(data);
});

//appscore接口(获取appscore数据)
app.get("/appscore", function (req, res) {
    var data = fs.readFileSync('./json/applications.json').toString();
    data = JSON.parse(data);
    res.send(dataBack("appscore", req, data));
});

//jscore接口(获取jscore数据)
app.get("/jscore", function (req, res) {
    var indate=getBeforeDay(req.query.applyDate, 35);
    var pgsql=`
        SELECT
            "application"."id" AS "applicationId", id_card_number AS "idNumber", jscore*1000 AS "jscore", 'jscore' AS "scoreName", channel_id AS "channelId", 'true' AS "isNew", application_date AS "applyDate", product_name AS "productName"
        FROM
            "public"."application", "public"."applicant", "public"."application_imei_user_match"
        WHERE
            "application"."application_date" >= '${indate}'
            and "application"."application_date" <= '${getBeforeDay(req.query.applyDate, -1)}'
            and "application"."id"=application_imei_user_match.application_id
            and application_imei_user_match.user_id=applicant.id
        `
    // 查询
    pool.connect((err, client, done)=>{ 
        if(err) return console.error('数据库连接出错', err);
        // 简单输出个 Hello World
        client.query(pgsql, (err, result)=>{
            done();// 释放连接（将其返回给连接池）
            if(err) return console.error('查询出错', err);
            var limi = result.rows.map(dateToStr)
            res.send(dataBack("jscore", req, result.rows));
            // console.log(pgsql); //output: Hello World
        });
    });   

});

//unionpayscore接口(获取unionpayscore数据)
app.get("/unionpayscore", function (req, res) {
    var data = fs.readFileSync('./json/applications.json').toString();
    data = JSON.parse(data);
    res.send(dataBack("unionpayscore", req, data));

});

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//table02


//获取相对路径下的文件名
function findSync(startPath) {
    let result = [];

    function finder(path) {
        let files = fs.readdirSync(path);
        files.forEach((val, index) => {

            let fPath = join(path, val);
            let stats = fs.statSync(fPath);
            // console.log(stats);
            // console.log(fPath);
            if (stats.isDirectory()) finder(fPath);
            if (stats.isFile()) result.push(val.split(".json")[0]);
        });
    }

    finder(startPath);
    return result;
}

//table02文件数组
let fileNames = findSync('./json/table02');

//tableName02接口返回table02表名列表
app.get("/tableName02", function (req, res) {
    res.send(fileNames);
});

//获取table02文件夹内json文件内数据并处理
function table02Date(jsonFileName) {
    var data = fs.readFileSync('./json/table02/' + jsonFileName + '.json').toString();
    if (data) {
        data = JSON.parse(data);
        var subtitle = [];
        for (var p1 in data[1]) {
            if (data[0].hasOwnProperty(p1))
                subtitle.push(p1);
        }
        return {tableData: data, subtitle: subtitle};
    } else {
        return {tableData: [], subtitle: []};
    }

}

//循环生成table02文件夹内json文件名的接口
for (let i = 0; i < fileNames.length; i++) {
    app.get("/" + fileNames[i], function (req, res) {
        res.send(table02Date(fileNames[i]));
    });
}



//4.static数据
app.use(static('./www'));
app.listen(8014);

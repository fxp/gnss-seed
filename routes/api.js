var express = require('express');
var router = express.Router();
var Promise = require("bluebird");

var Parser = {
    parse: function (raw) {
        // TODO
        return {
            header: 'gnss',
            size: 123321,
            sync: false
        };
    }
};

var Logger = {
    logRaw: function (raw, station_id) {
        // TODO
        console.log(station_id + ',' + raw);
    }
}

var unirest = require("unirest");

function doAlgo(data, callback) {
    var req = unirest("POST", "http://127.0.0.1:3000/api/1/algo");

    req.type("json");
    req.send({
        "name": "123"
    });

    req.end(function (res) {
        // if (res.error) throw new Error(res.error);
        if (callback) {
            callback({}, res.body);
        }
    });

}

router.post('/algo', function (req, res, next) {
    res.send('algo response');
});

/* GET users listing. */
router.post('/station/:station_id', function (req, res, next) {
    var raw = req.body,
        station_id = req.params.station_id;

    // TODO add timestamp?
    Logger.logRaw(raw, station_id);

    var data = Parser.parse(raw);

    doAlgo(data, function (err, data) {
        if (err) {
            res.status(500).send("");
        } else {
            res.send('ok');
        }
    });
});

module.exports = router;

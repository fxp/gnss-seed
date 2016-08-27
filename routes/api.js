var express = require('express');
var router = express.Router();
var Promise = require("bluebird");


function Parser(data) {
    var offset = 0;

    function readBits(bits, signed) {
        var value = 0;
        var startByte = offset >> 3;
        var endByte = ((offset + bits - 1) >> 3) + 1;
        var relateds = data.slice(startByte, endByte);

        var mask = 0;
        var shiftRight = (8 - ((offset + bits ) % 8)) % 8;
        mask |= (Math.pow(2, bits) - 1) << shiftRight;

        for (var i = 0; i < relateds.length; i++) {
            value = (value << 8) | relateds[i];
        }
        offset += bits;

        value = (value & mask) >> shiftRight;

        if (signed) {
            // If we're not working with a full 32 bits, check the
            // imaginary MSB for this bit count and convert to a
            // valid 32-bit signed value if set.
            if (bits !== 32 && value & (1 << (bits - 1))) {
                value |= -1 ^ ((1 << bits) - 1);
            }

            return value;
        }

        return value;
    }

    var result = {
        readBits: readBits
    };

    function setUpParser(i) {
        result['uint' + i] = function () {
            return readBits(i, false);
        };
        result['bit' + i] = function () {
            return readBits(i, false);
        };
        result['int' + i] = function () {
            return readBits(i, true);
        };
    }

    for (var i = 1; i <= 32; i++) {
        setUpParser(i);
    }

    return result;
}

var PACKET = {
    '2004': {
        headers: [{
            name: 'msg_number',
            desc: 'Message Number (e.g.,“1001”= 0011 1110 1001)',
            type: 'uint12'
        }, {
            name: 'ref_station_id',
            desc: 'Reference Station ID',
            type: 'uint12'
        }, {
            name: 'tow',
            desc: 'BD2 Epoch Time (TOW)',
            type: 'uint30'
        }, {
            name: 'sync_flag',
            desc: 'Synchronous GNSS Flag',
            type: 'bit1'
        }, {
            name: 'num_bd2_processed',
            desc: 'No. of BD2 Satellite Signals Processed',
            type: 'uint5'
        }, {
            name: 'smoothing_indicator',
            desc: 'BD2 Divergence-free Smoothing Indicator',
            type: 'bit1'
        }, {
            name: 'smoothing_interval',
            desc: 'GPS Smoothing Interval',
            type: 'bit3'
        }],
        content: [{
            name: 'smoothing_interval',
            desc: 'GPS Smoothing Interval',
            type: 'bit3'
        }, {
            name: 'smoothing_interval',
            desc: 'GPS Smoothing Interval',
            type: 'bit3'
        }]
    },
    '2104': {
        headers: [{
            name: 'msg_number',
            desc: 'Message Number (e.g.,“1001”= 0011 1110 1001)',
            type: 'uint12'
        }, {
            name: 'ref_station_id',
            desc: 'Reference Station ID',
            type: 'uint12'
        }, {
            name: 'tow',
            desc: 'BD2 Epoch Time (TOW)',
            type: 'uint30'
        }, {
            name: 'sync_flag',
            desc: 'Synchronous GNSS Flag',
            type: 'bit1'
        }, {
            name: 'num_bd2_processed',
            desc: 'No. of BD2 Satellite Signals Processed',
            type: 'uint5'
        }, {
            name: 'smoothing_indicator',
            desc: 'BD2 Divergence-free Smoothing Indicator',
            type: 'bit1'
        }, {
            name: 'smoothing_interval',
            desc: 'GPS Smoothing Interval',
            type: 'bit3'
        }, {
            name: 'bd2_indicator',
            desc: 'BD2 B1/B2/B3  Indicator',
            type: 'bit3'
        }],
        content: [{
            name: 'gps_id',
            desc: 'GPS Satellite ID',
            type: 'uint6'
        }, {
            name: 'gps_l1_indicator',
            desc: 'GPS L1 Code Indicator',
            type: 'bit1'
        }, {
            name: 'gps_l1_pseud',
            desc: 'GPS L1 Pseudorange',
            type: 'uint24'
        }, {
            name: 'gps_l1_phaserange',
            desc: 'GPS L1 PhaseRange – L1 Pseudorange',
            type: 'int20'
        }, {
            name: 'gps_l1_lock_indicator',
            desc: 'GPS L1 Lock time Indicator',
            type: 'uint7'
        }, {
            name: 'gps_l1_ambiguity',
            desc: 'GPS Integer L1 Pseudorange Modulus Ambiguity',
            type: 'uint8'
        }, {
            name: 'gps_l1_cnr',
            desc: 'GPS L1 CNR',
            type: 'uint8'
        }, {
            name: 'gps_l2_indicator',
            desc: 'GPS L2 Code Indicator',
            type: 'bit2'
        }, {
            name: 'gps_l2l1_pseud_diff',
            desc: 'GPS L2-L1 Pseudorange Difference',
            type: 'int14'
        }, {
            name: 'gps_l2_phaserange_l1_pseud',
            desc: 'GPS L2 PhaseRange – L1 Pseudorange',
            type: 'int20'
        }, {
            name: 'gps_l2_lock_indicator',
            desc: 'GPS L2 Lock time Indicator',
            type: 'uint7'
        }, {
            name: 'gps_l2_cnr',
            desc: 'GPS L2 CNR',
            type: 'uint8'
        }, {
            name: 'gps_doppler_l1',
            desc: 'GPS Doppler (L1)',
            type: 'int32'
        }]
    }
}

function readPkg(data) {
    var parser = new Parser(data);
    var result = {};
    result.header = parser.readBits(8);
    result.zero = parser.readBits(6);
    result.length = parser.readBits(10);
    result.msg_number = parser.readBits(12);

    var protocol = PACKET[result.msg_number];
    if (!protocol) {
        console.log('skip,' + result.msg_number);
        return undefined;
    }
    for (var i = 1; i < protocol.headers.length; i++) {
        var field = protocol.headers[i];
        if (parser[field.type]) {
            result[field.name] = parser[field.type]();
        } else {
            throw new Error('no parser for ' + field.type);
        }
    }
    for (var i = 1; i < protocol.content.length; i++) {
        var field = protocol.content[i];
        if (parser[field.type]) {
            result[field.name] = parser[field.type]();
        } else {
            throw new Error('no parser for ' + field.type);
        }
    }
    return result;
}

var PkgParser = {
    parse: function (raw) {
        var result = readPkg(raw);
        return result;
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
    if (true) {
        res.send('algo response');
    } else {
        res.status(500).send('bad data');
    }
});

var fs = require('fs');

/* GET users listing. */
router.post('/station/:station_id', function (req, res, next) {
    var raw = req.body,
        station_id = req.params.station_id;

    // TODO add timestamp?
    Logger.logRaw(raw, station_id);

    fs.readFile("/Users/fengxiaoping/Downloads/rover.txt", function (err, data) {
        if (err) throw err;

        for (var i = 0; i < data.length; i++) {
            if ((data.readUInt8(i) == 211 )) {
                if ((data.readUInt8(i + 1) & 252) === 0) {
                    var len = data[i + 2] | data[i + 1] << 8;
                    // if (len > 0 && (i == 128)) {
                    if (len > 0) {
                        console.log(i + ',' + len);
                        // var pkg = Buffer.from(data, i, len + 3);
                        // 3 bytes for header, 3 bytes for tail
                        // var pkg = Buffer.from(data, i, len + 3 + 3);
                        // console.log(pkg.length);
                        const buf2 = Buffer.alloc(len + 3 + 3);
                        data.copy(buf2, 0, i, i + len + 3 + 3);
                        readPkg(buf2)
                        i += len;
                        var result = PkgParser.parse(buf2);
                        console.log(result);
                        // break;
                        doAlgo(result, function (err, data) {
                            if (err) {
                                res.status(500).send("");
                            } else {
                                res.send('ok');
                            }
                        });
                    }
                }
            }
        }
    })
});

module.exports = router;

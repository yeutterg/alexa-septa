/**
    Copyright 2016 Greg Yeutter. 

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';

var http = require('http');

var baseUrl = 'www3.septa.org';
var basePath = '/hackathon/';
var resultQty = 9;  // The number of results to request in a query

// Test function
// getBusTrolleySchedule(34, 39.951728, -75.212593, 1, function(s) {
//     console.log(s);
// })

/**
 * Gets closest stop ID based on route number and lat/long
 * 
 * @param routeNumber The route number or letter (must be all caps)
 * @param lat The latitude
 * @param lng The longitude
 * @callback stopId The callback stop ID, or null if there is an error
 */
function getClosestStopId(routeNumber, lat, lng, stopId) {
    // Generate request URL
    var reqUrl = basePath + '/Stops/' + routeNumber;

    // Get all stops for the route
    httpGet(baseUrl, reqUrl, function(resp) {
        if (resp) {
            // Parse the response
            var stopObj = JSON.parse(resp);
            var stopObjLen = stopObj.length;

            // Iterate through all the stops, recording the distance to each
            var distances = new Array(stopObjLen);
            for (var i = 0; i < stopObjLen; i++) {   
                var stop = stopObj[i];

                // Record the distance between the user lat/lng and the stop lat/lng
                distances[i] = Math.abs(lat - stop.lat) + Math.abs(lng - stop.lng);
            }

            // Get the stop with the minimum distance and return its stop ID
            var minStopIndex = distances.indexOf(Math.min.apply(Math, distances));
            stopId(stopObj[minStopIndex].stopid);

        } else stopId(null);
    });
}

/**
 * Gets the schedule for the closest stop on a given route
 * 
 * @param routeNumber The route number or letter (must be all caps)
 * @param lat The latitude
 * @param lng The longitude
 * @param dir The direction, 'i' for inbound, 'o' for outbound
 * @callback schedule The schedule object containing 'times' and 'stopName'
 */
function getBusTrolleySchedule(routeNumber, lat, lng, dir, schedule) {
    // Get the stop ID
    getClosestStopId(routeNumber, lat, lng, function(stopId) {
        // Generate request URL
        var reqUrl = basePath + '/BusSchedules/?req1=' + stopId + '&req2=' + routeNumber +
            '&req3=' + dir + '&req6=' + resultQty;

        // Get the schedule for the stop and route
        httpGet(baseUrl, reqUrl, function(apiResult) {
            // Parse into new JSON output
            var schedObj = JSON.parse(apiResult);
            var routeArr = schedObj[routeNumber];

            // Get the stop name
            var stopName = routeArr[0].StopName;
            
            // Iterate through all the times, recording each in an array
            var times = new Array(resultQty);
            for (var i = 0; i < resultQty; i++) {   
                times[i] = routeArr[i].date;
            }

            // Convert times to JSON 24h format 
            var times24h = new Array(resultQty);
            for (var i = 0; i < resultQty; i++) {
                time24H(times[i], function(time24) {
                    times24h[i] = time24;
                });
            }

            // Generate and output schedule
            var obj = {};
            obj['stopName'] = stopName;
            obj['times'] = times24h;
            schedule(obj);
        });
    })
}

/**
 * Makes an HTTP GET request
 * 
 * @param requestHost The request host, e.g. 'example.com'
 * @param requestPath The request path, e.g. '/api'
 * @callback callback The JSON response callback, null if error
 */
function httpGet(requestHost, requestPath, callback) {
    return http.get({
        host: requestHost,
        path: requestPath
    }, function(response) {
        var body = '';
        response.on('data', function(data) {
            body += data;
        });
        response.on('end', function() {
            callback(body);
        });
        response.on('error', function() {
            callback(null);
        })
    });
}

/**
 * Parses an AM/PM time string into JSON with 24h format
 * 
 * @param amPmTime The AM/PM time, e.g. '9:31p'
 * @callback callback The output time, e.g. {'hh': 21, 'mm': 31}
 */
function time24H(amPmTime, callback) {
    var hh, mm;
    if (amPmTime.length == 5) {
        hh = parseInt(amPmTime.substring(0,1));
        mm = parseInt(amPmTime.substring(2,4));
    } else if (amPmTime.length == 6) {
        hh = parseInt(amPmTime.substring(0,2));
        mm = parseInt(amPmTime.substring(3,5)); 
    }

    if (amPmTime.includes('p')) hh += 12; // if PM, add 12

    var obj = {};
    obj['hh'] = hh;
    obj['mm'] = mm;
    callback(obj);
}
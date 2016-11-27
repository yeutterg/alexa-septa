/**
    Copyright 2016 Greg Yeutter. 

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';

var request = require('request');

var baseUrl = 'http://www3.septa.org/hackathon/';
var userLat = 39.951728;
var userLng = -75.212593;

getClosestStopId(34, userLat, userLng, function(resp) {
    console.log(resp);
});

/**
 * Gets closest stop ID based on route number and lat/long
 * 
 * @param routeNumber The route number or letter (must be all caps)
 * @param lat The latitude
 * @param lng The longitude
 * @param stopId The callback stop ID, or null if there is an error
 */
function getClosestStopId(routeNumber, lat, lng, stopId) {
    // Generate request URL
    var reqUrl = baseUrl + '/Stops/' + routeNumber;

    // Get all stops for the route
    httpGet(reqUrl, function(resp) {
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
 * Makes an HTTP GET request
 * 
 * @param requestUrl The request URL
 * @param callback The JSON response callback, null if error
 */
function httpGet(requestUrl, callback) {
    request(requestUrl, function(error, response, body) {
        if (!error && response.statusCode == 200) callback(body);
        else callback(null);
    });
}
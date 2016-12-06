/**
    Copyright 2016 Greg Yeutter. Code is modified from example code provided by Amazon.com, Inc.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * TODO update description
 * This sample shows how to create a Lambda function for handling Alexa Skill requests that:
 *
 * - Web service: Communicate with an the Amazon associates API to get best seller information using aws-lib
 * - Dialog and Session State: Handles two models, both a one-shot ask and tell model, and a multi-turn dialog model.
 *   If the user provides an incorrect slot in a one-shot model, it will direct to the dialog model
 * - Pagination: Handles paginating a list of responses to avoid overwhelming the customer.
 * - SSML: Using SSML tags to control how Alexa renders the text-to-speech.
 *
 * Examples:
 * One-shot model
 *  User:  "Alexa, ask Savvy Consumer for top books"
 *  Alexa: "Getting the best sellers for books. The top seller for books is .... Would you like
 *          to hear more?"
 *  User:  "No"
 *
 * Dialog model:
 *  User:  "Alexa, open Savvy Consumer"
 *  Alexa: "Welcome to the Savvy Consumer. For which category do you want to hear the best sellers?"
 *  User:  "books"
 *  Alexa: "Getting the best sellers for books. The top seller for books is .... Would you like
 *          to hear more?"
 *  User:  "yes"
 *  Alexa: "Second ... Third... Fourth... Would you like to hear more?"
 *  User : "no"
 */

'use strict';
/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]"

/**
 * The key to find the current index from the session attributes
 */
var KEY_CURRENT_INDEX = "current";

/**
 * The key to find the current category from the session attributes
 */
var KEY_CURRENT_CATEGORY = "category";

/**
 * The Max number of items for Alexa to read from a request.
 */
var MAX_ITEMS = 10;

/**
 * The number of items read for each pagination request, until we reach the MAX_ITEMS
 */
var PAGINATION_SIZE = 3;

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * The SEPTA API
 */
var septa = require('./Septa');

/**
 * SeptaSchedules is a child of AlexaSkill.
 */
var SeptaSchedules = function() {
    AlexaSkill.call(this, APP_ID);
};

// Test lat/lng coordinates
var userLat = 39.951728;
var userLng = -75.212593;

// Extend AlexaSkill
SeptaSchedules.prototype = Object.create(AlexaSkill.prototype);
SeptaSchedules.prototype.constructor = SeptaSchedules;

SeptaSchedules.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("SeptaSchedules onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

SeptaSchedules.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("SeptaSchedules onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

SeptaSchedules.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("SeptaSchedules onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

SeptaSchedules.prototype.intentHandlers = {
    "Departures": function (intent, session, response) {
        getDepartures(intent, session, response);
    },

    // "HearMore": function (intent, session, response) {
    //     getNextPageOfItems(intent, session, response);
    // },

    "DontHearMore": function (intent, session, response) {
        response.tell("");
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        helpTheUser(intent, session, response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

/**
 * Returns the welcome response for when a user invokes this skill.
 */
function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var speechText = "Welcome to the Septa Schedules. Which route would you like to look up?";
    var repromptText = "<speak>Please speak a route number.</speak>";

    var speechOutput = {
        speech: speechText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.SSML
    };
    response.ask(speechOutput, repromptOutput);
}

/**
 * Gets the next departures from the SEPTA API and responds to the user.
 */
function getDepartures(intent, session, response) {
    var speechText = "",
        repromptText = "",
        speechOutput,
        repromptOutput;

    // Check if we are in a session, and if so then reprompt for yes or no
    // if (session.attributes[KEY_CURRENT_INDEX]) {
    //     speechText = "Would you like to hear more?";
    //     repromptText = "Would you like to hear times? Please say yes or no.";
    //     speechOutput = {
    //         speech: speechText,
    //         type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //     };
    //     repromptOutput = {
    //         speech: repromptText,
    //         type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //     };
    //     response.ask(speechOutput, repromptOutput);
    //     return;
    // }

    var routeNumberSlot = intent.slots.RouteNumber.value;

    // Get the next set of departures for the location
    septa.getBusTrolleySchedule(routeNumberSlot, userLat, userLng, 'i', function(schedule) {
        console.log(schedule);

        var stopName = schedule.stopName;

        speechText += 'Route ' + routeNumberSlot + ' departs from ' + stopName + ' at ' + 
             + schedule.times[0].hh + ':' + schedule.times[0].mm + ", "
             + schedule.times[1].hh + ':' + schedule.times[1].mm + ", and "
             + schedule.times[2].hh + ':' + schedule.times[2].mm;

        speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
        return;
    });

    // // Find the lookup word for the given category.
    // var lookupCategory = getLookupWord(categorySlot);

    // if (lookupCategory) {
    //     // Remove the periods to fix things like d. v. d.s to dvds
    //     var category = categorySlot.value.replace(/\.\s*/g, '');

    //     // Create the the client to access the top sellers API
    //     var amazonCatalogClient = aws.createProdAdvClient(AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_ASSOCIATES_TAG);

    //     // Make the call with the proper category and browse node.
    //     amazonCatalogClient.call("ItemSearch", {
    //         SearchIndex: lookupCategory,
    //         BrowseNode: BROWSE_NODE_MAP[lookupCategory]
    //     }, function (err, result) {
    //         if (err) {
    //             // There was an error trying to fetch the top sellers from Amazon.
    //             console.log('An error occured', err);
    //             speechText = "I'm sorry, I cannot get the top sellers for " + category + " at this" +
    //                 " time. Please try again later. Goodbye.";
    //             speechOutput = {
    //                 speech: speechText,
    //                 type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //             };
    //             response.tell(speechOutput);
    //             return;
    //         }

    //         // Configure the card and speech output.
    //         var cardTitle = "Top Sellers for " + category;
    //         var cardOutput = "The Top Sellers for " + category + " are: ";
    //         speechText = "Here are the top sellers for " + category + ". ";
    //         session.attributes[KEY_CURRENT_CATEGORY] = category;

    //         // Iterate through the response and set the intial response, as well as the
    //         // session attributes for pagination.
    //         var i = 0;
    //         for (var item in result.Items.Item) {
    //             var numberInList = i + 1;
    //             if (numberInList == 1) {
    //                 // Set the speech output and the current index for the first n items.
    //                 speechText += "The top seller is: " +
    //                     result.Items.Item[item].ItemAttributes.Title + ". ";
    //                 session.attributes[KEY_CURRENT_INDEX] = numberInList;
    //             }

    //             // Set the session attributes and full card output
    //             session.attributes[i] = result.Items.Item[item].ItemAttributes.Title;
    //             cardOutput = cardOutput + numberInList + ". " + result.Items.Item[item].ItemAttributes.Title + ".";
    //             i++;
    //         }

    //         if (i == 0) {
    //             // There were no items returned for the specified item.
    //             speechText = "I'm sorry, I cannot get the top sellers for " + category
    //                 + " at this time. Please try again later. Goodbye.";
    //             speechOutput = {
    //                 speech: speechText,
    //                 type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //             };
    //             response.tell(speechOutput);
    //             return;
    //         }

    //         speechText += " Would you like to hear the rest?";
    //         repromptText = "Would you like to hear the rest? Please say yes or no.";
    //         speechOutput = {
    //             speech: speechText,
    //             type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //         };
    //         repromptOutput = {
    //             speech: repromptText,
    //             type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //         };
    //         response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
    //         return;
    //     })
    // } else {

    //     // The category didn't match one of our predefined categories. Reprompt the user.
    //     speechText = "I'm not sure what the category is, please try again";
    //     repromptText = "<speak>I'm not sure what the category is, you can say, " +
    //         "books <break time=\"0.2s\" /> " +
    //         "fashion <break time=\"0.2s\" /> " +
    //         "movie <break time=\"0.2s\" /> " +
    //         "kitchen.</speak>";
    //     speechOutput = {
    //         speech: speechText,
    //         type: AlexaSkill.speechOutputType.PLAIN_TEXT
    //     };
    //     repromptOutput = {
    //         speech: repromptText,
    //         type: AlexaSkill.speechOutputType.SSML
    //     };
    //     response.ask(speechOutput, repromptOutput);
    // }
}

/**
 * Gets the next page of items based on information saved in the session.
 */
// function getNextPageOfItems(intent, session, response) {
//     var sessionAttributes = session.attributes,
//         current = sessionAttributes[KEY_CURRENT_INDEX],
//         speechText = "",
//         speechOutput,
//         repromptOutput;

//     if (current) {
//         // Iterate through the session attributes to create the next n results for the user.
//         for (var i = 0; i < PAGINATION_SIZE; i++) {
//             if (sessionAttributes[current]) {
//                 var numberInList = current + 1;
//                 if (current < MAX_ITEMS - 1) {
//                     speechText += "<say-as interpret-as=\"ordinal\">" + numberInList + "</say-as>. "
//                         + sessionAttributes[current] + ". ";
//                 } else {
//                     speechText += "And the <say-as interpret-as=\"ordinal\">" + numberInList + "</say-as> top seller is. "
//                         + sessionAttributes[current] + ". Those were the 10 top sellers in Amazon's "
//                         + sessionAttributes[KEY_CURRENT_CATEGORY] + " department";
//                 }
//                 current = current + 1;
//             }
//         }

//         // Set the new index and end the session if the newIndex is greater than the MAX_ITEMS
//         sessionAttributes[KEY_CURRENT_INDEX] = current;

//         if (current < MAX_ITEMS) {
//             speechText += " Would you like to hear more?";

//             speechOutput = {
//                 speech: '<speak>' + speechText + '</speak>',
//                 type: AlexaSkill.speechOutputType.SSML
//             };
//             repromptOutput = {
//                 speech: speechText,
//                 type: AlexaSkill.speechOutputType.PLAIN_TEXT
//             };
//             response.ask(speechOutput, repromptOutput);
//         } else {
//             speechOutput = {
//                 speech: '<speak>' + speechText + '</speak>',
//                 type: AlexaSkill.speechOutputType.SSML
//             };
//             response.tell(speechOutput);
//         }
//     } else {
//         // The user attempted to get more results without ever uttering the category.
//         // Reprompt the user for the proper usage.
//         speechText = "Welcome to the Savvy Consumer. For which category do you want to hear the best sellers?.";
//         var repromptText = "<speak> Please choose a category by saying, " +
//             "books <break time=\"0.2s\" />" +
//             "fashion <break time=\"0.2s\" /> " +
//             "movie <break time=\"0.2s\" /> " +
//             "kitchen </speak>";
//         speechOutput = {
//             speech: speechText,
//             type: AlexaSkill.speechOutputType.PLAIN_TEXT
//         };
//         repromptOutput = {
//             speech: repromptText,
//             type: AlexaSkill.speechOutputType.SSML
//         };
//         response.ask(speechOutput, repromptOutput);
//     }
// }

/**
 * Gets the lookup word based on the input category slot. The lookup word will be from the BROWSE_NODE_MAP and will
 * attempt to get an exact match. However, if no exact match exists then the function will check for a contains.
 * @param categorySlot the input category slot
 * @returns {string} the lookup word for the BROWSE_NODE_MAP
 */
// function getLookupWord(categorySlot) {
//     var lookupCategory;
//     if (categorySlot && categorySlot.value) {
//         // Lower case the incoming slot and remove spaces
//         var category = categorySlot.value.toLowerCase().replace(/ /g, '').replace(/\./g, '').replace(/three/g, '3');
//         var keys = Object.keys(BROWSE_NODE_MAP);

//         //Check for spoken names
//         lookupCategory = SPOKEN_NAME_TO_CATEGORY[category];

//         if (!lookupCategory) {
//             // Iterate through the keys in the BROWSE_NODE_MAP and look for a perfect match. The items in the
//             // BROWSE_NODE_MAP must be cased properly for the API call to get the top sellers.
//             keys.forEach(function (item) {
//                 if (item.toLowerCase() === category) {
//                     lookupCategory = item;
//                     return;
//                 }
//             });
//         }

//         if (!lookupCategory) {
//             // There was no perfect match, try to see if we can perform an indexOf.
//             // This will help if the user says DVDs and the actual category is DVD.
//             keys.forEach(function (item) {
//                 if (item.toLowerCase().indexOf(category) > -1 || category.indexOf(item.toLowerCase()) > -1) {
//                     lookupCategory = item;
//                     return;
//                 }
//             })
//         }
//     }
//     return lookupCategory;
// }

/**
 * Instructs the user on how to interact with this skill.
 */
function helpTheUser(intent, session, response) {
    var speechText = "You can ask for Septa schedules based on the route. For example, when does the next 34 arrive?";
    var repromptText = "<speak> I'm sorry I didn't understand that. You can say things like, when is the next 34 departure?";

    var speechOutput = {
        speech: speechText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.SSML
    };
    response.ask(speechOutput, repromptOutput);
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var skill = new SeptaSchedules();
    skill.execute(event, context);
};

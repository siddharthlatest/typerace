
var Appbase = require('appbase-js');

var userID = getUserID();
var raceStartsAt;
var race_id;
var race_obj;
var onRaceStatusUpdate;
var onScoreUpdate;
var participants = {};
var race_article_url = "https://medium.com/@CoyleAndrew/design-better-forms-96fadca0f49c";

var ref = new Appbase({
    url: 'https://scalr.api.appbase.io',
    appname: 'typerace',
    username: 'LPg0IVqja',
    password: 'b43f5ab2-c0c4-4ad5-80a1-b6d9fee9ee47'
});


exports.startRace = function (statusUpdatehandler, scoreUpdateHandler) {
    onRaceStatusUpdate = statusUpdatehandler;
    onScoreUpdate = scoreUpdateHandler;

    checkWaitingRaceExists();
}

function onWaitingRaceAvailable(res) {
    console.log("@ onWaitingRaceAvailable ");
    if (res.hits.total) {
        console.log("@ onWaitingRaceAvailable: " + res.hits.total + " race is available.");
        race_obj = res.hits.hits[0]._source;
        race_id = res.hits.hits[0]._id;
        console.log("@ onWaitingRaceAvailable: " + "ID of the race is " + race_id);
        updateRaceStatusToStarted(race_id, race_obj);
    }
    else {
        onWaitingRaceNotAvailable();
    }
};

function onWaitingRaceNotAvailable(res) {
    var contentFetcher = require('./contentfetcher.js');
    contentFetcher.createContent(onContentReadyCallback)
};

function onContentReadyCallback(content) {
    createNewRace(content);
}

function checkWaitingRaceExists() {
    console.log("@ checkWaitingRaceExists called");
    var obj = ref.search({
        type: "race",
        body: {
            query: {
                term: {
                    "race_state": "waiting"
                }
            }
        }
    });

    obj.on("data", onWaitingRaceAvailable)
    obj.on("error", function (err) {
        console.log("@ checkWaitingRaceExists: " + "Error while checking Waiting race"
            + " existence, error message: " + err)
    });
};

function createNewRace(content) {
    console.log(content);
    var jsonBody = {
        race_state: "waiting",
        participants: [
            userID
        ],
        content: content,
    }

    var obj = ref.index({
        type: "race",
        body: jsonBody
    });

    obj.on("data", function (res) {
        race_id = res._id;
        console.log("@ createNewRace: " + "New race creation is successful, race ID is " + race_id);
        console.log("@ createNewRace: " + "To retrive race object for race ID " + race_id
            + " getRaceObj is called.");
        getRaceObj(race_id, listenForUpdate)
    });

    obj.on("error", function (res) {
        console.log("@ createNewRace: " + "Error happend while creating new Race, error message: " + err);
    });
};

function getRaceObj(race_id, callback) {
    var obj = ref.get({
        "type": "race",
        "id": race_id
    });
    obj.on("data", function (res) {
        race_obj = res._source;
        callback(race_id, race_obj);
    });
    obj.on("error", function (err) {
        console.log("@ getRaceObj: Retriving race object for race ID "
            + race_id + " is unsuccessful, error messeage: " + err);
    });
};

function updateRaceStatusToStarted(race_id, raceObj) {
    console.log("@ updateRaceStatusToStarted: " + " To listen for later updates listenForUpdate is called.");
    listenForUpdate(race_id, raceObj);
    // Add this user as new race participants.
    raceObj.participants.push(userID);
    console.log("@ updateRaceStatusToStarted: " + " user IDs of the participants " + raceObj.participants);
    /**
     * Race will start in next 10 seconds;
     */

    let raceStartsAt = Date.now() + (7 * 1000);
    var updateObj = {
        race_state: "started",
        participants: raceObj.participants,
        race_starts_At: raceStartsAt
    };

    var obj = ref.update({
        type: "race",
        id: race_id,
        body: {
            doc: updateObj
        }
    });
    obj.on("data", function (res) {
        console.log("@  updateRaceStatusToStarted: " + JSON.stringify(res));
        console.log("@ " + Date.now() + " updateRaceStatusToStarted: " + " Data updating succesful.");
        //mapParticipants(updateObj.participants)
        //onRaceStatusUpdate(updateObj);
    });
    obj.on("error", function (err) {
        console.log("@ updateRaceStatusToStarted: " + "Error at updating, error message: " + err);
    });
};

function getUserID() {
    return ("pid_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};

function compareObject(previous, present) {
    var diff = {};
    for (var property in present) {
        if (!previous.hasOwnProperty(property) || present[property] !== previous[property]) {
            diff[property] = present[property];
        }
    }
    return diff;
};

function listenForUpdate(race_id, race_obj) {
    console.log("@ listenForUpdate : Listening for the race ID " + race_id);
    var previous_obj = race_obj;
    var stream_obj = ref.getStream({
        type: "race",
        id: race_id,
    });
    stream_obj.on("data", function (res) {
        let present_obj = res._source;
        console.log("@ " + Date.now() + "  listenForUpdate success");
        let diff = compareObject(previous_obj, present_obj);
        console.log("@ " + Date.now() + "  listenForUpdate success : changed properties: ");
        console.log(diff);
        for (let property in diff) {
            if (property.startsWith("race_state")) {
                mapParticipants(present_obj.participants)
                onRaceStatusUpdate(present_obj);
            }
            else if (property.startsWith("PID")) {
                onScoreUpdate(createScoreObj(diff));
            }
        }
        previous_obj = present_obj;
    });
    stream_obj.on("error", function (err) {
        console.log("@ listenForUpdate: " + "Error at listening for updates, error message: " + err);
    });
};

function createScoreObj(obj) {
    let scoreObj = {};
    for (let prop in obj) {
        if (prop.startsWith("PID") && prop.localeCompare(userID)) {
            console.log(participants[prop]);
            scoreObj[participants[prop]] = obj[prop];
        }
    }
    return scoreObj;
}

function mapParticipants(pidArray) {
    let counter = 1;
    for (let i = 0; i < pidArray.length; i++) {
        let pid = pidArray[i];
        console.log(pid);
        if (!pid.localeCompare(userID)) {
            participants[pid] = 'self';
        }
        else {
            participants[pid] = 'oponent' + counter;
            console.log("participants " + participants[pid]);
            counter++;
        }
    }
}

exports.updateWPM = function (wpm, currentCharCount, time) {

    var updatedRaceObj = {
        type: "race",
        id: race_id,
        body: {
            doc: {

            }
        }
    }
    updatedRaceObj.body.doc[userID] = {
        wpm: wpm,
        currentCharCount: currentCharCount,
        last_updated_at: time
    }
    var obj = ref.update(updatedRaceObj);
    obj.on('data', function (res) {
        console.log(userID + " updated wpm is " + wpm + " at " + (new Date(time)).getTime());
    });
    obj.on('error', function (err) {
        console.log("@ updateWPM: " + "Error at updateWPM, error message: " + err);
    });
}

/**
 * To get a random number in between 0-9 to be used as index of the story.
 */
function getRandomIndex(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
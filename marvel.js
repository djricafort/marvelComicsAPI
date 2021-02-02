var crypto = require('crypto');
const request = require('request');
const express = require("express");
const axios = require("axios");
const redis = require("redis");
const app = express();

const redisPort = 6379
const client = redis.createClient(redisPort);

// var marvelAPI = "null";

client.on("error", (err) => {
    console.log(err);
})

function getCharacters(res, marvelCharacters, publicKey, privateKey, modifiedSince = null, type) {

    var timestamp = new Date().getTime();
    var hashString = timestamp + privateKey + publicKey;
    var hash = crypto.createHash('md5').update(hashString).digest('hex');
    var offset = 0;
    var characterArrayResult = [];
    var tempCtr = 0;
    var resultCount = 1;
    var characterIdArray = []
    var lastRequestDate = "";
    var dateToday = new Date().toISOString().slice(0, 10);

    try {
        // client.flushall();
        client.get(marvelCharacters, async (err, marvelAPI) => {
            if (err) throw err;
            try {
                while (resultCount > 0) {
                	console.log("offset ", offset);
                    // get characters from marvel api
                    if (type == 0){
                    	// cache is empty. get all characters and store into cache
                    	var characters = await axios.get(`http://gateway.marvel.com/v1/public/characters?offset=${offset}&limit=100&ts=${timestamp}&apikey=${publicKey}&hash=${hash}`);
                    }else if (type == 1){
                    	// cache is not empty. get characters sinfr modifiedDate and add it to the character list in our cache
                    	var characters = await axios.get(`http://gateway.marvel.com/v1/public/characters?offset=${offset}&limit=100&ts=${timestamp}&modifiedSince=${modifiedSince}&apikey=${publicKey}&hash=${hash}`);
                    }
                    // get number of results from the api
                    resultCount = characters['data']['data']['count'];
                    // get results object from response
                    results = characters['data']['data']['results'];
                    for (i = 0; i < results.length; i++) {
                        characterArrayResult.push(results[i]);
                    }
                    // add 100 to offset for the next iteration
                    offset += 100;
                    // tempCtr++;

                }
            } catch (err) {
                console.log(err);
            }

            // saves the characters to cache
            client.setex(marvelCharacters, 600, JSON.stringify(characterArrayResult));
            client.setex(lastRequestDate, 600, JSON.stringify(dateToday));

            // gets the character ID and saves it to an array
            for (i = 0; i < characterArrayResult.length; i++) {
                characterIdArray.push(characterArrayResult[i]['id']);
            }

            if (type == 0) {
            	// if there are no existing characters in cache
                sendCharacterResponse(res, characterIdArray)
            } else if (type == 1) {
                // characterIdArray contains characters from cache. add new characterIDs to the characterIdArray
                getCachedCharacters(res, marvelCharacters, 1, characterIdArray)
            }

        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

function getCharacterById(res, characterID, publicKey, privateKey,) {

    var timestamp = new Date().getTime();
    var dateToday = new Date().toISOString().slice(0, 10);
    var hashString = timestamp + privateKey + publicKey;
    var hash = crypto.createHash('md5').update(hashString).digest('hex');

    try {
        client.get(characterID, async (err, marvelAPI) => {
            if (err) throw err;

            // get characters from marvel api
            var characters = await axios.get(`http://gateway.marvel.com/v1/public/characters/${characterID}?&ts=${timestamp}&apikey=${publicKey}&hash=${hash}`);

            // get results object from response
            results = characters['data']['data']['results'];

            // saves the characters to cache
            client.setex(characterID, 600, JSON.stringify(results));
            res.status(200).send({
                id: results[0]['id'],
                name: results[0]['name'],
                desciption: results[0]['description']
            });



        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }

}

function sendCharacterResponse(res, characterIdArray) {
    res.status(200).send({
        id: characterIdArray
    });
}

function getCachedCharacters(res, marvelCharacters, type, newCharacterIdArray = []) {
    var characterIdArray = [];
    client.get(marvelCharacters, (err, marvelAPI) => {
        if (err) throw err;

        if (marvelAPI) {
            var jsonObject = JSON.parse(marvelAPI);
            for (i = 0; i < jsonObject.length; i++) {
                // stores the IDs of the marvel characters to an array
                characterIdArray.push(jsonObject[i]['id']);
            }
            if (type == 0) {
            	// if there is no existing character in the cache
                sendCharacterResponse(res, characterIdArray);
            } else if (type == 1) {
                // add newCharacterIdArray contents to characterIdArray from the cache
                characterIdArray = characterIdArray.concat(newCharacterIdArray);
                sendCharacterResponse(res, characterIdArray);

            }
        }

    });

}


app.get("/characters", (req, res) => {
    var apikey = 'e4b1d535b69bb1100ea6fc050b42f169';
    const marvelCharacters = " ";

    var dateToday = new Date().toISOString().slice(0, 10);
    var lastRequestDate = "";

    var characterIdArray = [];
    var publicKey = req.headers.publickey;
    var privateKey = req.headers.privatekey;

    try {
        client.get(lastRequestDate, async (err, requestDate) => {
            if (err) throw err;

            if (requestDate) {
                // there is a request that was previously made
                if (dateToday = requestDate) {
                    // if last reqestDate is same as today, get cached version
                    getCachedCharacters(res, marvelCharacters, 0);

                } else {
                    // if last requestDate was from older date, 
                    getCharacters(res, marvelCharacters, publicKey, privateKey, requestDate, 1);
                }
            } else {
                // no prior request to the api
                getCharacters(res, marvelCharacters, publicKey, privateKey, requestDate, 0);
            }

        });

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});


app.get("/characters/:characterID", (req, res) => {
    var publicKey = req.headers.publickey;
    var privateKey = req.headers.privatekey;
    try {
        const characterID = req.params.characterID;

        // Check the redis store for the data first
        client.get(characterID, async (err, characterDetails) => {
            if (characterDetails) {
                return res.status(200).send({
                    id: results[0]['id'],
                    name: results[0]['name'],
                    desciption: results[0]['description']
                })
            } else { // When the data is not found in the cache then we can make request to the server

                getCharacterById(res, characterID, publicKey, privateKey,);
            }
        })
    } catch (error) {
        console.log(error)
    }
});


app.listen(process.env.PORT || 8080, () => {
    console.log("Node server started");
    client.flushall();
});
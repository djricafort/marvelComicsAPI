# marvelComicsAPI

This is an implementation of the Marvel Comics API which allows a user to get all Character IDs and get the details of the character given its ID. The Marvel developer API key and documentation is found on this [link.](https://developer.marvel.com)

## How to use:
1. Install [Node.js](https://nodejs.org). You can refer to this [link](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for the instructions.
2. Go to the local directory of this repo on your machine and install the dependencies in the local node_modules folder using the command `npm install`.
3. Start up your [Redis](https://redis.io/) server with the command `redis-server`.
4. Run the app with the command `node marvel.js`. Your local server should now be running and is accessible on `http://localhost:8080/`.
5. Use [Postman](https://www.postman.com/) or something similar to test the endpoints.
  * There are 2 available endpoints. `/characters` and `/characters/{characterId}`.
    * `/character` returns all character ids as a JSON array of numbers.
    * `/character/{characterId}` returns the id, name, and description of the character.
  * The Marvel API only returns a max of 100 records per request.
  * A caching solution was implemented using Redis.
  * The caching solution for the `/character` endpoint checks if the request is sent for the first time. If yes, it will send a get request until all of the characters are saved in the cache. The date when the last request was sent will also be stored in the cache.
  * For the succeeding times that the `/character` enpoint is called, the date when the enpoint is called will be compared against the date when it was last called which is stored in the cache. If the current date is equal to the date of the last request, the character ids that is stored in the cache will be sent back as the response. The pseudocode below is a representation of how this is implemented in the code.
```bash
    if(dateToday == dateOfLastRequest){
      getCharacterIdsFromCache();
    }
```

  * If the current date is greater than the date of the last request, the date of the last request will be passed to the api as a parameter. It will be passed as a date for the `modifiedSince` parameter. Character ids from this request will be concatenated to the existing character ids from our cache. The pseudocode below is a representation of how this is implemented in the code.
```bash
    if(dateToday > ateOfLastRequest){
      characterIdArrayFromCache.concat(newCharacterIdArray);
    }
```
6. The public and private keys from your Marvel Comic API will be used as header inputs in postman to run the requests.
```bash
{
   privatekey: <marvel api private key>,
   publickey: <marvel api public key>
}
```
A copy of the documentation of the API endpoints used in this project is also published in [SwaggerHub](https://app.swaggerhub.com/apis/djricafort/marvel-comics_api/1.0.0)

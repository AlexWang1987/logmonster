# logMonster

Post your app logs(JSON format) to server with a nice limited buffer.

## options (default)

```javascript
  // database name
  storeName: 'dataStore',
  // server log endpoint
  endPoint: 'http://localhost:8080/log.html',
  postMethod: 'POST',
  postTimeout: 15 * 1000,
  // buffer limit
  discardMax: 100 * 1000,
  postEncode: 'application/json', // default, others like: application/x-www-form-urlencoded
  // pack max-number of entries at a time
  entriesMax: 10,
  concurrentMax: 5,
  // sleep a little bit
  concurrentInterval: 3000,
```


## usage

```javascript
import LogMonster from 'logmonster';

// specify your own log endpoint.
const logMonster = new LogMonster({
  storeName: 'dataStore',
  endPoint: 'http://192.168.2.10/es/log' // you need to set this most likely.
})

// and enjoy pushing your JSON log object anywhere.
logMonster.push({
  mod: 'login',
  contenxt: 'xxxx',
  url: 'xxxx'
})

// logMonster.stop();

// logMonster.start();
```

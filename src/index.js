// //////////////////////////////////////////////////////////////////////////////
//
//  Copyright (C) 2016-present  All Rights Reserved.
//  Licensed under the Apache License, Version 2.0 (the "License");
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Github Home: https://github.com/AlexWang1987
//  Author: AlexWang
//  Date: 2017-03-17 11:13:14
//  QQ Email: 1669499355@qq.com
//  Last Modified time: 2017-10-12 10:36:13
//  Description: wbp-init-umd-main
//
// //////////////////////////////////////////////////////////////////////////////
if (WBP_DEV && module.hot) { module.hot.accept(); }

import localforage from 'localforage';
import Promise from 'bluebird';
import cuid from 'cuid';

let defaultOptions = {
  _localForge: localforage.createInstance({
    name: 'LogMonster',
    driver: [localforage.INDEXEDDB],
    storeName: 'dataStore'
  }),
  endPoint: 'http://localhost:8080/log.html',
  postMethod: 'POST',
  postTimeout: 15 * 1000,
  discardMax: 100 * 1000,
  entriesMax: 10,
  concurrentMax: 5,
  concurrentInterval: 3000,
}

function config(options) {
  defaultOptions = Object.assign(defaultOptions, options);
}

async function push(item) {
  const _localForge = defaultOptions._localForge;
  const discardMax = defaultOptions.discardMax;

  if (_localForge) {
    const localLength = await _localForge.length();
    // warning: discard all
    if (discardMax <= localLength) {
      await _localForge.clear();
      // const removeKey = await _localForge.key(0);
      // if (removeKey) {
      //   await _localForge.removeItem(removeKey);
      // }
    }
    return await _localForge.setItem(cuid(), item);
  }
  console.warn('internal localforage is broken.');
}

export {
  push as
  default,
  config
}

async function concurrenInterval() {
  return new Promise((resolve) => {
    setTimeout(resolve, defaultOptions.concurrentInterval);
  })
};

(async function logMonster() {
  if (!defaultOptions.endPoint) return console.error('endPoint is missing.');
  await concurrenInterval();
  await distributeEntires();
  await logMonster();
})();

if (WBP_DEV) {
  window._push = push;
  window._config = config;
  setInterval(() => {
    _push(Math.random() * 300000000)
  }, 500)
}

async function distributeEntires() {
  const entriesMax = defaultOptions.entriesMax;
  const concurrentMax = defaultOptions.concurrentMax;
  const _localForge = defaultOptions._localForge;
  const batchPackages = [];

  for (let i = 0; i < concurrentMax; i++) {
    const batchIndex = i * entriesMax;
    const batchKeyAvailable = await _localForge.key(batchIndex);

    if (!batchKeyAvailable) break;

    const entryPackage = [];

    for (let j = 0; j < entriesMax; j++) {
      const entryIndex = batchIndex + j;
      const entryKeyAvailable = await _localForge.key(entryIndex);

      if (!entryKeyAvailable) break;

      const entryKeyValue = await _localForge.getItem(entryKeyAvailable);
      if (entryKeyValue) {
        entryPackage.push({
          key: entryKeyAvailable,
          value: entryKeyValue
        })
      }
    }

    if (entryPackage.length) {
      batchPackages.push(entryPackage);
    }
  }

  if (batchPackages.length) {
    const endPoint = defaultOptions.endPoint;
    const postMethod = defaultOptions.postMethod;
    const postTimeout = defaultOptions.postTimeout;
    return Promise.map(batchPackages, (batchPackage) => Promise.try(() => {
      const batchValues = batchPackage.map((entry) => entry.value);
      let batchCached = false;
      return new Promise((rsv) => {
          try {
            fetch(endPoint, {
                method: postMethod,
                headers: {
                  'Content-type': 'application/json'
                },
                body: JSON.stringify(batchValues)
              })
              .then((postRes) => {
                if (!batchCached) {
                  if (postRes.ok) {
                    return rsv(Promise.map(batchPackage, ({ key }) => _localForge.removeItem(key)))
                  }
                  console.error('BATCH PACKAGE SERVER ERROR ->', `[${postMethod}] [${postRes.status}] [${postRes.statusText}] ${postRes.url}`);
                }
                rsv();
              })
              .catch((networkError) => {
                console.error('BATCH PACKAGE NETWORK ERROR ->', networkError);
                rsv();
              })
          } catch (err) {
            console.error('FETCH POST INTERVAL ERROR ->', err);
            rsv();
          }
        })
        .timeout(postTimeout)
        .catch((err) => {
          batchCached = true;
          console.error('BATCH PACKAGE TIMEOUT ->', err);
        })
    }))
  }
  // console.log('batchPackages is zero.');
}
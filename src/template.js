const log = require('logToConsole');
const createArgumentsQueue = require('createArgumentsQueue');
const injectScript = require('injectScript');
const queryPermission = require('queryPermission');
const setInWindow = require('setInWindow');
const copyFromWindow = require('copyFromWindow');
const makeInteger = require('makeInteger');
const getType = require('getType');
const Math = require('Math');
const Object = require('Object');

const TEMPLATE_VERSION = '1.4.1';
const INSIGHTS_OBJECT_NAME = 'AlgoliaAnalyticsObject';
const INSIGHTS_LIBRARY_URL =
  'https://cdn.jsdelivr.net/npm/search-insights@2.7.0';

const MAX_OBJECT_IDS = 20;
const MAX_FILTERS = 10;

const aa = createArgumentsQueue('aa', 'aa.queue');

function isInitialized() {
  return !!copyFromWindow(INSIGHTS_OBJECT_NAME);
}

function formatValueToList(value) {
  const type = getType(value);
  if (type === 'array') {
    return value;
  } else if (type === 'number') {
    return [value];
  } else if (type === 'string') {
    return value.split(',');
  } else {
    return null;
  }
}

function getLibraryURL(useIIFE) {
  return (
    INSIGHTS_LIBRARY_URL +
    (useIIFE === true ? '/dist/search-insights.iife.min.js' : '')
  );
}

function logger(message, event) {
  log('[GTM-DEBUG] Search Insights > ' + message, event || '');
}

function shallowObjectClone(obj) {
  const keys = Object.keys(obj);
  const newObj = {};
  keys.forEach((key) => {
    newObj[key] = obj[key];
  });
  return newObj;
}

function chunkPayload(payload, keys, limit) {
  // check if the values in `payload` for each of `keys` have the same length.
  const sameNumberOfValues = keys
    .map((k) => payload[k].length)
    .every((n) => n === payload[keys[0]].length);
  if (!sameNumberOfValues) {
    // chunking behaviour is unsafe due to unequal length arrays to chunk.
    // bail out early.
    return [payload];
  }

  const numberOfChunks = Math.ceil(payload[keys[0]].length / limit);
  const chunks = [];
  for (let i = 0; i < numberOfChunks; i++) {
    const newPayload = shallowObjectClone(payload);
    keys.forEach((key) => {
      newPayload[key] = payload[key].slice(i * limit, (i + 1) * limit);
    });

    chunks.push(newPayload);
  }
  return chunks;
}

switch (data.method) {
  case 'init': {
    if (isInitialized()) {
      logger('The "init" event has already been called.');
      data.gtmOnFailure();
      break;
    }

    const url = getLibraryURL(data.useIIFE);

    if (queryPermission('inject_script', url)) {
      injectScript(
        url,
        () => {
          if (!copyFromWindow('aa')) {
            data.gtmOnFailure();
            logger('[ERROR] Failed to load search-insights.');
            return;
          }

          let libraryLoaded = false;
          // call any method to see if it reacts.
          // `getUserToken` is syncronous, so it updates the flag immediately.
          aa('getUserToken', null, () => {
            libraryLoaded = true;
          });
          if (libraryLoaded) {
            data.gtmOnSuccess();
          } else {
            log(
              '[ERROR] Failed to load search-insights.\n\n' +
                'If your website is using RequireJS, you need to turn on "Use IIFE" option of Initialization method.'
            );
            data.gtmOnFailure();
          }
        },
        data.gtmOnFailure,
        url
      );
    } else {
      logger(
        'The library endpoint is not allowed in the "Injects Scripts" permissions.\n\n' +
          'You need to add the value: "' +
          'https://cdn.jsdelivr.net/npm/search-insights*' +
          '"\n\n' +
          'See https://www.simoahava.com/analytics/custom-templates-guide-for-google-tag-manager/#step-4-modify-permissions'
      );
      data.gtmOnFailure();
      break;
    }

    log(
      '[INFO] Algolia GTM template no longer validates event payloads.\nYou can visit https://algolia.com/events/debugger instead.'
    );

    const initOptions = {
      appId: data.appId,
      apiKey: data.apiKey,
      userHasOptedOut: data.userHasOptedOut,
      region: data.region,
      cookieDuration: data.cookieDuration,
      useCookie: data.useCookie === false ? false : true, // true by default
    };

    logger(data.method, initOptions);
    aa(data.method, initOptions);

    const userAgent = 'insights-gtm (' + TEMPLATE_VERSION + ')';
    logger('addAlgoliaAgent', userAgent);
    aa('addAlgoliaAgent', userAgent);

    if (data.initialUserToken) {
      logger('setUserToken', data.initialUserToken);
      aa('setUserToken', data.initialUserToken);
    }

    setInWindow(INSIGHTS_OBJECT_NAME, 'aa');

    break;
  }

  case 'viewedObjectIDs': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'view',
      eventName: data.eventName,
      index: data.index,
      objectIDs: formatValueToList(data.objectIDs),
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['objectIDs'], MAX_OBJECT_IDS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'clickedObjectIDsAfterSearch': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'click',
      eventName: data.eventName,
      index: data.index,
      objectIDs: formatValueToList(data.objectIDs),
      positions: formatValueToList(data.positions).map(makeInteger),
      queryID: data.queryID,
      userToken: data.userToken,
    };
    const chunks = chunkPayload(
      payload,
      ['objectIDs', 'positions'],
      MAX_OBJECT_IDS
    );

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'clickedObjectIDs': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'click',
      eventName: data.eventName,
      index: data.index,
      queryID: data.queryID,
      objectIDs: formatValueToList(data.objectIDs),
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['objectIDs'], MAX_OBJECT_IDS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'clickedFilters': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'click',
      eventName: data.eventName,
      filters: formatValueToList(data.filters),
      index: data.index,
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['filters'], MAX_FILTERS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'convertedObjectIDsAfterSearch': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'conversion',
      eventName: data.eventName,
      index: data.index,
      objectIDs: formatValueToList(data.objectIDs),
      queryID: data.queryID,
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['objectIDs'], MAX_OBJECT_IDS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'convertedObjectIDs': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'conversion',
      eventName: data.eventName,
      index: data.index,
      objectIDs: formatValueToList(data.objectIDs),
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['objectIDs'], MAX_OBJECT_IDS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'convertedFilters': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'conversion',
      eventName: data.eventName,
      filters: formatValueToList(data.filters),
      index: data.index,
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['filters'], MAX_FILTERS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  case 'viewedFilters': {
    if (!isInitialized()) {
      logger('You need to call the "init" event first.');
      data.gtmOnFailure();
      break;
    }

    const payload = {
      eventType: 'view',
      eventName: data.eventName,
      filters: formatValueToList(data.filters),
      index: data.index,
      userToken: data.userToken,
    };
    const chunks = chunkPayload(payload, ['filters'], MAX_FILTERS);

    logger('sendEvents', chunks);
    aa('sendEvents', chunks);
    data.gtmOnSuccess();
    break;
  }

  default: {
    logger('You need to set the method for this event.');
    data.gtmOnFailure();
  }
}

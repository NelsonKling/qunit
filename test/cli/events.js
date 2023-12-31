/**
 * This test file verifies the execution order and contents of events emitted
 * by QUnit after the test run finishes. They are expected to adhere to the
 * js-reporters standard.
 */
const invokedHooks = [];
const invokedHookDetails = {};
const requireQUnit = require('../../src/cli/require-qunit');
const myQUnit = requireQUnit();

function callback (name) {
  invokedHookDetails[name] = [];

  return function (details) {
    invokedHooks.push(name);
    invokedHookDetails[name].push(details);
  };
}

myQUnit.on('runStart', callback('runStart'));
myQUnit.on('suiteStart', callback('suiteStart'));
myQUnit.on('testStart', callback('testStart'));
myQUnit.on('assertion', callback('assertion1'));
myQUnit.on('assertion', callback('assertion2'));
myQUnit.on('testEnd', callback('testEnd'));
myQUnit.on('suiteEnd', callback('suiteEnd'));
myQUnit.on('runEnd', callback('runEnd'));

myQUnit.module('Events', function () {
  myQUnit.module('Nested', function () {
    myQUnit.todo('test1', function (assert) {
      assert.true(false, 'failing assertion');
    });
  });

  myQUnit.test('test2', function (assert) {
    assert.true(true, 'passing assertion');
  });

  myQUnit.skip('test3');
});

const myQunitRun = new Promise(resolve => {
  myQUnit.on('runEnd', resolve);
});
myQUnit.start();

var test1Start = {
  name: 'test1',
  fullName: ['Events', 'Nested', 'test1'],
  suiteName: 'Nested'
};

var test2Start = {
  name: 'test2',
  fullName: ['Events', 'test2'],
  suiteName: 'Events'
};

var test3Start = {
  name: 'test3',
  fullName: ['Events', 'test3'],
  suiteName: 'Events'
};

var suite2Start = {
  name: 'Nested',
  fullName: ['Events', 'Nested'],
  childSuites: [],
  testCounts: {
    total: 1
  },
  tests: [
    test1Start
  ]
};

var suite1Start = {
  name: 'Events',
  fullName: ['Events'],
  childSuites: [
    suite2Start
  ],
  testCounts: {
    total: 3
  },
  tests: [
    test2Start,
    test3Start
  ]
};

var assertion1 = {
  passed: false,
  message: 'failing assertion',
  todo: true
};

var assertion2 = {
  passed: true,
  message: 'passing assertion',
  todo: false
};

var test1End = {
  name: 'test1',
  fullName: ['Events', 'Nested', 'test1'],
  suiteName: 'Nested',
  status: 'todo',
  errors: [
    assertion1
  ],
  assertions: [
    assertion1
  ]
};

var test2End = {
  name: 'test2',
  fullName: ['Events', 'test2'],
  suiteName: 'Events',
  status: 'passed',
  errors: [],
  assertions: [
    assertion2
  ]
};

var test3End = {
  name: 'test3',
  fullName: ['Events', 'test3'],
  suiteName: 'Events',
  status: 'skipped',
  errors: [],
  assertions: []
};

var suite2End = {
  name: 'Nested',
  fullName: ['Events', 'Nested'],
  status: 'todo',
  childSuites: [],
  testCounts: {
    skipped: 0,
    passed: 0,
    failed: 0,
    todo: 1,
    total: 1
  },
  tests: [
    test1End
  ]
};

var suite1End = {
  name: 'Events',
  fullName: ['Events'],
  status: 'passed',
  childSuites: [
    suite2End
  ],
  testCounts: {
    skipped: 1,
    passed: 1,
    failed: 0,
    todo: 1,
    total: 3
  },
  tests: [
    test2End,
    test3End
  ]
};

function removeUnstableProperties (obj) {
  if (typeof obj !== 'object') {
    return obj;
  }

  delete obj.runtime;
  delete obj.stack;

  Object.keys(obj).forEach(function (key) {
    if (Array.isArray(obj[key])) {
      obj[key].forEach(removeUnstableProperties);
    } else if (typeof obj[key] === 'object') {
      removeUnstableProperties(obj[key]);
    }
  });

  return obj;
}

// After all the tests run, we verify the events were fired in the correct order
// with the correct data
QUnit.module('Events', function () {
  QUnit.test('verify callback order and data at end of test', async assert => {
    await myQunitRun;

    assert.deepEqual(invokedHooks, [
      'runStart',
      'suiteStart',
      'suiteStart',
      'testStart',
      'assertion1',
      'assertion2',
      'testEnd',
      'suiteEnd',
      'testStart',
      'assertion1',
      'assertion2',
      'testEnd',
      'testStart',
      'testEnd',
      'suiteEnd',
      'runEnd'
    ], 'event callbacks are called in correct order');

    assert.deepEqual(
      invokedHookDetails.suiteStart[0],
      suite1Start,
      'start of suite with tests and child suites data is correct'
    );
    assert.deepEqual(
      invokedHookDetails.suiteStart[1],
      suite2Start,
      'start of child suite with tests data is correct'
    );

    assert.deepEqual(
      invokedHookDetails.testStart[0],
      test1Start,
      'regular testStart data is correct'
    );
    assert.deepEqual(
      invokedHookDetails.testStart[1],
      test2Start,
      'skipped testStart data is correct'
    );
    assert.deepEqual(
      invokedHookDetails.testStart[2],
      test3Start,
      'todo testStart data is correct'
    );

    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.assertion1[0]),
      assertion1,
      'failing assertion data is correct'
    );
    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.assertion1[1]),
      assertion2,
      'passing assertion data is correct'
    );

    // These are pushed in reverse order of the starts
    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.testEnd[0]),
      test1End,
      'todo testEnd data is correct'
    );
    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.testEnd[1]),
      test2End,
      'regular testEnd data is correct'
    );
    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.testEnd[2]),
      test3End,
      'skipped testEnd data is correct'
    );

    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.suiteEnd[0]),
      suite2End,
      'end of child suite with tests data is correct'
    );
    assert.deepEqual(
      removeUnstableProperties(invokedHookDetails.suiteEnd[1]),
      suite1End,
      'end of suite with tests and child suites data is correct'
    );
  });
});

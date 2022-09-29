/*! m0-start */

'use strict';

const config = {
    testTimeout: 20000
};
/*! m0-end */

process.env.DCS_JWT_SECRET = '123';
process.env.DCS_LOG_LEVEL = 'silent';
process.env.NOTIFY_API_KEY = '123apiKey';
process.env.WEBHOOK_DEV_REPORTER_SLACK = 'webhook-url';
process.env.APP_ENV = 'test';
process.env.MESSAGE_BUS_CREDENTIALS = 'some-credentials';

config.coverageThreshold = {
    './!(db)/!(questionnaire-dal).js': {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60
    },
    './db/*.js': {
        branches: 50,
        functions: 0,
        lines: 35,
        statements: 35
    }
};

/*! m0-start */
module.exports = config;
/*! m0-end */

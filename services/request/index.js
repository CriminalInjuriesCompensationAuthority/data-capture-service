'use strict';

const got = require('got');
const merge = require('lodash.merge');

function createRequestService() {
    function post(options) {
        let opts = {
            method: 'POST',
            headers: {
                accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            },
            json: true,
            body: options.body
        };
        opts = merge(opts, options);
        return got(options.url, opts);
    }

    function get(options) {
        let opts = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json'
            },
            json: true
        };
        opts = merge(opts, options);
        return got(opts.url, opts);
    }

    function patch(options) {
        let opts = {
            method: 'PATCH',
            headers: {
                accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            },
            json: true,
            body: options.body
        };
        opts = merge(opts, options);
        return got(options.url, opts);
    }

    function deleteRequest(options) {
        let opts = {
            method: 'DELETE',
            headers: {
                accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            },
            json: true,
            body: {}
        };
        opts = merge(opts, options);
        return got(options.url, opts);
    }

    return Object.freeze({
        post,
        get,
        patch,
        deleteRequest
    });
}

module.exports = createRequestService;

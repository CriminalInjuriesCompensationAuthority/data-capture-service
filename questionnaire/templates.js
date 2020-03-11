'use strict';

const template = require('q-templates-application');

module.exports = {
    'sexual-assault': id => {
        template.id = id;
        return template;
    }
};

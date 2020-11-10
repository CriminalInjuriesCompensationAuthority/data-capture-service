'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

// const swaggerDocument = require('../openapi/openapi.json');

const router = express.Router();

const uiOptions = {
    explorer: true,
    swaggerOptions: {
        urls: [
            {url: '/openapi.json', name: 'consumer'},
            {url: '/openapi-admin.json', name: 'admin'}
        ]
    }
};

router.use('/', swaggerUi.serve);
router.get(
    '/',
    swaggerUi.setup(
        null, // JSON object with the API schema.
        uiOptions, // swagger-ui-express options.
        null, // custom Swagger options.
        null, // string with a custom CSS to embed into the page.
        null, // link to a custom favicon.
        null, //  URL of the Swagger API schema, can be specified instead of the swaggerDoc.
        'Data Capture Service API' // custom title for a page.
    )
);

module.exports = router;

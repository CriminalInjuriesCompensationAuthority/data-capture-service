'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
const $RefParser = require('json-schema-ref-parser');
const fs = require('fs');

async function dereference(contractPath) {
    const dereferencedContract = await $RefParser.dereference(contractPath);

    fs.writeFile(contractPath, JSON.stringify(dereferencedContract, null, 4), err => {
        // throws an error, you could also catch it here
        if (err) {
            throw err;
        }

        // success case, the file was saved
        // eslint-disable-next-line
        console.log(`dereferenced contract saved - "${contractPath}"`);
    });
}

(async () => {
    await dereference('openapi/openapi.json');
    await dereference('openapi/openapi-admin.json');
})();

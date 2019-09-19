'use strict';

const pointer = require('json-pointer');

const rxJsonPointerToken = /\|\|(.+?)\|\|/gi;

function replaceJsonPointer(content, data) {
    const modifiedContent = content.replace(rxJsonPointerToken, (token, jsonPointer) => {
        const value = pointer.get(data, jsonPointer);

        // Only deal with primitive values. JSON only allows arrays, objects, and null, as non-primitive values
        if (value && typeof value === 'object') {
            throw Error(
                `Only primitive values are supported. JSON pointer ( ${jsonPointer} ) references a non primitive value ( ${JSON.stringify(
                    value
                )} )`
            );
        }

        const escapedValue = JSON.stringify(value);

        if (escapedValue.startsWith('"')) {
            return escapedValue.slice(1, -1);
        }

        return escapedValue;
    });

    return modifiedContent;
}

module.exports = replaceJsonPointer;

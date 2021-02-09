'use strict';

const pointer = require('json-pointer');
const replacementDictionary = require('./dictionary');
const pronouns = require('./pronouns');

const rxJsonPointerToken = /\|\|PRONOUN\|\|/gi;

function replacePronoun(sectionId, content, data) {
    const modifiedContent = content.replace(rxJsonPointerToken, () => {
        let value;

        if (sectionId in replacementDictionary) {
            const dictionaryEntry = replacementDictionary[sectionId];
            const replacingPointer = dictionaryEntry[0];

            if (pointer.has(data, replacingPointer)) {
                const answerValue = pointer.get(data, replacingPointer);
                value = pointer.get(pronouns, dictionaryEntry[1][answerValue]);
            }
        }

        return value;
    });

    return modifiedContent;
}

module.exports = replacePronoun;

// write tests!
// test that every schema that has `||PRONOUN||` in it is accounted for and defined in the dictionary.json, and pronouns are up to date.
// test all the pronouns somehow
// write a test for failing to replace
// what should happen when a replacement is not found - error thrown? fail silently?

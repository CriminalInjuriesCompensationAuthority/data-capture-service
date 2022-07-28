'use strict';

const qExpression = require('q-expressions');

const {isJsonExpression} = qExpression;

function isPlainObjectOrArray(value) {
    return value && typeof value === 'object' && isJsonExpression(value) === false;
}

function mutateObjectValues(value, valueTransformers, key) {
    if (isPlainObjectOrArray(value)) {
        Object.entries(value).forEach(([k, v]) => {
            value[k] = mutateObjectValues(v, valueTransformers, k);
        });

        return value;
    }

    const mutatedValue = valueTransformers.reduce((acc, transformValue) => {
        return transformValue(key, acc);
    }, value);

    return mutatedValue;
}

module.exports = mutateObjectValues;

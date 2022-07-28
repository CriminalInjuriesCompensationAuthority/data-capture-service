'use strict';

const qExpression = require('q-expressions');

function evaluateJsonExpression(data) {
    return (key, value) => {
        if (qExpression.isJsonExpression(value)) {
            return qExpression.evaluate(value, data);
        }

        return value;
    };
}

module.exports = evaluateJsonExpression;

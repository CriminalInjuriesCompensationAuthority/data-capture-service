'use strict';

function questionnaireResource(spec) {
    const {questionnaire} = spec;
    const {id, type, version, routes} = questionnaire;
    const initial = Array.isArray(routes.states) ? routes.states[0].initial : routes.initial;

    return Object.freeze({
        type: 'questionnaires',
        id: questionnaire.id,
        attributes: {
            id,
            type,
            version,
            routes: {
                initial
            }
        }
    });
}

module.exports = questionnaireResource;

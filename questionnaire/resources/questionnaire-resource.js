'use strict';

function questionnaireResource(spec, supportsTaskList = true) {
    const {questionnaire} = spec;
    const {id, type, version, routes} = questionnaire;
    let initial;

    if (supportsTaskList) {
        initial = routes.states.filter(state => state.id === routes.initial)[0].initial;
    } else {
        initial = routes.states.initial;
    }

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

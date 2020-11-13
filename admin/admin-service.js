'use strict';

const createQuestionnaireService = require('../questionnaire/questionnaire-service');

const defaults = {};
defaults.createAdminDAL = require('./admin-dal');

function createAdminService({logger, createAdminDAL = defaults.createAdminDAL} = {}) {
    const db = createAdminDAL({logger});

    async function submitQuestionnaire(questionnaireId) {
        const questionnaireService = createQuestionnaireService({logger});
        return questionnaireService.createSubmission(questionnaireId);
    }

    async function getFailedQuestionnaireIds() {
        const results = await db.getQuestionnaireIdsBySubmissionStatus('FAILED');
        return results;
    }

    async function resubmitFailedQuestionnaires() {
        const failedIds = await getFailedQuestionnaireIds();
        let resourceCollection = [];
        if (!failedIds.length) {
            return resourceCollection;
        }

        const promises = await failedIds.map(async failed => {
            const result = await submitQuestionnaire(failed.id);
            return result;
        });

        resourceCollection = await Promise.all(promises);

        return resourceCollection;
    }

    return Object.freeze({
        resubmitFailedQuestionnaires
    });
}

module.exports = createAdminService;

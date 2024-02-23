'use strict';

const VError = require('verror');

const defaults = {};
defaults.createQuestionnaireDAL = require('../questionnaire-dal');

function createMetadataService({
    logger,
    apiVersion,
    ownerId,
    createQuestionnaireDAL = defaults.createQuestionnaireDAL
} = {}) {
    const db = createQuestionnaireDAL({logger, ownerId});

    async function getMetadata() {
        if (!ownerId || apiVersion !== '2023-05-17') {
            throw new VError(
                {
                    name: 'getMetadataNotSuccessful'
                },
                `getMetadata cannot be used with ownerId "${ownerId}" and apiVersion "${apiVersion}"`
            );
        }
        const results = await db.getMetadataByOwner();
        const metadata = results.map(data => {
            return {
                type: 'metadata',
                id: data.id,
                attributes: {
                    'questionnaire-id': data.id,
                    created: data.created,
                    modified: data.modified,
                    expires: data.expires,
                    'submission-status': data.submission_status,
                    'analytics-id': data.analytics_id
                }
            };
        });

        return {
            data: metadata
        };
    }

    async function getMetadataByQuestionnaire(questionnaireId) {
        if (!ownerId || apiVersion !== '2023-05-17') {
            throw new VError(
                {
                    name: 'getMetadataNotSuccessful'
                },
                `getMetadataByQuestionnaire cannot be used with ownerId "${ownerId}" and apiVersion "${apiVersion}"`
            );
        }
        const results = await db.getQuestionnaireMetadataByOwner(questionnaireId);
        const metadata = results.map(data => {
            return {
                type: 'metadata',
                id: data.id,
                attributes: {
                    'questionnaire-id': data.id,
                    created: data.created,
                    modified: data.modified,
                    'submission-status': data.submission_status,
                    expires: data.expires,
                    'analytics-id': data.analytics_id
                }
            };
        });

        return {
            data: metadata
        };
    }

    return Object.freeze({
        getMetadata,
        getMetadataByQuestionnaire
    });
}

module.exports = createMetadataService;

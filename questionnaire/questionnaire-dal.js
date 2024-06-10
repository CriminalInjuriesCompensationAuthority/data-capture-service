/* eslint-disable no-useless-catch */

'use strict';

const VError = require('verror');
const createDBQuery = require('../db');

function questionnaireDAL(spec) {
    const {logger, ownerId} = spec;
    const db = createDBQuery({logger});

    async function createQuestionnaire(uuidV4, questionnaire) {
        try {
            await db.query(
                "INSERT INTO questionnaire (id, questionnaire, created, modified, expires) VALUES($1, $2, current_timestamp, current_timestamp, current_timestamp + INTERVAL '30 minutes')",
                [uuidV4, questionnaire]
            );
        } catch (err) {
            throw err;
        }
    }

    async function updateQuestionnaire(questionnaireId, questionnaire) {
        let result;

        try {
            result = await db.query(
                'UPDATE questionnaire SET questionnaire = $1, modified = current_timestamp WHERE id = $2',
                [questionnaire, questionnaireId]
                // Currently replacing the whole questionnaire object. The following commented query/params could be used to update only the answers object:
                // 'UPDATE questionnaire SET questionnaire = jsonb_set(questionnaire, $1, $2, TRUE), modified = current_timestamp WHERE id = $3',
                // [`{answers,${sectionId}}`, answers, questionnaireId]
            );
            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" was not updated successfully`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    async function getQuestionnaire(questionnaireId) {
        let questionnaire;

        try {
            questionnaire = await db.query(
                'SELECT questionnaire FROM questionnaire WHERE id = $1',
                [questionnaireId]
            );

            if (questionnaire.rowCount === 0) {
                // No instance was found
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" not found`
                );
            }
        } catch (err) {
            throw err;
        }

        return questionnaire.rows[0].questionnaire;
    }

    async function getQuestionnaireSubmissionStatus(questionnaireId) {
        let result;
        try {
            result = await db.query('SELECT submission_status FROM questionnaire WHERE id = $1', [
                questionnaireId
            ]);

            if (result.rowCount === 0) {
                // No instance was found
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" not found`
                );
            }
        } catch (err) {
            throw err;
        }

        return result.rows[0].submission_status;
    }

    async function updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus) {
        let result;

        try {
            result = await db.query(
                'UPDATE questionnaire SET submission_status = $1, modified = current_timestamp WHERE id = $2',
                [submissionStatus, questionnaireId]
            );

            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" submission status not successfully updated to "${submissionStatus}"`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    async function getQuestionnaireIdsBySubmissionStatus(submissionStatus) {
        let result;

        try {
            result = await db.query('SELECT id FROM questionnaire WHERE submission_status = $1', [
                submissionStatus
            ]);
        } catch (err) {
            throw err;
        }

        return result.rowCount ? result.rows.map(x => x.id) : [];
    }

    async function getQuestionnaireModifiedDate(questionnaireId) {
        let result;
        try {
            result = await db.query('SELECT modified FROM questionnaire WHERE id = $1', [
                questionnaireId
            ]);

            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" not found`
                );
            }
        } catch (err) {
            throw err;
        }

        return result.rows[0].modified;
    }

    async function updateQuestionnaireModifiedDate(questionnaireId) {
        let result;

        try {
            result = await db.query(
                'UPDATE questionnaire SET modified = current_timestamp WHERE id = $1',
                [questionnaireId]
            );
            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" modified date was not updated successfully`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    async function updateQuestionnaireModifiedDateByOwner(questionnaireId) {
        let result;
        try {
            result = await db.query(
                "UPDATE questionnaire SET modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2",
                [questionnaireId, ownerId]
            );
            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" modified date was not updated successfully`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    async function updateQuestionnaireByOwner(questionnaireId, questionnaire) {
        let result;

        try {
            result = await db.query(
                "UPDATE questionnaire SET questionnaire = $1, modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $2  AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $3",
                [questionnaire, questionnaireId, ownerId]
                // Currently replacing the whole questionnaire object. The following commented query/params could be used to update only the answers object:
                // 'UPDATE questionnaire SET questionnaire = jsonb_set(questionnaire, $1, $2, TRUE), modified = current_timestamp WHERE id = $3',
                // [`{answers,${sectionId}}`, answers, questionnaireId]
            );
            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" was not updated successfully`
                );
            }
        } catch (err) {
            throw err;
        }
        return result;
    }

    async function getQuestionnaireByOwner(questionnaireId) {
        let questionnaire;

        try {
            questionnaire = await db.query(
                "SELECT questionnaire FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2",
                [questionnaireId, ownerId]
            );

            if (questionnaire.rowCount === 0) {
                // No instance was found
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" not found`
                );
            }
        } catch (err) {
            throw err;
        }
        return questionnaire.rows[0].questionnaire;
    }

    async function getReferenceNumber(isFatal, questionnaireId) {
        let referenceNumber;

        try {
            referenceNumber = await db.query('SELECT public.get_reference($1) as referencenumber', [
                isFatal
            ]);

            if (referenceNumber.rowCount === 0) {
                // No instance was found
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Reference number for "${questionnaireId}" not created`
                );
            }
        } catch (err) {
            throw err;
        }
        return referenceNumber.rows[0].referencenumber;
    }

    async function getMetadataByOwner() {
        let result;
        try {
            result = await db.query(
                `SELECT id, created, modified, expires, submission_status, questionnaire -> 'answers' -> 'system' ->> 'external-id' AS "external_id" FROM questionnaire WHERE questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $1`,
                [ownerId]
            );
        } catch (err) {
            throw err;
        }

        return result.rowCount ? result.rows : [];
    }

    async function getQuestionnaireMetadataByOwner(questionnaireId) {
        let result;
        try {
            result = await db.query(
                `SELECT id, created, modified, expires, submission_status, questionnaire -> 'answers' -> 'system' ->> 'external-id' AS "external_id" FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2`,
                [questionnaireId, ownerId]
            );
        } catch (err) {
            throw err;
        }

        return result.rowCount ? result.rows : [];
    }

    async function updateExpiryForAuthenticatedOwner(questionnaireId, owner) {
        let result;
        try {
            result = await db.query(
                "UPDATE questionnaire SET expires = date_trunc('day', created) + INTERVAL '31 days' WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2",
                [questionnaireId, owner]
            );

            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" was not updated successfully`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    async function getQuestionnaireSubmissionStatusByOwner(questionnaireId) {
        let result;
        try {
            result = await db.query(
                "SELECT submission_status FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2",
                [questionnaireId, ownerId]
            );

            if (result.rowCount === 0) {
                // No instance was found
                throw new VError(
                    {
                        name: 'ResourceNotFound'
                    },
                    `Questionnaire "${questionnaireId}" not found`
                );
            }
        } catch (err) {
            throw err;
        }

        return result.rows[0].submission_status;
    }

    async function updateQuestionnaireSubmissionStatusByOwner(questionnaireId, submissionStatus) {
        let result;

        try {
            result = await db.query(
                "UPDATE questionnaire SET submission_status = $1, modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $2 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $3",
                [submissionStatus, questionnaireId, ownerId]
            );

            if (result.rowCount === 0) {
                throw new VError(
                    {
                        name: 'UpdateNotSuccessful'
                    },
                    `Questionnaire "${questionnaireId}" submission status not successfully updated to "${submissionStatus}"`
                );
            }
        } catch (err) {
            throw err;
        }

        return result;
    }

    return Object.freeze({
        createQuestionnaire,
        updateQuestionnaire,
        getQuestionnaire,
        getQuestionnaireSubmissionStatus,
        updateQuestionnaireSubmissionStatus,
        getQuestionnaireIdsBySubmissionStatus,
        getQuestionnaireModifiedDate,
        updateQuestionnaireModifiedDate,
        updateQuestionnaireByOwner,
        getQuestionnaireByOwner,
        getReferenceNumber,
        getMetadataByOwner,
        getQuestionnaireMetadataByOwner,
        updateExpiryForAuthenticatedOwner,
        updateQuestionnaireModifiedDateByOwner,
        getQuestionnaireSubmissionStatusByOwner,
        updateQuestionnaireSubmissionStatusByOwner
    });
}

module.exports = questionnaireDAL;

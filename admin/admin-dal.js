/* eslint-disable no-useless-catch */

'use strict';

const createDBQuery = require('../db');

function createAdminDAL(spec) {
    const {logger} = spec;
    const db = createDBQuery({logger});

    async function getQuestionnaireIdsBySubmissionStatus(submissionStatus) {
        let result;
        try {
            result = await db.query('SELECT id FROM questionnaire WHERE submission_status = $1', [
                submissionStatus
            ]);

            if (result.rowCount === 0) {
                return [];
            }
        } catch (err) {
            throw err;
        }

        return result.rows;
    }

    return Object.freeze({
        getQuestionnaireIdsBySubmissionStatus
    });
}

module.exports = createAdminDAL;

'use strict';

const VError = require('verror');
const {
    getIsFatal,
    getIsSplit,
    updateCaseReferenceWithYear,
    setCaseReference,
    generateReferenceNumber
} = require('.');
const questionnaireFixture = require('../test-fixtures/questionnaireCompleteForCheckYourAnswers');
const fatalFixture = require('../test-fixtures/questionnaireCompleteForCheckYourAnswersSplitFatal');
const mockDb = require('../../../../../questionnaire-dal');

jest.mock('../../../../../questionnaire-dal');

const dbMock = {
    getReferenceNumber: jest.fn(() => '123456'),
    getQuestionnaireModifiedDate: jest.fn(() => new Date('July 20, 2023 00:00:00')),
    updateQuestionnaire: jest.fn(() => 'Successfully updated')
};
const loggerMock = {
    info: jest.fn()
};

describe('Generate Case reference', () => {
    it('Should get false for isFatal if not fatal', () => {
        const isFatal = getIsFatal(questionnaireFixture);
        expect(isFatal).toBeFalsy();
    });

    it('Should get true for isFatal if fatal', () => {
        const isFatal = getIsFatal(fatalFixture);
        expect(isFatal).toBeTruthy();
    });

    it('Should get false for isSplit if not fatal', () => {
        const isFatal = getIsSplit(questionnaireFixture);
        expect(isFatal).toBeFalsy();
    });

    it('Should get true for isSplit if fatal and split', () => {
        const isFatal = getIsSplit(fatalFixture);
        expect(isFatal).toBeTruthy();
    });

    it('Should format the case reference correctly', () => {
        const referenceNumber = '123456';
        const dateModified = new Date(2022, 1, 1);

        const caseReference = updateCaseReferenceWithYear(referenceNumber, dateModified);

        expect(caseReference).toBe('22\\123456');
    });

    it('Should skip generation as already exists', async () => {
        const result = await setCaseReference(
            questionnaireFixture,
            loggerMock,
            dbMock,
            'case-reference'
        );
        expect(result.answers.system['case-reference']).toBe('19\\751194');
    });

    it('Should generate correct case reference and add it to asnwers object', async () => {
        // Reset existing CRN
        questionnaireFixture.answers.system['case-reference'] = undefined;

        const result = await setCaseReference(
            questionnaireFixture,
            loggerMock,
            dbMock,
            'case-reference'
        );

        expect(result.answers.system['case-reference']).toBe('23\\123456');
    });

    it('Should generate secondary reference as split fatal/funeral', async () => {
        const result = await setCaseReference(
            fatalFixture,
            loggerMock,
            dbMock,
            'secondary-reference'
        );
        expect(result.answers.system['secondary-reference']).toBe('23\\123456');
    });

    it('Should generate case reference', async () => {
        // Reset existing CRN
        mockDb.mockImplementation(() => ({
            getReferenceNumber: () => '123456',
            updateQuestionnaire: () => 'Successfully updated',
            getQuestionnaireModifiedDate: () => new Date('July 20, 2023 00:00:00')
        }));
        questionnaireFixture.answers.system['case-reference'] = undefined;

        const result = await generateReferenceNumber({
            questionnaire: questionnaireFixture,
            logger: loggerMock
        });

        expect(result).toBe('Successfully updated');
    });

    it('Should throw an error for db communication failure ', async () => {
        jest.resetModules();
        jest.resetAllMocks();
        // throw error
        mockDb.mockImplementation(() => ({
            getReferenceNumber: () => {
                throw new VError('Failed to generate case reference number');
            }
        }));
        questionnaireFixture.answers.system['case-reference'] = undefined;

        await expect(async () => {
            await generateReferenceNumber({
                questionnaire: questionnaireFixture,
                logger: loggerMock
            });
        }).rejects.toThrow();
    });
});

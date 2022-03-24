'use strict';

// TODO: Remove this test file on next major template release

const VError = require('verror');
const templates = require('../templates');
const questionnaireFixtures = require('./test-fixtures');
const createDatasetService = require('./dataset-service');

const templateInstance = templates['sexual-assault']('648f4664-7233-4b66-89f3-ef6e1d2f5fa8');
const sectionDefinitions = {
    applicantDeclaration: templateInstance.sections['p-applicant-declaration'],
    mainApplicantDeclarationUnder12:
        templateInstance.sections['p-mainapplicant-declaration-under-12'],
    mainApplicantDeclaration12OrOver:
        templateInstance.sections['p-mainapplicant-declaration-12-and-over']
};
const applicantDeclarationUUID = '8e1494ef-7c57-459d-81db-2aa110bfcdf5';
const mainApplicantDeclarationUnder12UUID = 'd81c9f59-6175-4f47-938e-db00e30924cf';
const mainApplicantDeclaration12OrOverUUID = 'a6f594a1-b09e-409b-bd5a-f81bbf0a4494';

const datasetService = createDatasetService({
    logger: () => 'Logged from dataset test',
    createQuestionnaireDAL: () => ({
        getQuestionnaire: questionnaireId => {
            if (questionnaireId === applicantDeclarationUUID) {
                const questionnaire = questionnaireFixtures.getSimpleAndCompositeAttributes();
                const sectionId = 'p-applicant-declaration';

                questionnaire.sections[sectionId] = sectionDefinitions.applicantDeclaration;
                questionnaire.progress.push(sectionId);
                questionnaire.answers[sectionId] = {
                    'q-applicant-declaration': 'i-agree'
                };

                return questionnaire;
            }

            if (questionnaireId === mainApplicantDeclarationUnder12UUID) {
                const questionnaire = questionnaireFixtures.getSimpleAndCompositeAttributes();
                const sectionId = 'p-mainapplicant-declaration-under-12';

                questionnaire.sections[sectionId] =
                    sectionDefinitions.mainApplicantDeclarationUnder12;
                questionnaire.progress.push(sectionId);
                questionnaire.answers[sectionId] = {
                    'q-mainapplicant-declaration': 'i-agree-under-12'
                };
                questionnaire.answers['p-mainapplicant-enter-your-name'] = {
                    'q-mainapplicant-title': 'Mrs',
                    'q-mainapplicant-first-name': 'Biz',
                    'q-mainapplicant-last-name': 'Baz'
                };

                return questionnaire;
            }

            if (questionnaireId === mainApplicantDeclaration12OrOverUUID) {
                const questionnaire = questionnaireFixtures.getSimpleAndCompositeAttributes();
                const sectionId = 'p-mainapplicant-declaration-under-12';

                questionnaire.sections[sectionId] =
                    sectionDefinitions.mainApplicantDeclaration12OrOver;
                questionnaire.progress.push(sectionId);
                questionnaire.answers[sectionId] = {
                    'q-mainapplicant-declaration': 'i-agree-12-and-over'
                };
                questionnaire.answers['p-mainapplicant-enter-your-name'] = {
                    'q-mainapplicant-title': 'Dr',
                    'q-mainapplicant-first-name': 'Waldo',
                    'q-mainapplicant-last-name': 'Fred'
                };

                return questionnaire;
            }

            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Questionnaire "${questionnaireId}" not found`
            );
        }
    })
});

describe('Dataset service', () => {
    describe('Dataset resource v1.0.0', () => {
        it('should include an attribute for the applicant declaration', async () => {
            const dataset = await datasetService.getResource(applicantDeclarationUUID, '1.0.0');

            expect(dataset[0]).toEqual({
                type: 'dataset',
                id: '0',
                attributes: {
                    'q-applicant-enter-your-email-address':
                        'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk',
                    'q-applicant-title': 'Mr',
                    'q-applicant-first-name': 'Foo',
                    'q-applicant-last-name': 'Bar',
                    'q-applicant-british-citizen-or-eu-national': true,
                    'q-applicant-declaration': 'i-agree'
                }
            });
        });
    });

    describe('Dataset resource v2.0.0', () => {
        it('should include an attribute for the applicant declaration', async () => {
            const dataset = await datasetService.getResource(applicantDeclarationUUID, '2.0.0');

            expect(dataset[0]).toEqual({
                type: 'dataset',
                id: '0',
                attributes: {
                    values: [
                        {
                            id: 'q-applicant-enter-your-email-address',
                            type: 'simple',
                            label: 'Enter your email address',
                            value: 'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk'
                        },
                        {
                            id: 'q-fullname',
                            type: 'composite',
                            label: 'Enter your name',
                            values: [
                                {
                                    id: 'q-applicant-title',
                                    type: 'simple',
                                    label: 'Title',
                                    value: 'Mr'
                                },
                                {
                                    id: 'q-applicant-first-name',
                                    type: 'simple',
                                    label: 'First name',
                                    value: 'Foo'
                                },
                                {
                                    id: 'q-applicant-last-name',
                                    type: 'simple',
                                    label: 'Last name',
                                    value: 'Bar'
                                }
                            ]
                        },
                        {
                            id: 'q-applicant-british-citizen-or-eu-national',
                            type: 'simple',
                            label: 'Are you a British citizen or EU national?',
                            value: true,
                            valueLabel: 'Yes'
                        },
                        {
                            id: 'q-applicant-declaration',
                            type: 'simple',
                            label:
                                '<div id="declaration"><p class="govuk-body">By submitting this application, I, Mr Foo Bar, confirm that I understand the following:</p><ul class="govuk-list govuk-list--bullet"><li>the information I’ve given here is true</li><li>CICA may share and receive information with the following parties for the purposes of processing this application for compensation or verifying information provided:</li><ul><li>police, prosecutors and ACRO Criminal Records Office, including for the purposes of obtaining a report of the crime and a record of any criminal convictions I may have</li><li>medical organisations, practitioners, and police medical staff to obtain medical evidence - including medical records and expert reports. CICA will let me know if this is required</li><li>any other individuals or organisations where necessary to process this application</li><li>any representative I may appoint to act for me in the course of this application</li></ul><li>if I deliberately provide information that I know is wrong or misleading, I may be refused compensation and may be prosecuted</li><li>I must notify CICA immediately of any change in circumstances relevant to this application, including my address and information about any other claim or proceedings which may give rise to a separate award or payment in respect of my injuries</li></ul><p class="govuk-body">Read our privacy notice to see <a href="https://www.gov.uk/guidance/cica-privacy-notice" class="govuk-link" target="_blank">how we use your data (opens in new tab)</a>.</p><h2 class="govuk-heading-m">Information about appointing a legal or another representative</h2><p class="govuk-body">It is not necessary to appoint a legal or other paid representative to act on an applicant’s behalf. If one is appointed at any stage, please be aware that CICA cannot meet their costs. We will communicate directly with any appointed representative.</p><p class="govuk-body">If we make an award, we will pay it only to an applicant or their legal representative. This is unless the application has been made on behalf of an adult who cannot manage their own financial affairs.</p><p class="govuk-body">If it is decided that a representative’s services are no longer required, you must tell us in writing as soon as possible. If a monetary award is to be made and there is a dispute about outstanding legal fees, it is our policy to retain the disputed amount until the parties involved resolve the dispute.</p></div>',
                            value: 'i-agree',
                            valueLabel:
                                'I have read and understood the <a href="#declaration" class="govuk-link">information and declaration</a>'
                        }
                    ]
                }
            });
        });

        it('should include an attribute for the main applicant declaration under 12', async () => {
            const dataset = await datasetService.getResource(
                mainApplicantDeclarationUnder12UUID,
                '2.0.0'
            );

            expect(dataset[0]).toEqual({
                type: 'dataset',
                id: '0',
                attributes: {
                    values: [
                        {
                            id: 'q-applicant-enter-your-email-address',
                            type: 'simple',
                            label: 'Enter your email address',
                            value: 'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk'
                        },
                        {
                            id: 'q-fullname',
                            type: 'composite',
                            label: 'Enter your name',
                            values: [
                                {
                                    id: 'q-applicant-title',
                                    type: 'simple',
                                    label: 'Title',
                                    value: 'Mr'
                                },
                                {
                                    id: 'q-applicant-first-name',
                                    type: 'simple',
                                    label: 'First name',
                                    value: 'Foo'
                                },
                                {
                                    id: 'q-applicant-last-name',
                                    type: 'simple',
                                    label: 'Last name',
                                    value: 'Bar'
                                }
                            ]
                        },
                        {
                            id: 'q-applicant-british-citizen-or-eu-national',
                            type: 'simple',
                            label: 'Are you a British citizen or EU national?',
                            value: true,
                            valueLabel: 'Yes'
                        },
                        {
                            id: 'q-mainapplicant-declaration',
                            type: 'simple',
                            label:
                                '<div id="declaration"><p class="govuk-body">By submitting this application, I, Mrs Biz Baz on behalf of Mr Foo Bar confirm that I understand the following:</p><ul class="govuk-list govuk-list--bullet"><li>the information I’ve given here is true</li><li>CICA may share and receive information with the following parties for the purposes of processing this application for compensation or verifying information provided:</li><ul><li>police, prosecutors and ACRO Criminal Records Office, including for the purposes of obtaining a report of the crime and a record of any criminal convictions they may have</li><li>medical organisations, practitioners, and police medical staff to obtain medical evidence - including medical records and expert reports. CICA will let me know if this is required</li><li>any other individuals or organisations where necessary to process this application</li><li>any representative I may appoint to act for me in the course of this application</li></ul><li>if I deliberately provide information that I know is wrong or misleading, I may be refused compensation and I may be prosecuted</li><li>I must notify CICA immediately of any change in circumstances relevant to this application, including my address and information about any other claim or proceedings which may give rise to a separate award or payment in respect of their injuries</li></ul><p class="govuk-body">Read our privacy notice to see <a href="https://www.gov.uk/guidance/cica-privacy-notice" class="govuk-link" target="_blank">how we use your data (opens in new tab)</a>.</p><h2 class="govuk-heading-m">Information about appointing a legal or another representative</h2><p class="govuk-body">It is not necessary to appoint a legal or other representative to act on an applicant’s behalf. If one is appointed at any stage, please be aware that CICA cannot meet their costs. We will communicate directly with any appointed representative.</p><p class="govuk-body">If we make an award, we will pay it only to an applicant or their legal representative. This is unless the application has been made on behalf of an adult who cannot manage their own financial affairs or a child who is under 18 years of age. It is our general policy to put an award for a child in an interest earning deposit account until they reach the age of 18.</p><p class="govuk-body">If it is decided that a representative’s services are no longer required, you must tell us in writing as soon as possible. If a monetary award is to be made and there is a dispute about outstanding legal fees, it is our policy to retain the disputed amount until the parties involved resolve the dispute.</p></div>',
                            value: 'i-agree-under-12',
                            valueLabel:
                                'I have read and understood the <a href="#declaration" class="govuk-link">information and declaration</a>'
                        }
                    ]
                }
            });
        });

        it('should include an attribute for the main applicant declaration 12 or over', async () => {
            const dataset = await datasetService.getResource(
                mainApplicantDeclaration12OrOverUUID,
                '2.0.0'
            );

            expect(dataset[0]).toEqual({
                type: 'dataset',
                id: '0',
                attributes: {
                    values: [
                        {
                            id: 'q-applicant-enter-your-email-address',
                            type: 'simple',
                            label: 'Enter your email address',
                            value: 'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk'
                        },
                        {
                            id: 'q-fullname',
                            type: 'composite',
                            label: 'Enter your name',
                            values: [
                                {
                                    id: 'q-applicant-title',
                                    type: 'simple',
                                    label: 'Title',
                                    value: 'Mr'
                                },
                                {
                                    id: 'q-applicant-first-name',
                                    type: 'simple',
                                    label: 'First name',
                                    value: 'Foo'
                                },
                                {
                                    id: 'q-applicant-last-name',
                                    type: 'simple',
                                    label: 'Last name',
                                    value: 'Bar'
                                }
                            ]
                        },
                        {
                            id: 'q-applicant-british-citizen-or-eu-national',
                            type: 'simple',
                            label: 'Are you a British citizen or EU national?',
                            value: true,
                            valueLabel: 'Yes'
                        },
                        {
                            id: 'q-mainapplicant-declaration',
                            type: 'simple',
                            label:
                                '<div id="declaration"><p class="govuk-body">By submitting this application, I, Dr Waldo Fred, confirm that Mr Foo Bar understands the following:</p><ul class="govuk-list govuk-list--bullet"><li>the information I’ve given here is true</li><li>CICA may share and receive information with the following parties for the purposes of processing this application for compensation or verifying information provided:</li><ul><li>police, prosecutors and ACRO Criminal Records Office, including for the purposes of obtaining a report of the crime and a record of any criminal convictions they may have</li><li>medical organisations, practitioners, and police medical staff to obtain medical evidence - including medical records and expert reports. CICA will let me know if this is required</li><li>any other individuals or organisations where necessary to process this application</li><li>any representative I may appoint to act for me in the course of this application</li></ul><li>if we deliberately provide information that we know is wrong or misleading, we may be refused compensation and we may be prosecuted</li><li>we must notify CICA immediately of any change in circumstances relevant to this application, including my address and information about any other claim or proceedings which may give rise to a separate award or payment in respect of their injuries</li></ul><p class="govuk-body">Read our privacy notice to see <a href="https://www.gov.uk/guidance/cica-privacy-notice" class="govuk-link" target="_blank">how we use your data (opens in new tab)</a>.</p><h2 class="govuk-heading-m">Information about appointing a legal or another representative</h2><p class="govuk-body">It is not necessary to appoint a legal or other representative to act on an applicant’s behalf. If one is appointed at any stage, please be aware that CICA cannot meet their costs. We will communicate directly with any appointed representative.</p><p class="govuk-body">If we make an award, we will pay it only to an applicant or their legal representative. This is unless the application has been made on behalf of an adult who cannot manage their own financial affairs or a child who is under 18 years of age. It is our general policy to put an award for a child in an interest earning deposit account until they reach the age of 18.</p><p class="govuk-body">If it is decided that a representative’s services are no longer required, you must tell us in writing as soon as possible. If a monetary award is to be made and there is a dispute about outstanding legal fees, it is our policy to retain the disputed amount until the parties involved resolve the dispute.</p></div>',
                            value: 'i-agree-12-and-over',
                            valueLabel:
                                'I have read and understood the <a href="#declaration" class="govuk-link">information and declaration</a>'
                        }
                    ]
                }
            });
        });
    });
});

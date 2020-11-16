'use strict';

const request = require('supertest');

const tokens = {
    'update:questionnaires':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzVjNzc4ZWQtNTg4NC00N2YwLWFiYzctZTQ1MmZiYWRlYTcyIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMiLCJpYXQiOjE1NjQwNTgyNTF9.Adv1qgj-HiNGxw_0cdYpPO8Fbw12rgJTTqMReJUmFBs'
};

const questionnaireCompleteWithoutCRN = require('./fixtures/questionnaireCompleteWithoutCRN.json');

describe('/api/admin/v1/resubmit-failed-applications', () => {
    describe('post', () => {
        afterEach(() => {
            jest.resetModules();
        });
        describe('200', () => {
            it('should return an array of submission resources', async () => {
                const submissionStatusResponse = jest
                    .fn()
                    .mockReturnValueOnce('FAILED')
                    .mockReturnValueOnce('FAILED')
                    .mockReturnValueOnce('FAILED')
                    .mockReturnValue('IN_PROGRESS');
                // mock the DAL db integration
                jest.doMock('./admin-dal.js', () =>
                    jest.fn(() => ({
                        getQuestionnaireIdsBySubmissionStatus: () => [
                            {id: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235'},
                            {id: '1a0e8f3b-7645-4aef-b267-988c5ff726ce'},
                            {id: '20df96f5-cb92-48b0-a522-a372a7539469'}
                        ]
                    }))
                );
                jest.doMock('../questionnaire/questionnaire-dal.js', () =>
                    jest.fn(() => ({
                        getQuestionnaire: () => {
                            return questionnaireCompleteWithoutCRN;
                        },
                        updateQuestionnaire: () => undefined,
                        getQuestionnaireSubmissionStatus: () => submissionStatusResponse(),
                        updateQuestionnaireSubmissionStatus: () => undefined
                    }))
                );

                // eslint-disable-next-line global-require
                const app = require('../app');

                const res = await request(app)
                    .post('/api/admin/v1/resubmit-failed-applications')
                    .set('Authorization', `Bearer ${tokens['update:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'resubmissions',
                            attributes: {}
                        }
                    });

                expect(res.body).toEqual({
                    data: [
                        {
                            data: {
                                attributes: {
                                    caseReferenceNumber: null,
                                    questionnaireId: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235',
                                    status: 'IN_PROGRESS',
                                    submitted: false
                                },
                                id: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235',
                                type: 'submissions'
                            }
                        },
                        {
                            data: {
                                attributes: {
                                    caseReferenceNumber: null,
                                    questionnaireId: '1a0e8f3b-7645-4aef-b267-988c5ff726ce',
                                    status: 'IN_PROGRESS',
                                    submitted: false
                                },
                                id: '1a0e8f3b-7645-4aef-b267-988c5ff726ce',
                                type: 'submissions'
                            }
                        },
                        {
                            data: {
                                attributes: {
                                    caseReferenceNumber: null,
                                    questionnaireId: '20df96f5-cb92-48b0-a522-a372a7539469',
                                    status: 'IN_PROGRESS',
                                    submitted: false
                                },
                                id: '20df96f5-cb92-48b0-a522-a372a7539469',
                                type: 'submissions'
                            }
                        }
                    ]
                });
            });
            it('should return an empty array if nothing to re-submit', async () => {
                // mock the DAL db integration
                jest.doMock('./admin-dal.js', () =>
                    jest.fn(() => ({
                        getQuestionnaireIdsBySubmissionStatus: () => []
                    }))
                );
                jest.doMock('../questionnaire/questionnaire-dal.js', () =>
                    jest.fn(() => ({
                        getQuestionnaire: () => {
                            return questionnaireCompleteWithoutCRN;
                        },
                        updateQuestionnaire: () => undefined,
                        getQuestionnaireSubmissionStatus: () => 'COMPLETED',
                        updateQuestionnaireSubmissionStatus: () => undefined
                    }))
                );

                // eslint-disable-next-line global-require
                const app = require('../app');

                const res = await request(app)
                    .post('/api/admin/v1/resubmit-failed-applications')
                    .set('Authorization', `Bearer ${tokens['update:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'resubmissions',
                            attributes: {}
                        }
                    });

                expect(res.body).toEqual({data: []});
            });
        });
    });
});

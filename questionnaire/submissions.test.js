'use strict';

const VError = require('verror');
const request = require('supertest');

const questionnaireCompleteWithoutCRN = require('./test-fixtures/res/questionnaireCompleteWithoutCRN');
const questionnaireCompleteWithCRN = require('./test-fixtures/res/questionnaireCompleteWithCRN');
const questionnaireIncompleteWithoutCRN = require('./test-fixtures/res/questionnaireIncompleteWithoutCRN');

const tokens = {
    'create:questionnaires':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzVjNzc4ZWQtNTg4NC00N2YwLWFiYzctZTQ1MmZiYWRlYTcyIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMiLCJpYXQiOjE1NjQwNTgyNTF9.Adv1qgj-HiNGxw_0cdYpPO8Fbw12rgJTTqMReJUmFBs',
    'read:questionnaires':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzVjNzc4ZWQtNTg4NC00N2YwLWFiYzctZTQ1MmZiYWRlYTcyIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMiLCJpYXQiOjE1NjQwNTgyNTF9.Adv1qgj-HiNGxw_0cdYpPO8Fbw12rgJTTqMReJUmFBs',
    'update:questionnaires':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzVjNzc4ZWQtNTg4NC00N2YwLWFiYzctZTQ1MmZiYWRlYTcyIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMiLCJpYXQiOjE1NjQwNTgyNTF9.Adv1qgj-HiNGxw_0cdYpPO8Fbw12rgJTTqMReJUmFBs',
    'delete:questionnaires':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzVjNzc4ZWQtNTg4NC00N2YwLWFiYzctZTQ1MmZiYWRlYTcyIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMiLCJpYXQiOjE1NjQwNTgyNTF9.Adv1qgj-HiNGxw_0cdYpPO8Fbw12rgJTTqMReJUmFBs',
    'create:system-answers':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiMDhhNTAyMWEtM2JmNC00OTBlLTkyMjAtYjJhN2Y3MGNmMTIzIiwic3ViIjoiYXBwbGljYXRpb24tc2VydmljZSIsInNjb3BlIjoiY3JlYXRlOnN5c3RlbS1hbnN3ZXJzIiwiaWF0IjoxNTY0MDU4MjUxfQ.fThAa30m5CvQRZKBb4Zm5c4wwCEK7k0bBq9MX7Fbfgs',
    'create:dummy-resource':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiYzFhMzJiOTUtNGQxMi00YzVlLWI4MGQtNWUyZTk2ZDU1MmNmIiwic3ViIjoiJC5hdWQiLCJzY29wZSI6ImNyZWF0ZTpkdW1teS1yZXNvdXJjZSIsImlhdCI6MTU2NDA1ODI1MX0.J-WxYzHK2rGJlmtmvhwQBrYFvmIpVeIQWAntDo6HJ-4',
    'read:progress-entries':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNDUwMzE2ZTYtNDFhNS00MGRjLWI3NTUtMzA2ZGQ2M2FlMDhiIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6InJlYWQ6cHJvZ3Jlc3MtZW50cmllcyIsImlhdCI6MTU2NTc5NzE1MH0.fF6Ln7GZmq-R36N-Avuo_a_8Jj5-wla17x0552XnMbE'
};

const failedResubmittedResponse = jest
    .fn()
    .mockReturnValueOnce(questionnaireCompleteWithoutCRN)
    .mockReturnValue(questionnaireCompleteWithCRN);

const failedResubmittedStatus = jest
    .fn()
    .mockReturnValueOnce('FAILED')
    .mockReturnValue('COMPLETED');

jest.doMock('./questionnaire-dal.js', () =>
    // return a modified factory function, that returns an object with a method, that returns a valid created response
    jest.fn(() => ({
        // createQuestionnaire: () => createQuestionnaireResponse,
        getQuestionnaire: questionnaireId => {
            if (
                questionnaireId === '285cb104-0c15-4a9c-9840-cb1007f098fb' || // not started.
                questionnaireId === 'e48a2238-5581-4eb1-90fe-4fa8034f0ee2' || // not started.
                questionnaireId === '3fa7bde5-bfad-453a-851d-5e3c8d206d5b' || // in progress.
                questionnaireId === '67d8e5d2-44a5-4ab7-91c0-3fd27d009235' // failed.
            ) {
                return questionnaireCompleteWithoutCRN;
            }

            if (questionnaireId === 'f197d3e9-d8ba-4500-96ed-9ea1d08f1427') {
                // completed.
                return questionnaireCompleteWithCRN;
            }

            // nonSubmittable.
            if (questionnaireId === '4fa7503f-1f73-42e7-b875-b342dee69941') {
                return questionnaireIncompleteWithoutCRN;
            }

            // failed, then resubmitted.
            if (questionnaireId === '6107e721-9532-419a-8205-3ec72903ef0c') {
                return failedResubmittedResponse();
            }

            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Questionnaire "${questionnaireId}" not found`
            );
        },
        updateQuestionnaire: () => undefined,
        getQuestionnaireSubmissionStatus: questionnaireId => {
            if (questionnaireId === '285cb104-0c15-4a9c-9840-cb1007f098fb') {
                return 'NOT_STARTED';
            }
            if (questionnaireId === 'e48a2238-5581-4eb1-90fe-4fa8034f0ee2') {
                return 'NOT_STARTED';
            }
            if (questionnaireId === '3fa7bde5-bfad-453a-851d-5e3c8d206d5b') {
                return 'IN_PROGRESS';
            }
            if (questionnaireId === '67d8e5d2-44a5-4ab7-91c0-3fd27d009235') {
                return 'FAILED';
            }
            if (questionnaireId === 'f197d3e9-d8ba-4500-96ed-9ea1d08f1427') {
                return 'COMPLETED';
            }
            if (questionnaireId === '4fa7503f-1f73-42e7-b875-b342dee69941') {
                return 'NOT_STARTED';
            }

            // failed, then resubmitted.
            if (questionnaireId === '6107e721-9532-419a-8205-3ec72903ef0c') {
                return failedResubmittedStatus();
            }

            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Questionnaire "${questionnaireId}" not found`
            );
        },
        updateQuestionnaireSubmissionStatus: () => undefined,
        retrieveCaseReferenceNumber: () => undefined
    }))
);

const app = require('../app');

describe('Questionnaire submissions', () => {
    describe('GET submission resource', () => {
        it('should return a singleton', async () => {
            const res = await request(app)
                .get('/api/v1/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                .set('Content-Type', 'application/vnd.api+json');
            expect(res.body.data.length).toEqual(1);
        });

        it('should return a resource type of "submissions"', async () => {
            const res = await request(app)
                .get('/api/v1/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                .set('Content-Type', 'application/vnd.api+json');
            expect(res.body.data[0].type).toEqual('submissions');
        });

        it('should return a "NOT_STARTED" status for a questionnaire that has not been submitted', async () => {
            const res = await request(app)
                .get('/api/v1/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                .set('Content-Type', 'application/vnd.api+json');
            expect(res.body.data[0].attributes.status).toEqual('NOT_STARTED');
        });

        it('should return a "false" boolean value for "submitted" property for a questionnaire that has not been submitted', async () => {
            const res = await request(app)
                .get('/api/v1/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                .set('Content-Type', 'application/vnd.api+json');
            expect(res.body.data[0].attributes.submitted).toEqual(false);
        });

        it('should return a null "caseReferenceNumber" property value for a questionnaire that has not been submitted', async () => {
            const res = await request(app)
                .get('/api/v1/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                .set('Content-Type', 'application/vnd.api+json');
            expect(res.body.data[0].attributes.caseReferenceNumber).toEqual(null);
        });
    });
    describe('POST submission resource', () => {
        describe('In progress', () => {
            it('should return an "IN_PROGRESS" status for a questionnaire that has been submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/3fa7bde5-bfad-453a-851d-5e3c8d206d5b/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.status).toEqual('IN_PROGRESS');
            });

            it('should return a "false" boolean value for "submitted" property for a questionnaire that has been submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/3fa7bde5-bfad-453a-851d-5e3c8d206d5b/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.submitted).toEqual(false);
            });

            it('should return a null "caseReferenceNumber" property value for a questionnaire that has not been submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/3fa7bde5-bfad-453a-851d-5e3c8d206d5b/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.caseReferenceNumber).toEqual(null);
            });
        });

        describe('Completed', () => {
            it('should return a "COMPLETED" status for a questionnaire that has been successfully submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['f197d3e9-d8ba-4500-96ed-9ea1d08f1427']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/f197d3e9-d8ba-4500-96ed-9ea1d08f1427/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.status).toEqual('COMPLETED');
            });

            it('should return a "true" boolean value for "submitted" property for a questionnaire that has been successfully submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['f197d3e9-d8ba-4500-96ed-9ea1d08f1427']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/f197d3e9-d8ba-4500-96ed-9ea1d08f1427/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.submitted).toEqual(true);
            });

            it('should return a null "caseReferenceNumber" property value for a questionnaire that has not been successfully submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['f197d3e9-d8ba-4500-96ed-9ea1d08f1427']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/f197d3e9-d8ba-4500-96ed-9ea1d08f1427/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.caseReferenceNumber).toEqual('19\\751194');
            });
        });

        describe('Failed', () => {
            it('should return a "FAILED" status for a questionnaire that has failed submission', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['67d8e5d2-44a5-4ab7-91c0-3fd27d009235']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/67d8e5d2-44a5-4ab7-91c0-3fd27d009235/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.status).toEqual('FAILED');
            });

            it('should return a "false" boolean value for "submitted" property for a questionnaire that has failed submission', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['67d8e5d2-44a5-4ab7-91c0-3fd27d009235']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/67d8e5d2-44a5-4ab7-91c0-3fd27d009235/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.submitted).toEqual(false);
            });

            it('should return a null "caseReferenceNumber" property value for a questionnaire that has not failed submission', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['67d8e5d2-44a5-4ab7-91c0-3fd27d009235']
                            }
                        }
                    });
                const res = await request(app)
                    .get('/api/v1/questionnaires/67d8e5d2-44a5-4ab7-91c0-3fd27d009235/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`);
                expect(res.body.data[0].attributes.caseReferenceNumber).toEqual(null);
            });

            it('should allow resubmission of failed applications', async () => {
                const res = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['6107e721-9532-419a-8205-3ec72903ef0c']
                            }
                        }
                    });
                expect(res.body.data[0].attributes.status).toEqual('COMPLETED');
            });
        });

        describe('multiple POSTS', () => {
            it('should return a 409 status code when submitted more than once', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                const res = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                expect(res.statusCode).toBe(409);
            });

            it('should return a specific error message when submitted more than once', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                const res = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['3fa7bde5-bfad-453a-851d-5e3c8d206d5b']
                            }
                        }
                    });
                expect(res.body.errors[0].detail).toEqual(
                    expect.stringMatching(
                        // eslint-disable-next-line no-useless-escape
                        /Submission resource with ID "[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}" already exists/
                    )
                );
            });
        });

        describe('non-submittable POSTS', () => {
            it('should return a 409 status code when non-submittable questionnaire is submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['4fa7503f-1f73-42e7-b875-b342dee69941']
                            }
                        }
                    });
                const res = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['4fa7503f-1f73-42e7-b875-b342dee69941']
                            }
                        }
                    });
                expect(res.statusCode).toBe(409);
            });

            it('should return a specific error message when non-submittable questionnaire is submitted', async () => {
                await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['4fa7503f-1f73-42e7-b875-b342dee69941']
                            }
                        }
                    });
                const res = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['4fa7503f-1f73-42e7-b875-b342dee69941']
                            }
                        }
                    });
                expect(res.body.errors[0].detail).toEqual(
                    expect.stringMatching(
                        // eslint-disable-next-line no-useless-escape
                        /Questionnaire with ID "[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}" is not in a submittable state/
                    )
                );
            });
        });

        describe('Bulk submissions', () => {
            it('should submit 1 questionnaire', async () => {
                const response = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: ['285cb104-0c15-4a9c-9840-cb1007f098fb']
                            }
                        }
                    });
                expect(response.body.data.length).toBe(1);
            });

            it('should submit many questionnaires', async () => {
                const response = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: [
                                    '285cb104-0c15-4a9c-9840-cb1007f098fb',
                                    'e48a2238-5581-4eb1-90fe-4fa8034f0ee2'
                                ]
                            }
                        }
                    });

                expect(response.body.data.length).toBe(2);
                expect(response.body.data[0].id).toBe('285cb104-0c15-4a9c-9840-cb1007f098fb');
                expect(response.body.data[1].id).toBe('e48a2238-5581-4eb1-90fe-4fa8034f0ee2');
            });

            it('should ignore duplicate questionnaire IDs', async () => {
                const response = await request(app)
                    .post('/api/v1/questionnaires/submissions')
                    .set('Authorization', `Bearer ${tokens['create:questionnaires']}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireIds: [
                                    '285cb104-0c15-4a9c-9840-cb1007f098fb',
                                    '285cb104-0c15-4a9c-9840-cb1007f098fb',
                                    '285cb104-0c15-4a9c-9840-cb1007f098fb',
                                    'e48a2238-5581-4eb1-90fe-4fa8034f0ee2',
                                    'e48a2238-5581-4eb1-90fe-4fa8034f0ee2',
                                    'e48a2238-5581-4eb1-90fe-4fa8034f0ee2'
                                ]
                            }
                        }
                    });
                expect(response.body.data.length).toBe(2);
                expect(response.body.data[0].id).toBe('285cb104-0c15-4a9c-9840-cb1007f098fb');
                expect(response.body.data[1].id).toBe('e48a2238-5581-4eb1-90fe-4fa8034f0ee2');
            });
        });
    });
});

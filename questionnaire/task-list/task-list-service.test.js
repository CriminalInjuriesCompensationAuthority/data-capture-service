'use strict';

const createTaskListService = require('./task-list-service');

beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
});

const QUESTIONNAIRE_WITH_TASK_LIST_ROUTES = {
    routes: {
        states: [
            {
                id: 't-section-1-task-1',
                initial: 'p--page-1'
            },
            {
                id: 't-section-2-task-1',
                initial: 'p-applicant-page-10'
            },
            {
                id: 't-section-2-task-2',
                initial: 'p--page-20'
            }
        ]
    }
};

const SECTION_DEFINITION_TASK_LIST = {
    l10n: {},
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['task-list'],
        properties: {
            'task-list': {
                type: 'object',
                title: 'Claim criminal injuries compensation',
                description: 'Some description',
                properties: {
                    taskListInfo: {
                        type: 'object',
                        labelCompleted: 'Completed',
                        labelIncomplete: 'Incomplete',
                        labelCannotStart: 'Cannot start yet',
                        sections: [
                            {
                                id: 's-section-1',
                                title: 'Section 1 Title',
                                tasks: [
                                    {
                                        id: 't-section-1-task-1',
                                        title: 'Section 1 Task 1 Title'
                                    }
                                ]
                            },
                            {
                                id: 's-section2',
                                title: 'Section 2 Title',
                                tasks: [
                                    {
                                        id: 't-section-2-task-1',
                                        title: 'Section 2 Task 1 Title'
                                    },
                                    {
                                        id: 't-section-2-task-2',
                                        title: 'Section 2 Task 2 Title'
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
    }
};

const SECTION_DEFINITION_NOT_TASK_LIST = {
    l10n: {},
    schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
            'p-section-id': {
                type: 'object',
                title: 'Claim criminal injuries compensation',
                description: 'Some description',
                properties: {
                    name: {
                        type: 'string'
                    }
                }
            }
        }
    }
};

describe('Task List Service', () => {
    describe('isTaskListSchema', () => {
        describe('sectionSchema AND sectionId omitted', () => {
            it('Should return false', () => {
                const taskListService = createTaskListService();
                const result = taskListService.isTaskListSchema();
                expect(result).toBe(false);
            });
        });
        describe('sectionSchema supplied', () => {
            describe('sectionSchema is a task list schema', () => {
                it('Should return true', () => {
                    const taskListService = createTaskListService();
                    const result = taskListService.isTaskListSchema({
                        sectionSchema: SECTION_DEFINITION_TASK_LIST.schema
                    });
                    expect(result).toBe(true);
                });
            });
            describe('sectionSchema is not a task list schema', () => {
                it('Should return false', () => {
                    const taskListService = createTaskListService();
                    const result = taskListService.isTaskListSchema({
                        sectionSchema: SECTION_DEFINITION_NOT_TASK_LIST
                    });
                    expect(result).toBe(false);
                });
            });
        });
        describe('sectionId supplied', () => {
            describe('sectionId is a task list id', () => {
                it('Should return true', () => {
                    const taskListService = createTaskListService();
                    const result = taskListService.isTaskListSchema({
                        sectionId: 'p-task-list'
                    });
                    expect(result).toBe(true);
                });
            });
            describe('sectionId is not a task list id', () => {
                it('Should return false', () => {
                    const taskListService = createTaskListService();
                    const result = taskListService.isTaskListSchema({
                        sectionId: 'p-section-id'
                    });
                    expect(result).toBe(false);
                });
            });
        });
    });
    describe('UpdateTaskListSchema', () => {
        it('Should seed `taskListInfo` section[..].tasks with data', () => {
            const sectionDefinition = structuredClone(SECTION_DEFINITION_TASK_LIST);
            const taskListService = createTaskListService();
            taskListService.UpdateTaskListSchema(
                QUESTIONNAIRE_WITH_TASK_LIST_ROUTES,
                sectionDefinition
            );
            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[0]
                    .tasks[0]
            ).toHaveProperty('href');
            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[0]
                    .tasks[0].href
            ).toBe('info-page-1');

            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[1]
                    .tasks[0]
            ).toHaveProperty('href');
            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[1]
                    .tasks[0].href
            ).toBe('applicant-page-10');

            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[1]
                    .tasks[1]
            ).toHaveProperty('href');
            expect(
                sectionDefinition.schema.properties['task-list'].properties.taskListInfo.sections[1]
                    .tasks[1].href
            ).toBe('info-page-20');
        });
    });
});

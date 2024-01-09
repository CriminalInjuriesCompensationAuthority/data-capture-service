'use strict';

const createTaskRunner = require('../../index');
const sequential = require('./index').runTasksSequentially;

const mockLogger = {
    error: jest.fn()
};

const testHelper = {
    wait: async milliseconds => {
        return new Promise(resolve => {
            setTimeout(() => resolve(true), milliseconds);
        });
    }
};

describe('task: sequential', () => {
    it('should run tasks sequentially', async () => {
        const taskRunner = createTaskRunner({
            taskImplementations: {
                sequential,
                epochTask: async data => {
                    await testHelper.wait(data.delayMs);
                    return Date.now();
                }
            }
        });

        const result = await taskRunner.run({
            id: 'task0',
            type: 'sequential',
            data: [
                {
                    id: 'task1',
                    type: 'epochTask',
                    data: {
                        delayMs: 15
                    }
                },
                {
                    id: 'task2',
                    type: 'epochTask',
                    data: {
                        delayMs: 10
                    }
                },
                {
                    id: 'task3',
                    type: 'epochTask',
                    data: {
                        delayMs: 5
                    }
                }
            ]
        });

        const taskResults = result.task.result;
        const taskIdsOrderedByEpochAscending = taskResults
            .sort((a, b) => a.result - b.result)
            .map(taskState => taskState.id);

        expect(taskIdsOrderedByEpochAscending.length).toEqual(3);
        expect(taskIdsOrderedByEpochAscending).toEqual(['task1', 'task2', 'task3']);
    });

    it('should fail fast if any child task fails', async () => {
        const taskRunner = createTaskRunner({
            taskImplementations: {
                sequential,
                simpleTaskFactory: async () => 'foo',
                simpleTaskFactoryThatThrows: async () => {
                    throw Error('foo');
                }
            },
            context: {
                logger: mockLogger
            }
        });

        await expect(
            taskRunner.run({
                id: 'task0',
                type: 'sequential',
                data: [
                    {
                        id: 'task1',
                        type: 'simpleTaskFactory'
                    },
                    {
                        id: 'task2',
                        type: 'simpleTaskFactory'
                    },
                    {
                        id: 'task3',
                        type: 'simpleTaskFactoryThatThrows'
                    },
                    {
                        id: 'task4',
                        type: 'simpleTaskFactory'
                    },
                    {
                        id: 'task5',
                        type: 'simpleTaskFactory'
                    }
                ]
            })
        ).rejects.toThrow(
            'Sequential task failed at index 2, task id: task3, task type: simpleTaskFactoryThatThrows'
        );
    });

    it('should allow access to previous task results', async () => {
        const taskRunner = createTaskRunner({
            taskImplementations: {
                sequential,
                simpleTaskFactory: async data => {
                    return data.messages.join(' ');
                }
            }
        });
        const result = await taskRunner.run({
            id: 'task0',
            type: 'sequential',
            retries: 0,
            data: [
                {
                    id: 'task1',
                    type: 'simpleTaskFactory',
                    data: {
                        messages: ['foo']
                    }
                },
                {
                    id: 'task2',
                    type: 'simpleTaskFactory',
                    data: {
                        messages: ['$.task1.result', 'bar']
                    }
                },
                {
                    id: 'task3',
                    type: 'simpleTaskFactory',
                    data: {
                        messages: ['$.task2.result', 'baz']
                    }
                }
            ]
        });

        const {task3} = result.context;

        expect(task3.result).toEqual('foo bar baz');
    });
});

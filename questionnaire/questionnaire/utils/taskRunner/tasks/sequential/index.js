'use strict';

class SequentialTaskError extends Error {
    constructor(message, cause, taskIndex) {
        super(message);
        this.name = 'SequentialTaskError';
        this.cause = cause;
        this.taskIndex = taskIndex;
    }
}

async function runTasksSequentially(tasks, runTask) {
    const taskStates = [];

    for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        try {
            // eslint-disable-next-line no-await-in-loop
            const result = await runTask(task);
            taskStates.push(result.task);
        } catch (error) {
            throw new SequentialTaskError(
                `Sequential task failed at index ${index}, task id: ${task.id}, task type: ${task.type}`,
                error,
                index
            );
        }
    }

    return taskStates;
}

module.exports = {SequentialTaskError, runTasksSequentially};

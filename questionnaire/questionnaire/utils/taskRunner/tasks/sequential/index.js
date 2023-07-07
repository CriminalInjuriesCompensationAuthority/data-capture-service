'use strict';

async function runTasksSequentially(taskDefinitions, run) {
    const taskStates = [];

    for (let i = 0; i < taskDefinitions.length; i += 1) {
        const taskDefinition = taskDefinitions[i];

        try {
            // eslint-disable-next-line no-await-in-loop
            const result = await run(taskDefinition);

            // taskStates[result.task.id] = result.task;
            taskStates.push(result.task);
        } catch (err) {
            taskStates.push(err.task);

            throw taskStates;
        }
    }

    return taskStates;
}

module.exports = runTasksSequentially;
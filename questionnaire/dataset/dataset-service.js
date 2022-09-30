'use strict';

const VError = require('verror');

const defaults = {};
// TODO: Use questionnaireService instead of directly using the DAL
defaults.createQuestionnaireDAL = require('../questionnaire-dal');
defaults.createQuestionnaireHelper = require('../questionnaire/questionnaire');

function createDatasetService({
    logger,
    createQuestionnaireDAL = defaults.createQuestionnaireDAL,
    createQuestionnaireHelper = defaults.createQuestionnaireHelper
} = {}) {
    const db = createQuestionnaireDAL({logger});

    function mergeArrays(target, source) {
        const targetIsArray = Array.isArray(target);
        const sourceIsArray = Array.isArray(source);

        if (targetIsArray && sourceIsArray) {
            return target.concat(source);
        }

        throw new VError(
            `Target and Source must be arrays. Target type: "${
                targetIsArray ? 'array' : typeof target
            }". Source type: "${sourceIsArray ? 'array' : typeof source}"`
        );
    }

    function mergeAttributeValues(targetAttribute, sourceAttribute) {
        targetAttribute.value = mergeArrays(targetAttribute.value, sourceAttribute.value);
        targetAttribute.valueLabel = mergeArrays(
            targetAttribute.valueLabel,
            sourceAttribute.valueLabel
        );

        return targetAttribute;
    }

    function applyNormalisedAttributeDetails(attribute, questionnaire) {
        const normalisedAttributeDetails = questionnaire.getNormalisedDetailsForAttribute(
            attribute.id
        );

        if (
            normalisedAttributeDetails !== undefined &&
            normalisedAttributeDetails.title !== undefined
        ) {
            attribute.label = normalisedAttributeDetails.title;
        }

        return attribute;
    }

    function getFlatDataView(questionnaire) {
        const dataset = new Map();
        const answers = questionnaire.getOrderedAnswers();

        Object.values(answers).forEach(sectionAnswers => {
            Object.keys(sectionAnswers).forEach(questionId => {
                const answer = sectionAnswers[questionId];
                const existingAnswer = dataset.get(questionId);

                if (existingAnswer !== undefined) {
                    const mergedAnswers = mergeArrays(existingAnswer, answer);

                    dataset.set(questionId, mergedAnswers);
                } else {
                    dataset.set(questionId, answer);
                }
            });
        });

        return Object.fromEntries(dataset);
    }

    // TODO: remove this and implement allOf / describedBy properly
    function addDeclarationAttributes(dataset, questionnaire) {
        const progress = questionnaire.getProgress();
        const declarationSectionAndQuestionIds = {
            'p-applicant-declaration': 'q-applicant-declaration',
            'p-mainapplicant-declaration-under-12': 'q-mainapplicant-declaration',
            'p-mainapplicant-declaration-12-and-over': 'q-mainapplicant-declaration',
            'p-rep-declaration-under-12': 'q-rep-declaration',
            'p-rep-declaration-12-and-over': 'q-rep-declaration'
        };
        const declarationSectionIds = Object.keys(declarationSectionAndQuestionIds);
        const declarationSectionId = progress.find(sectionId =>
            declarationSectionIds.includes(sectionId)
        );

        if (declarationSectionId !== undefined) {
            const section = questionnaire.getSection(declarationSectionId);
            const sectionSchema = section.getSchema();
            const sectionAnswers = questionnaire.getAnswers()[declarationSectionId];
            const questionId = declarationSectionAndQuestionIds[declarationSectionId];
            const descriptionId = questionId.replace('q-', '');
            const {description} = sectionSchema.allOf[0].properties[descriptionId];
            const value = sectionAnswers[questionId];
            const valueLabel = sectionSchema.allOf[1].properties[questionId].title;

            dataset.set(declarationSectionId, {
                type: 'simple',
                id: questionId,
                label: description,
                value,
                valueLabel
            });
        }
    }

    function getHierachicalDataView(questionnaire) {
        const dataset = new Map();
        const dataAttrs = questionnaire.getDataAttributes({includeMetadata: false});

        dataAttrs.forEach(attribute => {
            const existingAttribute = dataset.get(attribute.id);

            if (existingAttribute !== undefined) {
                mergeAttributeValues(existingAttribute, attribute);
            } else {
                const mutatedAttribute = applyNormalisedAttributeDetails(attribute, questionnaire);

                dataset.set(mutatedAttribute.id, mutatedAttribute);
            }
        });

        // TODO: remove this and implement allOf / describedBy properly
        addDeclarationAttributes(dataset, questionnaire);

        return Array.from(dataset.values());
    }

    async function getResource(questionnaireId, resourceVersion = '1.0.0') {
        const questionnaireDefinition = await db.getQuestionnaire(questionnaireId);
        const questionnaire = createQuestionnaireHelper({questionnaireDefinition});

        if (resourceVersion === '1.0.0') {
            const dataset = getFlatDataView(questionnaire);

            return [
                {
                    type: 'dataset',
                    id: '0',
                    attributes: dataset
                }
            ];
        }

        if (resourceVersion === '2.0.0') {
            const dataset = getHierachicalDataView(questionnaire);

            return [
                {
                    type: 'dataset',
                    id: '0',
                    attributes: {
                        values: dataset
                    }
                }
            ];
        }

        throw Error(`Dataset resource version "${resourceVersion}" is unsupported`);
    }

    return Object.freeze({
        getResource
    });
}

module.exports = createDatasetService;

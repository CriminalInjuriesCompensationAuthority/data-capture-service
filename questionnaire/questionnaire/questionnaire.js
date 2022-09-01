'use strict';

const defaults = {};
defaults.createSection = require('./section');
defaults.createTaxonomy = require('./taxonomy/taxonomy');
defaults.groupDataAttributesByTaxonomy = require('./utils/groupDataAttributesByTaxonomy');
defaults.mutateObjectValues = require('./utils/mutateObjectValues');
defaults.getValueInterpolator = require('./utils/getValueInterpolator');
defaults.getValueContextualiser = require('./utils/getValueContextualiser');
defaults.deepClone = require('./utils/deepCloneJsonDerivedObject');
defaults.getJsonExpressionEvaluator = require('./utils/getJsonExpressionEvaluator');

function createQuestionnaire({
    questionnaireDefinition,
    createSection = defaults.createSection,
    createTaxonomy = defaults.createTaxonomy,
    groupDataAttributesByTaxonomy = defaults.groupDataAttributesByTaxonomy,
    mutateObjectValues = defaults.mutateObjectValues,
    getValueInterpolator = defaults.getValueInterpolator,
    getValueContextualiser = defaults.getValueContextualiser,
    deepClone = defaults.deepClone,
    getJsonExpressionEvaluator = defaults.getJsonExpressionEvaluator
}) {
    function getProgress() {
        return questionnaireDefinition.progress || [];
    }

    function getProgressUntil(sectionId) {
        const allProgress = getProgress();
        const endIndex = allProgress.indexOf(sectionId);

        if (endIndex > -1) {
            const progressSubset = allProgress.slice(0, endIndex);
            return progressSubset;
        }

        return allProgress;
    }

    function getRoles() {
        return questionnaireDefinition?.attributes?.q__roles || {};
    }

    function getAnswers() {
        return questionnaireDefinition.answers;
    }

    function getOrderedAnswers() {
        const progress = getProgress();
        const answers = getAnswers();
        const orderedAnswers = {};

        progress.forEach(sectionId => {
            orderedAnswers[sectionId] = answers[sectionId];
        });

        return orderedAnswers;
    }

    function getTaxonomies() {
        return questionnaireDefinition.taxonomies;
    }

    function getTaxonomy(taxonomyId) {
        const taxonomyDefinition = getTaxonomies()[taxonomyId];

        if (taxonomyDefinition !== undefined) {
            if (taxonomyDefinition.l10n !== undefined) {
                const orderedValueTransformers = [];
                const allQuestionnaireAnswers = {answers: getAnswers()};
                const jsonExpressionEvaluator = getJsonExpressionEvaluator({
                    ...allQuestionnaireAnswers,
                    attributes: {
                        q__roles: getRoles()
                    }
                });

                const valueContextualier = getValueContextualiser(
                    taxonomyDefinition,
                    allQuestionnaireAnswers
                );
                orderedValueTransformers.push(jsonExpressionEvaluator, valueContextualier);

                // TODO: DON'T MUTATE ORIGINAL!
                mutateObjectValues(taxonomyDefinition, orderedValueTransformers);
            }

            return createTaxonomy({
                id: taxonomyId,
                definition: taxonomyDefinition
            });
        }

        return undefined;
    }

    function getSectionDefinitions() {
        return questionnaireDefinition.sections;
    }

    function getSectionDefinition(sectionId) {
        return deepClone(getSectionDefinitions()[sectionId]);
    }

    function getSectionAnswers(sectionId) {
        return getAnswers()[sectionId];
    }

    function transformDataAttribute(dataAttribute) {
        const {meta} = dataAttribute;
        const {sectionId} = meta;
        const summaryTitle = meta.summary && meta.summary.title;
        const themeId = meta.classifications && meta.classifications.theme;
        const format = meta.keywords && meta.keywords.format;
        const transformedData = {...dataAttribute};

        delete transformedData.meta;

        if (summaryTitle !== undefined) {
            transformedData.label = summaryTitle;
        }

        if (sectionId !== undefined) {
            transformedData.sectionId = sectionId;
        }

        if (themeId !== undefined) {
            transformedData.theme = themeId;
        }

        if (format !== undefined) {
            transformedData.format = format;
        }

        return transformedData;
    }

    function evaluateJsonExpression(value, sectionId) {
        const fnName = value[0];

        if (fnName === 'summary') {
            // TODO: handle multiple summary pages e.g. summarise between last summary and this one
            const progressSubset = getProgressUntil(sectionId);
            const summaryOptions = value[1];

            // eslint-disable-next-line no-use-before-define
            const dataAttributes = getDataAttributes({
                progress: progressSubset,
                dataAttributeTransformer: transformDataAttribute
            });
            const summary = groupDataAttributesByTaxonomy({
                dataAttributes,
                taxonomy: getTaxonomy(summaryOptions.groupByTaxonomy)
            });

            return summary;
        }

        return value;
    }

    function isJsonExpression(value) {
        return Array.isArray(value) && typeof value[0] === 'string';
    }

    function getResolvedVars(sectionId, sectionVars = []) {
        const resolvedVars = {};

        sectionVars.forEach(sectionVar => {
            const {name, value} = sectionVar;

            if (isJsonExpression(value)) {
                resolvedVars[name] = evaluateJsonExpression(value, sectionId);
            } else {
                resolvedVars[name] = value;
            }
        });

        return resolvedVars;
    }

    function getSectionDefinitionVars(sectionDefinition) {
        // TODO: replace this function body with an actual implementation of "vars"

        const {schema} = sectionDefinition;

        if (schema && 'properties' in schema && 'p-check-your-answers' in schema.properties) {
            schema.properties['p-check-your-answers'].properties.summaryInfo.summaryStructure =
                'q.var:summary';

            return [
                {
                    name: 'summary',
                    value: ['summary', {groupByTaxonomy: 'theme'}]
                }
            ];
        }

        return undefined;
    }

    function getVarName(identifier) {
        return identifier.split(':')[1];
    }

    function getValueVarReplacer(vars) {
        return (key, value) => {
            if (typeof value === 'string' && value.startsWith('q.var:')) {
                const varName = getVarName(value);

                return vars[varName];
            }

            return value;
        };
    }

    function getSection(sectionId, allowSummary = true) {
        const sectionDefinition = getSectionDefinition(sectionId);
        const sectionDefinitionVars = getSectionDefinitionVars(sectionDefinition);
        const allQuestionnaireAnswers = {answers: getAnswers()};
        const orderedValueTransformers = [];
        const valueInterpolator = getValueInterpolator(allQuestionnaireAnswers);

        if (sectionDefinition.l10n !== undefined) {
            const jsonExpressionEvaluator = getJsonExpressionEvaluator({
                ...allQuestionnaireAnswers,
                attributes: {
                    q__roles: getRoles()
                }
            });
            const valueContextualier = getValueContextualiser(
                sectionDefinition,
                allQuestionnaireAnswers
            );

            orderedValueTransformers.push(jsonExpressionEvaluator, valueContextualier);
        }

        if (sectionDefinitionVars !== undefined && allowSummary === true) {
            const resolvedVars = getResolvedVars(sectionId, sectionDefinitionVars);
            const valueVarReplacer = getValueVarReplacer(resolvedVars);

            orderedValueTransformers.push(valueVarReplacer);
        }

        orderedValueTransformers.push(valueInterpolator);

        // TODO: DON'T MUTATE ORIGINAL!
        // contextualise > replace vars > interpolate
        mutateObjectValues(sectionDefinition.schema, orderedValueTransformers);

        return createSection({id: sectionId, sectionDefinition});
    }

    // TODO: remove this and implement allOf / describedBy properly
    function removeDeclarationSectionIds(sectionIds) {
        const sectionIdBlacklist = [
            'p-applicant-declaration',
            'p-mainapplicant-declaration-under-12',
            'p-mainapplicant-declaration-12-and-over'
        ];

        return sectionIds.filter(sectionId => sectionIdBlacklist.includes(sectionId) === false);
    }

    function getDataAttributes({
        progress = getProgress(),
        dataAttributeTransformer,
        includeMetadata = true
    } = {}) {
        const allDataAttributes = [];
        // TODO: remove this and implement allOf / describedBy properly
        const sectionIds = removeDeclarationSectionIds(progress);

        sectionIds.forEach(sectionId => {
            const sectionAnswers = getSectionAnswers(sectionId);

            if (sectionAnswers !== undefined) {
                const section = getSection(sectionId, false);
                const sectionDataAttributes = section.getAttributesByData({
                    data: sectionAnswers,
                    includeMetadata,
                    mapAttribute: dataAttributeTransformer
                });

                allDataAttributes.push(...sectionDataAttributes);
            }
        });

        return allDataAttributes;
    }

    function getMetadata(metadataId) {
        const metadata = questionnaireDefinition.meta;

        if (metadata !== undefined) {
            if (metadataId !== undefined) {
                return metadata[metadataId];
            }

            return metadata;
        }

        return undefined;
    }

    function getNormalisedDetailsForAttribute(attributeId) {
        const normalisedAttributeDetails = getMetadata('attributes');

        if (normalisedAttributeDetails !== undefined) {
            const attributeDetails = normalisedAttributeDetails[attributeId];

            return attributeDetails;
        }

        return undefined;
    }

    return Object.freeze({
        getTaxonomy,
        getSection,
        getOrderedAnswers,
        getDataAttributes,
        getNormalisedDetailsForAttribute,
        getProgress, // TODO: remove this when declaration is handled correctly
        getAnswers // TODO: remove this when declaration is handled correctly
    });
}

module.exports = createQuestionnaire;

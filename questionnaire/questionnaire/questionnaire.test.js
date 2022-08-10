'use strict';

const createQuestionnaire = require('./questionnaire');

const questionnaireDefinition = {
    taxonomies: {
        theme: {
            l10n: {
                vars: {
                    lng: 'en',
                    context: {
                        $data:
                            '/answers/p-applicant-who-are-you-applying-for/q-applicant-who-are-you-applying-for'
                    },
                    ns: 'theme'
                },
                translations: [
                    {
                        language: 'en',
                        namespace: 'theme',
                        resources: {
                            applicant_details: {
                                title: 'Your details',
                                'title_someone-else': 'Victim details'
                            }
                        }
                    }
                ]
            },
            taxa: {
                'applicant-details': {
                    title: 'l10nt:applicant_details.title{?lng,context,ns}'
                },
                'contact-details': {
                    title: 'Contact details'
                },
                crime: {
                    title: 'About the crime'
                },
                offender: {
                    title: 'About the offender'
                }
            }
        }
    },
    attributes: {
        q__roles: {
            mainapplicant: {
                schema: {
                    title: 'Main Applicant role',
                    type: 'boolean',
                    // prettier-ignore
                    const: ['or',
                        ['==', '$.answers.p-mainapplicant-parent.q-mainapplicant-parent', true],
                        ['==', '$.answers.p--has-legal-authority.q--has-legal-authority', true]
                    ]
                }
            },
            rep: {
                schema: {
                    title: 'Rep role',
                    type: 'boolean',
                    // prettier-ignore
                    const: ['==', '$.answers.p--has-legal-authority.q--has-legal-authority', false]
                }
            },
            child: {
                schema: {
                    title: 'Child applicant role',
                    type: 'boolean',
                    // prettier-ignore
                    const: ['==',
                        '$.answers.p-applicant-are-you-18-or-over.q-applicant-are-you-18-or-over',
                        false
                    ]
                }
            },
            adult: {
                schema: {
                    title: 'Adult applicant role',
                    type: 'boolean',
                    // prettier-ignore
                    const: ['==',
                        '$.answers.p-applicant-are-you-18-or-over.q-applicant-are-you-18-or-over',
                        true
                    ]
                }
            },
            proxy: {
                schema: {
                    title: 'A type of proxy for the applicant',
                    type: 'boolean',
                    // prettier-ignore
                    const: ['==',
                        '$.answers.p-applicant-who-are-you-applying-for.q-applicant-who-are-you-applying-for',
                        'someone-else'
                    ]
                }
            }
        }
    },
    sections: {
        'p-applicant-date-of-birth': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                required: ['q-applicant-enter-your-date-of-birth'],
                additionalProperties: false,
                properties: {
                    'q-applicant-date-of-birth': {
                        title: 'Enter your date of birth',
                        type: 'string',
                        format: 'date-time',
                        description: 'For example, 31 3 1980.',
                        meta: {
                            keywords: {
                                format: {
                                    precision: 'YYYY-MM-DD'
                                }
                            },
                            classifications: {
                                theme: 'applicant-details'
                            },
                            summary: {
                                title: 'Date of birth'
                            }
                        }
                    }
                }
            }
        },
        'p-applicant-enter-your-email-address': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    'q-applicant-enter-your-email-address': {
                        type: 'string',
                        title: 'Enter your email address',
                        description:
                            'We may use this to contact you if we need to clarify something on your application form (optional).',
                        maxLength: 50,
                        format: 'email',
                        meta: {
                            classifications: {
                                theme: 'contact-details'
                            }
                        }
                    }
                }
            }
        },
        'p-applicant-enter-your-name': {
            l10n: {
                vars: {
                    lng: 'en',
                    context: {
                        $data:
                            '/answers/p-applicant-who-are-you-applying-for/q-applicant-who-are-you-applying-for'
                    },
                    ns: 'p-applicant-enter-your-name'
                },
                translations: [
                    {
                        language: 'en',
                        namespace: 'p-applicant-enter-your-name',
                        resources: {
                            title: 'Enter your name',
                            'title_someone-else': "Enter the child's name",
                            'summary-title': 'Your name',
                            'summary-title_someone-else': "Child's name",
                            'q-applicant-title': {
                                error: {
                                    required: 'Enter your title',
                                    'required_someone-else': "Enter the child's title"
                                }
                            },
                            'q-applicant-first-name': {
                                error: {
                                    required: 'Enter your first name',
                                    'required_someone-else': "Enter the child's first name"
                                }
                            },
                            'q-applicant-last-name': {
                                error: {
                                    required: 'Enter your last name',
                                    'required_someone-else': "Enter the child's last name"
                                }
                            }
                        }
                    }
                ]
            },
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                allOf: [
                    {
                        title: 'l10nt:title{?lng,context,ns}',
                        meta: {
                            compositeId: 'applicant-name',
                            classifications: {
                                theme: 'applicant-details'
                            },
                            summary: {
                                title: 'l10nt:summary-title{?lng,context,ns}'
                            }
                        },
                        required: [
                            'q-applicant-title',
                            'q-applicant-first-name',
                            'q-applicant-last-name'
                        ],
                        propertyNames: {
                            enum: [
                                'q-applicant-title',
                                'q-applicant-first-name',
                                'q-applicant-last-name'
                            ]
                        },
                        allOf: [
                            {
                                properties: {
                                    'q-applicant-title': {
                                        title: 'Title',
                                        type: 'string',
                                        maxLength: 6,
                                        errorMessage: {
                                            maxLength: 'Title must be 6 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-applicant-first-name': {
                                        title: 'First name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'First name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-applicant-last-name': {
                                        title: 'Last name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'Last name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        },
        'p-mainapplicant-name': {
            l10n: {
                vars: {
                    lng: 'en',
                    ns: 'p-mainapplicant-name'
                },
                translations: [
                    {
                        language: 'en',
                        namespace: 'p-mainapplicant-name',
                        resources: {
                            title: {
                                mainapplicant: 'Enter your name',
                                rep: {
                                    child:
                                        'Enter the name of the person with parental responsibility for the victim',
                                    adult:
                                        'Enter the name of the person with legal authority for the victim'
                                }
                            },
                            'summary-title': {
                                mainapplicant: 'Your name',
                                rep: {
                                    child:
                                        'Name of the person with parental responsibility for the victim',
                                    adult: 'Name of the person with legal authority for the victim'
                                }
                            }
                        }
                    }
                ]
            },
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                allOf: [
                    {
                        // prettier-ignore
                        title: ['|l10nt',
                            ['|role.any', 'mainapplicant'], 'title.mainapplicant',
                            ['|role.all', 'rep', 'adult'], 'title.rep.adult',
                            ['|role.all', 'rep', 'child'], 'title.rep.child',
                        ],
                        meta: {
                            compositeId: 'mainapplicant-name',
                            classifications: {
                                theme: 'mainapplicant-details'
                            },
                            summary: {
                                // prettier-ignore
                                title: ['|l10nt',
                                    ['|role.any', 'mainapplicant'], 'summary-title.mainapplicant',
                                    ['|role.all', 'rep', 'adult'], 'summary-title.rep.adult',
                                    ['|role.all', 'rep', 'child'], 'summary-title.rep.child'
                                ]
                            }
                        },
                        required: [
                            'q-mainapplicant-title',
                            'q-mainapplicant-first-name',
                            'q-mainapplicant-last-name'
                        ],
                        propertyNames: {
                            enum: [
                                'q-mainapplicant-title',
                                'q-mainapplicant-first-name',
                                'q-mainapplicant-last-name'
                            ]
                        },
                        allOf: [
                            {
                                properties: {
                                    'q-mainapplicant-title': {
                                        title: 'Title',
                                        type: 'string',
                                        maxLength: 6,
                                        errorMessage: {
                                            maxLength: 'Title must be 6 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-mainapplicant-first-name': {
                                        title: 'First name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'First name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-mainapplicant-last-name': {
                                        title: 'Last name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'Last name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        },
        'p-applicant-british-citizen-or-eu-national': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    'q-applicant-british-citizen-or-eu-national': {
                        title:
                            '||/answers/p-applicant-enter-your-name/q-applicant-title|| ||/answers/p-applicant-enter-your-name/q-applicant-first-name|| ||/answers/p-applicant-enter-your-name/q-applicant-last-name||, are you a British citizen or EU national?',
                        type: 'boolean',
                        oneOf: [
                            {
                                title: 'Yes',
                                const: true
                            },
                            {
                                title: 'No',
                                const: false
                            }
                        ],
                        meta: {
                            classifications: {
                                theme: 'applicant-details'
                            }
                        }
                    }
                }
            }
        },
        'p--check-your-answers': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                additionalProperties: false,
                properties: {
                    'p-check-your-answers': {
                        title: 'Check your answers',
                        type: 'object',
                        properties: {
                            summaryInfo: {
                                type: 'object',
                                urlPath: 'apply',
                                editAnswerText: 'Change',
                                summaryStructure: [
                                    {
                                        existingStuff: 'foo'
                                    }
                                ],
                                lookup: {
                                    existingStuff: 'bar'
                                }
                            }
                        }
                    }
                }
            }
        },
        'p-applicant-theme-undefined': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    'q-applicant-theme-undefined': {
                        type: 'string',
                        title: 'Enter your fav colour',
                        maxLength: 50
                    }
                }
            }
        },
        'p-applicant-theme-not-found': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    'q-applicant-theme-not-found': {
                        type: 'string',
                        title: 'Enter your fav colour',
                        maxLength: 50,
                        meta: {
                            classifications: {
                                theme: 'this-theme-is-not-found'
                            }
                        }
                    }
                }
            }
        },
        'p-applicant-who-are-you-applying-for': {
            schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                required: ['q-applicant-who-are-you-applying-for'],
                additionalProperties: false,
                properties: {
                    'q-applicant-who-are-you-applying-for': {
                        title: 'Who are you applying for?',
                        type: 'string',
                        oneOf: [
                            {
                                title: 'Myself',
                                const: 'myself'
                            },
                            {
                                title: 'Someone else',
                                const: 'someone-else'
                            }
                        ],
                        meta: {
                            classifications: {
                                theme: 'applicant-details'
                            }
                        }
                    }
                }
            }
        }
    },
    progress: [
        'p-applicant-date-of-birth',
        'p-applicant-enter-your-email-address',
        'p-applicant-who-are-you-applying-for',
        'p-applicant-enter-your-name',
        'p-applicant-british-citizen-or-eu-national',
        'p-applicant-theme-undefined',
        'p-applicant-theme-not-found',
        'p--check-your-answers',
        'p-declaraton'
    ],
    answers: {
        'p-applicant-date-of-birth': {
            'q-applicant-date-of-birth': '1970-01-01T00:00:00.000Z'
        },
        'p-applicant-enter-your-email-address': {
            'q-applicant-enter-your-email-address':
                'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk'
        },
        'p-applicant-who-are-you-applying-for': {
            'q-applicant-who-are-you-applying-for': 'myself'
        },
        'p-applicant-enter-your-name': {
            'q-applicant-title': 'Mr',
            'q-applicant-first-name': 'Foo',
            'q-applicant-last-name': 'Bar'
        },
        'p-applicant-british-citizen-or-eu-national': {
            'q-applicant-british-citizen-or-eu-national': true
        },
        'p-applicant-theme-undefined': {
            'q-applicant-theme-undefined': 'red'
        },
        'p-applicant-theme-not-found': {
            'q-applicant-theme-not-found': 'blue'
        },
        'p--has-legal-authority': {
            'q--has-legal-authority': false
        },
        'p-applicant-are-you-18-or-over': {
            'q-applicant-are-you-18-or-over': false
        },
        'p--check-your-answers': {}
    }
};

describe('Questionnaire', () => {
    it('should return a specified taxonomy', () => {
        const questionnaire = createQuestionnaire({questionnaireDefinition});
        const themeTaxonomy = questionnaire.getTaxonomy('theme');

        expect(themeTaxonomy.getId()).toEqual('theme');
        expect(themeTaxonomy.getTaxon('contact-details').title).toEqual('Contact details');
    });

    describe('Given a taxonomy definition requiring contextualisation', () => {
        it('should return a contextualised taxonomy', () => {
            const questionnaire = createQuestionnaire({questionnaireDefinition});
            const themeTaxonomy = questionnaire.getTaxonomy('theme');

            expect(themeTaxonomy.getId()).toEqual('theme');
            expect(themeTaxonomy.getTaxon('applicant-details').title).toEqual('Your details');
        });
    });

    describe('Given a section definition requiring data interpolation', () => {
        it('should return an interpolated section', () => {
            const questionnaire = createQuestionnaire({questionnaireDefinition});
            const section = questionnaire.getSection('p-applicant-british-citizen-or-eu-national');
            const sectionSchema = section.getSchema();

            expect(sectionSchema).toEqual({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    'q-applicant-british-citizen-or-eu-national': {
                        title: 'Mr Foo Bar, are you a British citizen or EU national?',
                        type: 'boolean',
                        oneOf: [
                            {
                                title: 'Yes',
                                const: true
                            },
                            {
                                title: 'No',
                                const: false
                            }
                        ],
                        meta: {
                            classifications: {
                                theme: 'applicant-details'
                            }
                        }
                    }
                }
            });
        });
    });

    describe('Given a section definition requiring contextualisation', () => {
        it('should return a contextualised section', () => {
            const questionnaire = createQuestionnaire({questionnaireDefinition});
            const section = questionnaire.getSection('p-applicant-enter-your-name');
            const sectionSchema = section.getSchema();

            expect(sectionSchema).toEqual({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                allOf: [
                    {
                        title: 'Enter your name',
                        meta: {
                            compositeId: 'applicant-name',
                            classifications: {
                                theme: 'applicant-details'
                            },
                            summary: {
                                title: 'Your name'
                            }
                        },
                        required: [
                            'q-applicant-title',
                            'q-applicant-first-name',
                            'q-applicant-last-name'
                        ],
                        propertyNames: {
                            enum: [
                                'q-applicant-title',
                                'q-applicant-first-name',
                                'q-applicant-last-name'
                            ]
                        },
                        allOf: [
                            {
                                properties: {
                                    'q-applicant-title': {
                                        title: 'Title',
                                        type: 'string',
                                        maxLength: 6,
                                        errorMessage: {
                                            maxLength: 'Title must be 6 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-applicant-first-name': {
                                        title: 'First name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'First name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-applicant-last-name': {
                                        title: 'Last name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'Last name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'applicant-details'
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            });
        });

        it('should return a personalised section', () => {
            const questionnaire = createQuestionnaire({questionnaireDefinition});
            const section = questionnaire.getSection('p-mainapplicant-name');
            const sectionSchema = section.getSchema();

            expect(sectionSchema).toEqual({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                allOf: [
                    {
                        title:
                            'Enter the name of the person with parental responsibility for the victim',
                        meta: {
                            compositeId: 'mainapplicant-name',
                            classifications: {
                                theme: 'mainapplicant-details'
                            },
                            summary: {
                                title:
                                    'Name of the person with parental responsibility for the victim'
                            }
                        },
                        required: [
                            'q-mainapplicant-title',
                            'q-mainapplicant-first-name',
                            'q-mainapplicant-last-name'
                        ],
                        propertyNames: {
                            enum: [
                                'q-mainapplicant-title',
                                'q-mainapplicant-first-name',
                                'q-mainapplicant-last-name'
                            ]
                        },
                        allOf: [
                            {
                                properties: {
                                    'q-mainapplicant-title': {
                                        title: 'Title',
                                        type: 'string',
                                        maxLength: 6,
                                        errorMessage: {
                                            maxLength: 'Title must be 6 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-mainapplicant-first-name': {
                                        title: 'First name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'First name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                properties: {
                                    'q-mainapplicant-last-name': {
                                        title: 'Last name',
                                        type: 'string',
                                        maxLength: 70,
                                        errorMessage: {
                                            maxLength: 'Last name must be 70 characters or less'
                                        },
                                        meta: {
                                            classifications: {
                                                theme: 'mainapplicant-details'
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            });
        });
    });

    describe('Given a section definition requiring an answer summary', () => {
        it('should return a section containing an answer summary', () => {
            const questionnaire = createQuestionnaire({questionnaireDefinition});
            const section = questionnaire.getSection('p--check-your-answers');
            const sectionSchema = section.getSchema();

            expect(sectionSchema).toEqual({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                additionalProperties: false,
                properties: {
                    'p-check-your-answers': {
                        title: 'Check your answers',
                        type: 'object',
                        properties: {
                            summaryInfo: {
                                type: 'object',
                                urlPath: 'apply',
                                editAnswerText: 'Change',
                                summaryStructure: [
                                    {
                                        type: 'theme',
                                        id: 'applicant-details',
                                        title: 'Your details',
                                        values: [
                                            {
                                                id: 'q-applicant-date-of-birth',
                                                type: 'simple',
                                                label: 'Date of birth',
                                                value: '1970-01-01T00:00:00.000Z',
                                                sectionId: 'p-applicant-date-of-birth',
                                                theme: 'applicant-details',
                                                format: {
                                                    precision: 'YYYY-MM-DD',
                                                    value: 'date-time'
                                                }
                                            },
                                            {
                                                id: 'q-applicant-who-are-you-applying-for',
                                                type: 'simple',
                                                label: 'Who are you applying for?',
                                                sectionId: 'p-applicant-who-are-you-applying-for',
                                                theme: 'applicant-details',
                                                value: 'myself',
                                                valueLabel: 'Myself'
                                            },
                                            {
                                                id: 'applicant-name',
                                                type: 'composite',
                                                label: 'Your name',
                                                values: [
                                                    {
                                                        id: 'q-applicant-title',
                                                        type: 'simple',
                                                        label: 'Title',
                                                        value: 'Mr',
                                                        sectionId: 'p-applicant-enter-your-name',
                                                        theme: 'applicant-details'
                                                    },
                                                    {
                                                        id: 'q-applicant-first-name',
                                                        type: 'simple',
                                                        label: 'First name',
                                                        value: 'Foo',
                                                        sectionId: 'p-applicant-enter-your-name',
                                                        theme: 'applicant-details'
                                                    },
                                                    {
                                                        id: 'q-applicant-last-name',
                                                        type: 'simple',
                                                        label: 'Last name',
                                                        value: 'Bar',
                                                        sectionId: 'p-applicant-enter-your-name',
                                                        theme: 'applicant-details'
                                                    }
                                                ],
                                                sectionId: 'p-applicant-enter-your-name',
                                                theme: 'applicant-details'
                                            },
                                            {
                                                id: 'q-applicant-british-citizen-or-eu-national',
                                                type: 'simple',
                                                label:
                                                    'Mr Foo Bar, are you a British citizen or EU national?',
                                                value: true,
                                                valueLabel: 'Yes',
                                                sectionId:
                                                    'p-applicant-british-citizen-or-eu-national',
                                                theme: 'applicant-details'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'theme',
                                        id: 'contact-details',
                                        title: 'Contact details',
                                        values: [
                                            {
                                                id: 'q-applicant-enter-your-email-address',
                                                type: 'simple',
                                                label: 'Enter your email address',
                                                value:
                                                    'bar@9f7b855e-586b-49f0-ac7a-026919732b06.gov.uk',
                                                sectionId: 'p-applicant-enter-your-email-address',
                                                theme: 'contact-details',
                                                format: {
                                                    value: 'email'
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        type: 'theme',
                                        id: 'default',
                                        title: 'Answers',
                                        values: [
                                            {
                                                id: 'q-applicant-theme-undefined',
                                                type: 'simple',
                                                label: 'Enter your fav colour',
                                                value: 'red',
                                                sectionId: 'p-applicant-theme-undefined'
                                            },
                                            {
                                                id: 'q-applicant-theme-not-found',
                                                type: 'simple',
                                                label: 'Enter your fav colour',
                                                value: 'blue',
                                                sectionId: 'p-applicant-theme-not-found',
                                                theme: 'this-theme-is-not-found'
                                            }
                                        ]
                                    }
                                ],
                                lookup: {
                                    existingStuff: 'bar'
                                }
                            }
                        }
                    }
                }
            });
        });
    });
});

import { createLogger } from '../utils/logger.js';

export class MetadataMigrator {
    constructor(sourceDb, targetDb, mappingConfig) {
        this.sourceDb = sourceDb;
        this.targetDb = targetDb;
        this.mappingConfig = mappingConfig;
        this.logger = createLogger();
    }

    async migrate() {
        await this.migrateLocations();
        await this.migrateEncounterTypes();
        await this.migrateVisitTypes();
        await this.migrateConcepts();
        await this.migrateForms();
        await this.migratePrograms();
    }

    async migrateLocations() {
        const locations = await this.sourceDb.query('SELECT * FROM location WHERE retired = 0');
        for (const location of locations) {
            await this.targetDb.query(
                'INSERT IGNORE INTO location SET ?',
                { ...location, date_created: new Date() }
            );
        }
    }

    async migrateConcepts() {
        // Migrate concept dictionary
        const concepts = await this.sourceDb.query(`
            SELECT * FROM concept c 
            JOIN concept_name cn ON c.concept_id = cn.concept_id 
            WHERE cn.locale = 'en' AND cn.concept_name_type = 'FULLY_SPECIFIED'
        `);

        for (const concept of concepts) {
            const mappedConceptId = this.mappingConfig.concepts[concept.concept_id];
            if (mappedConceptId) {
                concept.concept_id = mappedConceptId;
            }
            await this.targetDb.query('INSERT IGNORE INTO concept SET ?', concept);
        }
    }

    async migrateForms() {
        const forms = await this.sourceDb.query('SELECT * FROM form WHERE retired = 0');
        for (const form of forms) {
            const mappedFormId = this.mappingConfig.forms[form.form_id];
            if (mappedFormId) {
                form.form_id = mappedFormId;
            }
            await this.targetDb.query('INSERT IGNORE INTO form SET ?', form);
        }
    }

    // Additional metadata migration methods...
}
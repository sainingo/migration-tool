import { createLogger } from '../utils/logger.js';

export class EncounterMigrator {
    constructor(sourceDb, targetDb, mappingConfig) {
        this.sourceDb = sourceDb;
        this.targetDb = targetDb;
        this.mappingConfig = mappingConfig;
        this.logger = createLogger();
    }

    async migratePatientEncounters(patientId) {
        const encounters = await this.sourceDb.query(
            'SELECT * FROM encounter WHERE patient_id = ? ORDER BY encounter_datetime',
            [patientId]
        );

        for (const encounter of encounters) {
            await this.migrateEncounter(encounter);
        }
    }

    async migrateEncounter(encounter) {
        // Map encounter type if needed
        const mappedEncounterType = this.mappingConfig.encounterTypes[encounter.encounter_type];
        if (mappedEncounterType) {
            encounter.encounter_type = mappedEncounterType;
        }

        // Map form if needed
        const mappedForm = this.mappingConfig.forms[encounter.form_id];
        if (mappedForm) {
            encounter.form_id = mappedForm;
        }

        // Insert encounter
        const result = await this.targetDb.query('INSERT IGNORE INTO encounter SET ?', encounter);
        const newEncounterId = result.insertId;

        // Migrate encounter providers
        await this.migrateEncounterProviders(encounter.encounter_id, newEncounterId);

        // Migrate observations
        await this.migrateObservations(encounter.encounter_id, newEncounterId);
    }

    async migrateEncounterProviders(sourceEncounterId, targetEncounterId) {
        const providers = await this.sourceDb.query(
            'SELECT * FROM encounter_provider WHERE encounter_id = ?',
            [sourceEncounterId]
        );

        for (const provider of providers) {
            provider.encounter_id = targetEncounterId;
            await this.targetDb.query('INSERT IGNORE INTO encounter_provider SET ?', provider);
        }
    }

    async migrateObservations(sourceEncounterId, targetEncounterId) {
        const observations = await this.sourceDb.query(
            'SELECT * FROM obs WHERE encounter_id = ? ORDER BY obs_id',
            [sourceEncounterId]
        );

        for (const obs of observations) {
            // Map concept if needed
            const mappedConcept = this.mappingConfig.concepts[obs.concept_id];
            if (mappedConcept) {
                obs.concept_id = mappedConcept;
            }

            obs.encounter_id = targetEncounterId;
            await this.targetDb.query('INSERT IGNORE INTO obs SET ?', obs);
        }
    }
}
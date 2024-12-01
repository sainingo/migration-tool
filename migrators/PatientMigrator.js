import { createLogger } from '../utils/logger.js';

export class PatientMigrator {
    constructor(sourceDb, targetDb, mappingConfig) {
        this.sourceDb = sourceDb;
        this.targetDb = targetDb;
        this.mappingConfig = mappingConfig;
        this.logger = createLogger();
    }

    async migratePatient(patientId) {
        // Migrate person data first
        await this.migratePersonData(patientId);
        
        // Migrate patient-specific data
        const patientData = await this.sourceDb.query(
            'SELECT * FROM patient WHERE patient_id = ?',
            [patientId]
        );

        if (patientData.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }

        await this.targetDb.query('INSERT IGNORE INTO patient SET ?', patientData[0]);

        // Migrate patient identifiers
        await this.migratePatientIdentifiers(patientId);
    }

    async migratePersonData(personId) {
        // Migrate person
        const personData = await this.sourceDb.query(
            'SELECT * FROM person WHERE person_id = ?',
            [personId]
        );

        await this.targetDb.query('INSERT IGNORE INTO person SET ?', personData[0]);

        // Migrate person names
        const names = await this.sourceDb.query(
            'SELECT * FROM person_name WHERE person_id = ?',
            [personId]
        );

        for (const name of names) {
            await this.targetDb.query('INSERT IGNORE INTO person_name SET ?', name);
        }

        // Migrate person addresses
        const addresses = await this.sourceDb.query(
            'SELECT * FROM person_address WHERE person_id = ?',
            [personId]
        );

        for (const address of addresses) {
            await this.targetDb.query('INSERT IGNORE INTO person_address SET ?', address);
        }

        // Migrate person attributes
        const attributes = await this.sourceDb.query(
            'SELECT * FROM person_attribute WHERE person_id = ?',
            [personId]
        );

        for (const attribute of attributes) {
            await this.targetDb.query('INSERT IGNORE INTO person_attribute SET ?', attribute);
        }
    }

    async migratePatientIdentifiers(patientId) {
        const identifiers = await this.sourceDb.query(
            'SELECT * FROM patient_identifier WHERE patient_id = ?',
            [patientId]
        );

        for (const identifier of identifiers) {
            const mappedIdentifierType = this.mappingConfig.identifierTypes[identifier.identifier_type];
            if (mappedIdentifierType) {
                identifier.identifier_type = mappedIdentifierType;
            }
            await this.targetDb.query('INSERT IGNORE INTO patient_identifier SET ?', identifier);
        }
    }
}
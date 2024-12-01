import { createLogger } from '../utils/logger.js';
import { UserMigrator } from '../migrators/UserMigrator.js';
import { PatientMigrator } from '../migrators/PatientMigrator.js';
import { VisitMigrator } from '../migrators/VisitMigrator.js';
import { EncounterMigrator } from '../migrators/EncounterMigrator.js';
import { MetadataMigrator } from '../migrators/MetadataMigrator.js';

export class MigrationManager {
    constructor(sourceDb, targetDb, mappingConfig) {
        this.sourceDb = sourceDb;
        this.targetDb = targetDb;
        this.mappingConfig = mappingConfig;
        this.logger = createLogger();
        
        this.metadataMigrator = new MetadataMigrator(sourceDb, targetDb, mappingConfig);
        this.userMigrator = new UserMigrator(sourceDb, targetDb, mappingConfig);
        this.patientMigrator = new PatientMigrator(sourceDb, targetDb, mappingConfig);
        this.visitMigrator = new VisitMigrator(sourceDb, targetDb, mappingConfig);
        this.encounterMigrator = new EncounterMigrator(sourceDb, targetDb, mappingConfig);
    }

    
    async migrate() {
        try {
            // Step 1: Migrate metadata
            await this.metadataMigrator.migrate();

            // Step 2: Migrate users
            await this.userMigrator.migrate();

            // Step 3: Migrate patients and related data
            const patients = await this.sourceDb.query(
                'SELECT patient_id FROM patient ORDER BY patient_id'
            );

            for (const patient of patients) {
                await this.migratePatientData(patient.patient_id);
            }
        } catch (error) {
            this.logger.error('Migration failed:', error);
            throw error;
        }
    }

    async migratePatientData(patientId) {
        this.logger.info(`Migrating data for patient ${patientId}`);
        
        await this.targetDb.beginTransaction();
        try {
            // Migrate patient core data
            await this.patientMigrator.migratePatient(patientId);

            // Migrate visits and encounters
            await this.visitMigrator.migratePatientVisits(patientId);
            await this.encounterMigrator.migratePatientEncounters(patientId);

            await this.targetDb.commit();
        } catch (error) {
            await this.targetDb.rollback();
            throw error;
        }
    }
}
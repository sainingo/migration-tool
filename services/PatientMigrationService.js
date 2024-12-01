import { createLogger } from '../utils/logger.js';
import { PersonService } from './PersonService.js';
import { VisitService } from './VisitService.js';
import { EncounterService } from './EncounterService.js';
import { IdMappingService } from './IdMappingService.js';

export class PatientMigrationService {
    constructor(sourcePool, targetPool) {
        this.sourcePool = sourcePool;
        this.targetPool = targetPool;
        this.logger = createLogger();
        
        this.idMappingService = new IdMappingService();
        this.personService = new PersonService(sourcePool, targetPool, this.idMappingService);
        this.visitService = new VisitService(sourcePool, targetPool, this.idMappingService);
        this.encounterService = new EncounterService(sourcePool, targetPool, this.idMappingService);
    }

    async migratePatient(patientId) {
        const connection = await this.targetPool.beginTransaction();
        
        try {
            this.logger.info(`Starting migration for patient ${patientId}`);
            this.idMappingService.clear(); // Clear previous mappings

            // Step 1: Migrate person data
            const newPersonId = await this.personService.migratePerson(patientId, connection);

            // Step 2: Migrate patient-specific data
            await this.migratePatientData(patientId, newPersonId, connection);

            // Step 3: Migrate visits and encounters
            await this.visitService.migratePatientVisits(patientId, connection);
            await this.encounterService.migratePatientEncounters(patientId, connection);

            await connection.commit();
            this.logger.info(`Successfully migrated patient ${patientId}`);
        } catch (error) {
            await connection.rollback();
            this.logger.error(`Failed to migrate patient ${patientId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async migratePatientData(sourcePatientId, targetPersonId, connection) {
        const [patientData] = await this.sourcePool.query(
            'SELECT * FROM patient WHERE patient_id = ?',
            [sourcePatientId]
        );

        if (!patientData) {
            throw new Error(`Patient ${sourcePatientId} not found`);
        }

        patientData.patient_id = targetPersonId;
        
        const result = await connection.execute(
            'INSERT INTO patient SET ?',
            [patientData]
        );

        this.idMappingService.addMapping('patient', sourcePatientId, targetPersonId);
        await this.migratePatientIdentifiers(sourcePatientId, targetPersonId, connection);
    }

    async migratePatientIdentifiers(sourcePatientId, targetPatientId, connection) {
        const identifiers = await this.sourcePool.query(
            'SELECT * FROM patient_identifier WHERE patient_id = ?',
            [sourcePatientId]
        );

        for (const identifier of identifiers) {
            identifier.patient_id = targetPatientId;
            await connection.execute(
                'INSERT INTO patient_identifier SET ?',
                [identifier]
            );
        }
    }
}
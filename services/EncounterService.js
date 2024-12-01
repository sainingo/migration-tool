import { createLogger } from '../utils/logger.js';

export class EncounterService {
    constructor(sourcePool, targetPool, idMappingService) {
        this.sourcePool = sourcePool;
        this.targetPool = targetPool;
        this.idMappingService = idMappingService;
        this.logger = createLogger();
    }

    async migratePatientEncounters(patientId, connection) {
        const encounters = await this.sourcePool.query(
            'SELECT * FROM encounter WHERE patient_id = ? ORDER BY encounter_datetime',
            [patientId]
        );

        for (const encounter of encounters) {
            await this.migrateEncounter(encounter, connection);
        }
    }

    async migrateEncounter(encounter, connection) {
        const targetPatientId = this.idMappingService.getTargetId('patient', encounter.patient_id);
        encounter.patient_id = targetPatientId;

        if (encounter.visit_id) {
            encounter.visit_id = this.idMappingService.getTargetId('visit', encounter.visit_id);
        }

        const result = await connection.execute(
            'INSERT INTO encounter SET ?',
            [encounter]
        );

        const newEncounterId = result[0].insertId;
        this.idMappingService.addMapping('encounter', encounter.encounter_id, newEncounterId);
        
        await this.migrateEncounterProviders(encounter.encounter_id, newEncounterId, connection);
        await this.migrateObservations(encounter.encounter_id, newEncounterId, connection);
    }

    async migrateEncounterProviders(sourceEncounterId, targetEncounterId, connection) {
        const providers = await this.sourcePool.query(
            'SELECT * FROM encounter_provider WHERE encounter_id = ?',
            [sourceEncounterId]
        );

        for (const provider of providers) {
            provider.encounter_id = targetEncounterId;
            await connection.execute(
                'INSERT INTO encounter_provider SET ?',
                [provider]
            );
        }
    }

    async migrateObservations(sourceEncounterId, targetEncounterId, connection) {
        const observations = await this.sourcePool.query(
            'SELECT * FROM obs WHERE encounter_id = ? ORDER BY obs_id',
            [sourceEncounterId]
        );

        for (const obs of observations) {
            obs.encounter_id = targetEncounterId;
            obs.person_id = this.idMappingService.getTargetId('person', obs.person_id);
            await connection.execute(
                'INSERT INTO obs SET ?',
                [obs]
            );
        }
    }
}
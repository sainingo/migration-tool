import { createLogger } from '../utils/logger.js';

export class VisitMigrator {
    constructor(sourceDb, targetDb, mappingConfig) {
        this.sourceDb = sourceDb;
        this.targetDb = targetDb;
        this.mappingConfig = mappingConfig;
        this.logger = createLogger();
    }

    async migratePatientVisits(patientId) {
        const visits = await this.sourceDb.query(
            'SELECT * FROM visit WHERE patient_id = ? ORDER BY date_started',
            [patientId]
        );

        for (const visit of visits) {
            await this.migrateVisit(visit);
        }
    }

    async migrateVisit(visit) {
        // Map visit type if needed
        const mappedVisitType = this.mappingConfig.visitTypes[visit.visit_type_id];
        if (mappedVisitType) {
            visit.visit_type_id = mappedVisitType;
        }

        // Insert visit
        const result = await this.targetDb.query('INSERT IGNORE INTO visit SET ?', visit);
        const newVisitId = result.insertId;

        // Migrate visit attributes
        await this.migrateVisitAttributes(visit.visit_id, newVisitId);
    }

    async migrateVisitAttributes(sourceVisitId, targetVisitId) {
        const attributes = await this.sourceDb.query(
            'SELECT * FROM visit_attribute WHERE visit_id = ?',
            [sourceVisitId]
        );

        for (const attribute of attributes) {
            attribute.visit_id = targetVisitId;
            await this.targetDb.query('INSERT IGNORE INTO visit_attribute SET ?', attribute);
        }
    }
}
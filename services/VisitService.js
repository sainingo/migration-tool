import { createLogger } from '../utils/logger.js';

export class VisitService {
    constructor(sourcePool, targetPool, idMappingService) {
        this.sourcePool = sourcePool;
        this.targetPool = targetPool;
        this.idMappingService = idMappingService;
        this.logger = createLogger();
    }

    async migratePatientVisits(patientId, connection) {
        const visits = await this.sourcePool.query(
            'SELECT * FROM visit WHERE patient_id = ? ORDER BY date_created',
            [patientId]
        );

        for (const visit of visits) {
            await this.migrateVisit(visit, connection);
        }
    }

    async migrateVisit(visit, connection) {
        const targetPatientId = this.idMappingService.getTargetId('patient', visit.patient_id);
        visit.patient_id = targetPatientId;

        const result = await connection.execute(
            'INSERT INTO visit SET ?',
            [visit]
        );
        
        const newVisitId = result[0].insertId;
        this.idMappingService.addMapping('visit', visit.visit_id, newVisitId);
        await this.migrateVisitAttributes(visit.visit_id, newVisitId, connection);
    }

    async migrateVisitAttributes(sourceVisitId, targetVisitId, connection) {
        const attributes = await this.sourcePool.query(
            'SELECT * FROM visit_attribute WHERE visit_id = ?',
            [sourceVisitId]
        );

        for (const attribute of attributes) {
            attribute.visit_id = targetVisitId;
            await connection.execute(
                'INSERT INTO visit_attribute SET ?',
                [attribute]
            );
        }
    }
}
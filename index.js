import { config } from 'dotenv';
import { createLogger } from './utils/logger.js';
import { DatabasePool } from './database/DatabasePool.js';
import { PatientMigrationService } from './services/PatientMigrationService.js';
import { createProgressBar } from './utils/progressBar.js';

config();
const logger = createLogger();

async function main() {
    let sourcePool;
    let targetPool;
    
    try {
        logger.info('Starting OpenMRS Patient Migration');

        // Initialize database pools
        sourcePool = new DatabasePool({
            host: process.env.SOURCE_DB_HOST,
            port: process.env.SOURCE_DB_PORT,
            user: process.env.SOURCE_DB_USER,
            password: process.env.SOURCE_DB_PASSWORD,
            database: process.env.SOURCE_DB_NAME
        });

        targetPool = new DatabasePool({
            host: process.env.TARGET_DB_HOST,
            port: process.env.TARGET_DB_PORT,
            user: process.env.TARGET_DB_USER,
            password: process.env.TARGET_DB_PASSWORD,
            database: process.env.TARGET_DB_NAME
        });

        await sourcePool.initialize();
        await targetPool.initialize();

        // Initialize migration service
        const migrationService = new PatientMigrationService(sourcePool, targetPool);

        // Get total number of patients
        const [{ count }] = await sourcePool.query(
            'SELECT COUNT(*) as count FROM patient'
        );

        // Create progress bar
        const progressBar = createProgressBar(count);

        // Get patients in batches
        const batchSize = parseInt(process.env.BATCH_SIZE) || 100;
        let processed = 0;

        while (processed < count) {
            const patients = await sourcePool.query(
                'SELECT patient_id FROM patient ORDER BY patient_id LIMIT ?, ?',
                [processed, batchSize]
            );

            for (const patient of patients) {
                try {
                    await migrationService.migratePatient(patient.patient_id);
                    progressBar.increment();
                } catch (error) {
                    logger.error(`Failed to migrate patient ${patient.patient_id}:`, error);
                }
            }

            processed += patients.length;
        }

        progressBar.stop();
        logger.info('Migration completed successfully');
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (sourcePool) await sourcePool.end();
        if (targetPool) await targetPool.end();
    }
}

main();
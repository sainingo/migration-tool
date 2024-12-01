import mysql from 'mysql2/promise';
import { createLogger } from '../utils/logger.js';

export class DatabaseConnection {
    constructor(config) {
        this.config = config;
        this.logger = createLogger();
        this.connection = null;
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            this.logger.info(`Connected to database ${this.config.database}`);
        } catch (error) {
            this.logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async query(sql, values = []) {
        try {
            const [results] = await this.connection.execute(sql, values);
            return results;
        } catch (error) {
            this.logger.error('Query execution failed:', error);
            throw error;
        }
    }

    async beginTransaction() {
        await this.connection.beginTransaction();
    }

    async commit() {
        await this.connection.commit();
    }

    async rollback() {
        await this.connection.rollback();
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
        }
    }
}
import mysql from 'mysql2/promise';
import { createLogger } from '../utils/logger.js';

export class DatabasePool {
    constructor(config) {
        this.config = {
            ...config,
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0
        };
        this.logger = createLogger();
        this.pool = null;
    }

    async initialize() {
        try {
            this.pool = mysql.createPool(this.config);
            this.logger.info(`Connection pool created for database ${this.config.database}`);
            
            // Verify connection
            const connection = await this.pool.getConnection();
            connection.release();
        } catch (error) {
            this.logger.error('Failed to initialize connection pool:', error);
            throw error;
        }
    }

    async getConnection() {
        try {
            return await this.pool.getConnection();
        } catch (error) {
            this.logger.error('Failed to get connection from pool:', error);
            throw error;
        }
    }

    async query(sql, values = []) {
        const connection = await this.getConnection();
        try {
            const [results] = await connection.execute(sql, values);
            return results;
        } catch (error) {
            this.logger.error('Query execution failed:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async beginTransaction() {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            return connection;
        } catch (error) {
            connection.release();
            throw error;
        }
    }

    async end() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}
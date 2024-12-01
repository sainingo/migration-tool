import fs from 'fs/promises';
import yaml from 'yaml';
import { createLogger } from './logger.js';

const logger = createLogger();

export async function loadMappingConfig() {
    try {
        const configFile = await fs.readFile('config/mappings.yml', 'utf8');
        return yaml.parse(configFile);
    } catch (error) {
        logger.error('Failed to load mapping configuration:', error);
        throw error;
    }
}
import { createLogger } from '../utils/logger.js';

export class PersonService {
    constructor(sourcePool, targetPool, idMappingService) {
        this.sourcePool = sourcePool;
        this.targetPool = targetPool;
        this.idMappingService = idMappingService;
        this.logger = createLogger();
    }

    async migratePerson(personId, connection) {
        // Migrate core person data
        const [personData] = await this.sourcePool.query(
            'SELECT * FROM person WHERE person_id = ?',
            [personId]
        );

        if (!personData) {
            throw new Error(`Person ${personId} not found`);
        }

        const result = await connection.execute(
            'INSERT INTO person SET ?',
            [personData]
        );

        const newPersonId = result[0].insertId;
        this.idMappingService.addMapping('person', personId, newPersonId);

        // Migrate related person data
        await this.migratePersonNames(personId, newPersonId, connection);
        await this.migratePersonAddresses(personId, newPersonId, connection);
        await this.migratePersonAttributes(personId, newPersonId, connection);

        return newPersonId;
    }

    async migratePersonNames(sourcePersonId, targetPersonId, connection) {
        const names = await this.sourcePool.query(
            'SELECT * FROM person_name WHERE person_id = ?',
            [sourcePersonId]
        );

        for (const name of names) {
            name.person_id = targetPersonId;
            await connection.execute(
                'INSERT INTO person_name SET ?',
                [name]
            );
        }
    }

    async migratePersonAddresses(sourcePersonId, targetPersonId, connection) {
        const addresses = await this.sourcePool.query(
            'SELECT * FROM person_address WHERE person_id = ?',
            [sourcePersonId]
        );

        for (const address of addresses) {
            address.person_id = targetPersonId;
            await connection.execute(
                'INSERT INTO person_address SET ?',
                [address]
            );
        }
    }

    async migratePersonAttributes(sourcePersonId, targetPersonId, connection) {
        const attributes = await this.sourcePool.query(
            'SELECT * FROM person_attribute WHERE person_id = ?',
            [sourcePersonId]
        );

        for (const attribute of attributes) {
            attribute.person_id = targetPersonId;
            await connection.execute(
                'INSERT INTO person_attribute SET ?',
                [attribute]
            );
        }
    }
}
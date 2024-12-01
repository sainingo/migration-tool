# OpenMRS Migration Tool

A comprehensive tool for migrating data between OpenMRS instances while handling differences in metadata, concepts, and programs.

## Features

- Horizontal migration (patient by patient)
- Complete data migration including:
  - Users and roles
  - Patients and related data
  - Visits and encounters
  - Observations
  - Programs and workflows
- Configurable mappings for different metadata elements
- Transaction support for data integrity
- Detailed logging
- Error handling and rollback support

## Prerequisites

- Node.js 16 or higher
- Access to source and target OpenMRS databases
- MySQL/MariaDB

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your database connections

## Configuration

1. Update `config/mappings.yml` with your specific mappings for:
   - Concepts
   - Encounter types
   - Forms
   - Visit types
   - Programs
   - Identifier types

## Usage

1. Configure your database connections in `.env`
2. Update mappings in `config/mappings.yml`
3. Run the migration:
   ```bash
   npm start
   ```

## Logging

Logs are written to:
- Console (for immediate feedback)
- `migration.log` file (for detailed debugging)

## Error Handling

- Each patient's data is migrated in a transaction
- If an error occurs, the transaction is rolled back
- Detailed error logs are available in `migration.log`

## Best Practices

1. Always backup both databases before migration
2. Test with a small subset of patients first
3. Verify mappings before full migration
4. Monitor the logs during migration
5. Validate data after migration

## Common Issues

1. Different concept dictionaries:
   - Update concept mappings in `config/mappings.yml`
   - Example:
     ```yaml
     concepts:
       5096: 5097  # Weight concept has different ID
     ```

2. Different form versions:
   - Update form mappings
   - Verify form schemas match

3. Missing programs:
   - Add program mappings
   - Skip if program doesn't exist in target

## License

MIT
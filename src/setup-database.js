const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Setup database schema
 */
async function setupDatabase() {
    try {
        console.log('Setting up database schema...\n');

        // Read SQL file
        const sqlPath = path.join(__dirname, '../config/database.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute SQL
        await pool.query(sql);

        console.log('✓ Database schema created successfully!');
        console.log('✓ Tables: profiles, email_captures, benchmarks, top_performers');
        console.log('✓ Indexes created for performance\n');

        // Test connection
        const result = await pool.query('SELECT NOW()');
        console.log('✓ Database connection test passed');
        console.log(`  Current time: ${result.rows[0].now}\n`);

        process.exit(0);

    } catch (error) {
        console.error('✗ Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();

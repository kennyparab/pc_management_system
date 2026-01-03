
const dotenv = require('dotenv');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Use DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create tables function
async function createTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(50) NOT NULL,
                position VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create computers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS computers (
                id SERIAL PRIMARY KEY,
                hostname VARCHAR(50) UNIQUE NOT NULL,
                brand VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                cpu VARCHAR(100) NOT NULL,
                ram INTEGER NOT NULL,
                storage INTEGER NOT NULL,
                os VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'Active',
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create maintenance_logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS maintenance_logs (
                id SERIAL PRIMARY KEY,
                computer_id INTEGER REFERENCES computers(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                technician VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'Scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('COMMIT');
        console.log('Tables created successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
    } finally {
        client.release();
    }
}

// Initialize database on server start


// ==================== USERS ROUTES ====================

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, department, position } = req.body;
        const result = await pool.query(
            'INSERT INTO users (name, email, department, position) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, department, position]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, department, position } = req.body;
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, department = $3, position = $4 WHERE id = $5 RETURNING *',
            [name, email, department, position, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== COMPUTERS ROUTES ====================

// Get all computers
app.get('/api/computers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM computers ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single computer
app.get('/api/computers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM computers WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Computer not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create computer
app.post('/api/computers', async (req, res) => {
    try {
        const { hostname, brand, model, cpu, ram, storage, os, status, user_id } = req.body;
        const result = await pool.query(
            'INSERT INTO computers (hostname, brand, model, cpu, ram, storage, os, status, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [hostname, brand, model, cpu, ram, storage, os, status || 'Active', user_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update computer
app.put('/api/computers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hostname, brand, model, cpu, ram, storage, os, status, user_id } = req.body;
        const result = await pool.query(
            'UPDATE computers SET hostname = $1, brand = $2, model = $3, cpu = $4, ram = $5, storage = $6, os = $7, status = $8, user_id = $9 WHERE id = $10 RETURNING *',
            [hostname, brand, model, cpu, ram, storage, os, status, user_id || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Computer not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete computer
app.delete('/api/computers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM computers WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Computer not found' });
        }
        res.json({ message: 'Computer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MAINTENANCE LOGS ROUTES ====================

// Get all maintenance logs with computer hostname
app.get('/api/maintenance', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, c.hostname as computer_hostname 
            FROM maintenance_logs m 
            LEFT JOIN computers c ON m.computer_id = c.id 
            ORDER BY m.date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single maintenance log
app.get('/api/maintenance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM maintenance_logs WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Maintenance log not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create maintenance log
app.post('/api/maintenance', async (req, res) => {
    try {
        const { computer_id, date, type, description, technician, status } = req.body;
        const result = await pool.query(
            'INSERT INTO maintenance_logs (computer_id, date, type, description, technician, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [computer_id, date, type, description, technician, status || 'Scheduled']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update maintenance log
app.put('/api/maintenance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { computer_id, date, type, description, technician, status } = req.body;
        const result = await pool.query(
            'UPDATE maintenance_logs SET computer_id = $1, date = $2, type = $3, description = $4, technician = $5, status = $6 WHERE id = $7 RETURNING *',
            [computer_id, date, type, description, technician, status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Maintenance log not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete maintenance log
app.delete('/api/maintenance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM maintenance_logs WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Maintenance log not found' });
        }
        res.json({ message: 'Maintenance log deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTE ====================
// Get total counts for dashboard
app.get('/api/stats', async (req, res) => {
    try {
        const computers = await pool.query('SELECT COUNT(*) FROM computers');
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const maintenance = await pool.query('SELECT COUNT(*) FROM maintenance_logs');

        res.json({
            computers: parseInt(computers.rows[0].count),
            users: parseInt(users.rows[0].count),
            maintenance: parseInt(maintenance.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve the HTML file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Start server
async function startServer() {
    try {
        console.log('--- System Startup ---');
        
        // Test DB connection before trying to create tables
        const client = await pool.connect();
        console.log(' Connected to Database');
        client.release();

        await createTables();
        console.log(' Schema check complete');

        // Explicitly bind to 0.0.0.0 (required by many container providers)
        const server = app.listen(port, () => {
            console.log(` SERVER IS FULLY LIVE`);
            
        });

        // This prevents the process from exiting if a request fails
        server.on('error', (err) => {
            console.error(' SERVER ERROR:', err);
        });

    } catch (err) {
        console.error(' FATAL STARTUP ERROR:', err.message);
        console.error(err.stack);
        // Delay exit so you can actually read the log in the container console
        setTimeout(() => process.exit(1), 5000);
    }
}

startServer();
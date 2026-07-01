const express = require('express');
const router = express.Router();
const Location = require('../models/location'); // Sequelize model for location
const User = require('../models/user'); // Sequelize model for user
const moment = require('moment'); // Used for handling timestamps

// Assuming you are using Sequelize for querying the database
router.post('/new_location_add', async (req, res) => {
    const { vehicleId, latitude, longitude, timestamp } = req.body;

    // Check if required fields are provided
    if (!vehicleId || !latitude || !longitude || !timestamp) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    try {
        // Insert location data into the location_histories table using Sequelize
        const newLocation = await Location.create({
            vehicleId,
            latitude,
            longitude,
            timestamp,
            createdAt: moment().format('YYYY-MM-DD HH:mm:ss'), // createdAt
            updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')  // updatedAt
        });

        res.status(200).send({ message: 'Location saved successfully', data: newLocation });
    } catch (err) {
        console.error('Error saving location:', err);
        res.status(500).send({ error: 'Error saving location' });
    }
});

// Get All Locations with associated User
router.get('/locations', async (req, res) => {
    try {
        // Fetch all locations and include user information (using Sequelize associations)
        const locations = await Location.findAll({
            include: {
                model: User,
                as: 'user', // BUG FIX: must match the alias defined in LocationHistory.belongsTo(User, { as: 'user' }) in models/location.js
                attributes: ['vehicleId', 'vehicleType'], // Adjust attributes as needed
            },
        });

        res.status(200).json({ locations });
    } catch (err) {
        console.error('Error fetching locations:', err);
        res.status(500).json({ error: err.message });
    }
});

// NEW: Location history + latest position for a single vehicle.
// Powers the Citizen Tracker map screen (marker + polyline) and ETA calc.
// GET /api/locations/vehicle/:vehicleId?limit=50
router.get('/vehicle/:vehicleId', async (req, res) => {
    const { vehicleId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    try {
        const user = await User.findOne({
            where: { vehicleId },
            attributes: ['vehicleId', 'vehicleType', 'username'],
        });

        if (!user) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Most recent N points, newest first
        const recent = await Location.findAll({
            where: { vehicleId },
            order: [['timestamp', 'DESC']],
            limit,
        });

        res.status(200).json({
            vehicle: user,
            latest: recent[0] || null,
            history: recent.reverse(), // oldest -> newest, ready to feed straight into a Polyline
        });
    } catch (err) {
        console.error('Error fetching vehicle history:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
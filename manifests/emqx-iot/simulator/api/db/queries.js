export function createTelemetryRepository({ db }) {
    return {
        async persistBronzeEvent(event) {
            const payload = event.payload || {};

            await db.query(
                `INSERT INTO bronze.events_raw (
                source_topic, event_type, device_id, zone_id, event_ts, payload
                ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
                [
                event.topic,
                event.type,
                payload.deviceId || payload.zoneId || null,
                payload.zoneId || payload.deviceId || null,
                event.receivedAt,
                JSON.stringify(payload),
                ]
            );
        },

        async persistBronzeTelemetry(topic, normalized) {
            await db.query(
                `INSERT INTO bronze.telemetry_raw (
                source_topic, message_type, device_id, zone_id, event_ts, payload
                ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
                [
                topic,
                "telemetry",
                normalized.deviceId,
                normalized.zoneId,
                normalized.ts,
                JSON.stringify(normalized),
                ]
            );
        },

        async upsertDeviceState(device) {
            await db.query(
                `INSERT INTO silver.device_state_latest (
                device_id, zone_id, last_topic, last_seen, state
                )
                VALUES ($1, $2, $3, $4, $5::jsonb)
                ON CONFLICT (device_id) DO UPDATE SET
                zone_id = EXCLUDED.zone_id,
                last_topic = EXCLUDED.last_topic,
                last_seen = EXCLUDED.last_seen,
                state = EXCLUDED.state`,
                [
                device.deviceId,
                device.zoneId,
                device.lastTopic || null,
                device.lastSeen,
                JSON.stringify(device),
                ]
            );
        },

        async loadDeviceStates() {
            const { rows } = await db.query(`
                SELECT device_id, state
                FROM silver.device_state_latest
                ORDER BY last_seen DESC
            `);

            return new Map(rows.map((row) => [row.device_id, row.state]));
            },

            async recentEvents(limit) {
            const { rows } = await db.query(
                `SELECT source_topic AS topic, event_type AS type, event_ts AS "receivedAt", payload
                FROM bronze.events_raw
                ORDER BY event_ts DESC, ingest_id DESC
                LIMIT $1`,
                [limit]
            );
            return rows;
        },

        async telemetryHistory(deviceId, limit) {
            const { rows } = await db.query(
                `SELECT
                ts,
                scenario,
                severity,
                temperature,
                humidity,
                co2,
                par,
                pressure,
                dew_point AS "dewPoint",
                vpd,
                soil_moisture AS "soilMoisture",
                soil_temperature AS "soilTemperature",
                tank_level AS "tankLevel",
                irrigation_flow AS "irrigationFlow"
                FROM silver.telemetry
                WHERE device_id = $1
                ORDER BY ts DESC
                LIMIT $2`,
                [deviceId, limit]
            );

            return rows.reverse();
        },

        async loadRecentAlerts(limit) {
            const { rows } = await db.query(
                `SELECT source_topic AS topic, 'alerts' AS type, event_ts AS "receivedAt", payload
                FROM silver.alerts
                ORDER BY event_ts DESC
                LIMIT $1`,
                [limit]
            );
            return rows;
        },

        async loadGoldFleetSummary() {
            const { rows } = await db.query(`SELECT * FROM gold.fleet_summary_latest`);
            return rows[0] || null;
        },

        async loadGoldZoneHealth() {
            const { rows } = await db.query(`
                SELECT * FROM gold.zone_health_latest ORDER BY zone_id ASC
            `);
            return rows;
        },

        async loadGoldAlertCounts(limit) {
            const { rows } = await db.query(
                `SELECT bucket, zone_id, severity, alert_count
                FROM gold.alert_counts_1h
                ORDER BY bucket DESC, zone_id ASC, severity ASC
                LIMIT $1`,
                [limit]
            );
            return rows;
        },

        async loadGoldZoneMetrics(limit) {
            const { rows } = await db.query(
                `SELECT
                bucket,
                zone_id,
                avg_temperature,
                min_temperature,
                max_temperature,
                avg_humidity,
                avg_co2,
                avg_vpd,
                avg_soil_moisture,
                avg_irrigation_flow,
                sample_count
                FROM gold.zone_metrics_5m
                ORDER BY bucket DESC, zone_id ASC
                LIMIT $1`,
                [limit]
            );
            return rows;
        },
    }
}
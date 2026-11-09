-- ============================================================================
-- UIU Shuttle Tracker System - Production PostgreSQL Schema & Seed Data
-- Database: PostgreSQL (Compatible with Neon.tech, Supabase, Local Docker, AWS RDS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. App Users (Admin, Driver, Student)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  university_id VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_university_id ON app_users (university_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);
CREATE INDEX IF NOT EXISTS idx_app_users_role_status ON app_users (role, status);

-- ----------------------------------------------------------------------------
-- 2. Shuttle Routes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  origin_name VARCHAR(255) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_routes_route_number_uq ON routes (route_number);
CREATE INDEX IF NOT EXISTS idx_routes_active_number ON routes (is_active, route_number);

-- ----------------------------------------------------------------------------
-- 3. Route Schedules (Departure Timetable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'return')),
  departure_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_route_time ON schedules (route_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_schedules_direction ON schedules (direction, departure_time);

-- ----------------------------------------------------------------------------
-- 4. Service / Emergency Contacts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  description TEXT,
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_contacts_label_uq ON service_contacts (label);
CREATE INDEX IF NOT EXISTS idx_service_contacts_active_order ON service_contacts (is_active, display_order);

-- ----------------------------------------------------------------------------
-- 5. Fleet Buses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  capacity INT NOT NULL DEFAULT 40,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buses_active ON buses (is_active);

-- ----------------------------------------------------------------------------
-- 6. Trips (Active & Historical Journeys)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'return')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trips_status_driver ON trips (status, driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status_bus ON trips (status, bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_status ON trips (route_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_started_at ON trips (started_at DESC);

-- ----------------------------------------------------------------------------
-- 7. Trip Live GPS Locations (High-Frequency Streaming)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_recorded ON trip_locations (trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_time ON trip_locations (trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_locations_recorded_at ON trip_locations (recorded_at);

-- ----------------------------------------------------------------------------
-- 8. Bus Occupancy Events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS occupancy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'adjusted',
  passenger_count INT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_occupancy_events_trip ON occupancy_events (trip_id);

-- ----------------------------------------------------------------------------
-- 9. Student / User Live Locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_locations_user_recorded_idx ON user_locations (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_recorded_at ON user_locations (recorded_at);

-- ============================================================================
-- Seed Initial Data (Idempotent: Safe to re-run anytime)
-- Default password: password123 (bcrypt: $2b$10$S7yUF96GH0gAPs1OnmEL.OjKBKUMQN4Ug.UotNKl9yUbZ0Myp3NKu)
-- ============================================================================

-- 1. App Users
INSERT INTO app_users (role, full_name, email, university_id, password_hash, phone, status)
VALUES
  ('admin', 'UIU Shuttle Admin', 'admin@uiu.ac.bd', 'admin', '$2b$10$S7yUF96GH0gAPs1OnmEL.OjKBKUMQN4Ug.UotNKl9yUbZ0Myp3NKu', '01700000000', 'active'),
  ('driver', 'Md. Rahim Ali (Driver)', 'driver1@uiu.ac.bd', 'DRV001', '$2b$10$S7yUF96GH0gAPs1OnmEL.OjKBKUMQN4Ug.UotNKl9yUbZ0Myp3NKu', '01711111111', 'active'),
  ('student', 'Tanvir Hasan', 'tanvir@bscse.uiu.ac.bd', '011211001', '$2b$10$S7yUF96GH0gAPs1OnmEL.OjKBKUMQN4Ug.UotNKl9yUbZ0Myp3NKu', '01722222222', 'active')
ON CONFLICT (university_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status;

-- 2. Shuttle Routes
INSERT INTO routes (route_number, name, origin_name, destination_name, is_active)
VALUES
  (1, 'Route 1 - Dhanmondi to UIU', 'Dhanmondi (Sobhanbag)', 'UIU Campus (Madani Ave)', TRUE),
  (2, 'Route 2 - Mirpur to UIU', 'Mirpur 10', 'UIU Campus (Madani Ave)', TRUE),
  (3, 'Route 3 - Uttara to UIU', 'Uttara (House Building)', 'UIU Campus (Madani Ave)', TRUE),
  (4, 'Route 4 - Notun Bazar to UIU', 'Notun Bazar', 'UIU Campus (Madani Ave)', TRUE)
ON CONFLICT (route_number) DO UPDATE SET
  name = EXCLUDED.name,
  origin_name = EXCLUDED.origin_name,
  destination_name = EXCLUDED.destination_name,
  is_active = EXCLUDED.is_active;

-- 3. Fleet Buses
INSERT INTO buses (registration_number, display_name, capacity, is_active)
VALUES
  ('Dhaka-Metro-Cha-11-2024', 'UIU Shuttle #1', 40, TRUE),
  ('Dhaka-Metro-Cha-11-2025', 'UIU Shuttle #2', 40, TRUE),
  ('Dhaka-Metro-Cha-11-2026', 'UIU Shuttle #3', 32, TRUE),
  ('Dhaka-Metro-Cha-11-2027', 'UIU Shuttle #4', 40, TRUE)
ON CONFLICT (registration_number) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  capacity = EXCLUDED.capacity,
  is_active = EXCLUDED.is_active;

-- 4. Service / Emergency Contacts
INSERT INTO service_contacts (label, phone_number, description, is_emergency, display_order, is_active)
VALUES
  ('Emergency Shuttle Hotline', '01700000001', 'Immediate emergency and breakdown response desk', TRUE, 1, TRUE),
  ('UIU Transport Coordinator', '01700000002', 'General shuttle schedule and query desk', FALSE, 2, TRUE),
  ('Campus Security Control Room', '01700000003', 'Gate and campus security office', TRUE, 3, TRUE),
  ('UIU Medical Center & Ambulance', '01700000004', 'Campus health and emergency medical care', TRUE, 4, TRUE)
ON CONFLICT (label) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  description = EXCLUDED.description,
  is_emergency = EXCLUDED.is_emergency,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 5. Seed Schedules for All Routes (Avoid duplicates by checking existing times)
-- Route 1: Dhanmondi
INSERT INTO schedules (route_id, direction, departure_time, is_active)
SELECT r.id, s.direction, s.departure_time::time, TRUE
FROM routes r
CROSS JOIN (
  VALUES
    ('outbound'::varchar, '07:15:00'),
    ('outbound'::varchar, '07:45:00'),
    ('outbound'::varchar, '08:30:00'),
    ('return'::varchar, '16:00:00'),
    ('return'::varchar, '16:45:00'),
    ('return'::varchar, '17:30:00')
) AS s(direction, departure_time)
WHERE r.route_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM schedules existing
    WHERE existing.route_id = r.id
      AND existing.direction = s.direction
      AND existing.departure_time = s.departure_time::time
  );

-- Route 2: Mirpur
INSERT INTO schedules (route_id, direction, departure_time, is_active)
SELECT r.id, s.direction, s.departure_time::time, TRUE
FROM routes r
CROSS JOIN (
  VALUES
    ('outbound'::varchar, '07:15:00'),
    ('outbound'::varchar, '08:00:00'),
    ('return'::varchar, '16:15:00'),
    ('return'::varchar, '17:15:00')
) AS s(direction, departure_time)
WHERE r.route_number = 2
  AND NOT EXISTS (
    SELECT 1 FROM schedules existing
    WHERE existing.route_id = r.id
      AND existing.direction = s.direction
      AND existing.departure_time = s.departure_time::time
  );

-- Route 3: Uttara
INSERT INTO schedules (route_id, direction, departure_time, is_active)
SELECT r.id, s.direction, s.departure_time::time, TRUE
FROM routes r
CROSS JOIN (
  VALUES
    ('outbound'::varchar, '07:00:00'),
    ('outbound'::varchar, '07:45:00'),
    ('return'::varchar, '16:30:00'),
    ('return'::varchar, '17:30:00')
) AS s(direction, departure_time)
WHERE r.route_number = 3
  AND NOT EXISTS (
    SELECT 1 FROM schedules existing
    WHERE existing.route_id = r.id
      AND existing.direction = s.direction
      AND existing.departure_time = s.departure_time::time
  );

-- Route 4: Notun Bazar
INSERT INTO schedules (route_id, direction, departure_time, is_active)
SELECT r.id, s.direction, s.departure_time::time, TRUE
FROM routes r
CROSS JOIN (
  VALUES
    ('outbound'::varchar, '08:00:00'),
    ('outbound'::varchar, '08:30:00'),
    ('outbound'::varchar, '09:00:00'),
    ('return'::varchar, '15:30:00'),
    ('return'::varchar, '16:30:00'),
    ('return'::varchar, '17:30:00')
) AS s(direction, departure_time)
WHERE r.route_number = 4
  AND NOT EXISTS (
    SELECT 1 FROM schedules existing
    WHERE existing.route_id = r.id
      AND existing.direction = s.direction
      AND existing.departure_time = s.departure_time::time
  );

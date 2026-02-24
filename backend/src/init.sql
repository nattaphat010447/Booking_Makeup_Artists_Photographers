-- สร้าง ENUM Types
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
CREATE TYPE service_type AS ENUM ('makeup', 'photographer');
CREATE TYPE message_type AS ENUM ('text', 'quotation', 'system');
CREATE TYPE quotation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE booking_status AS ENUM ('awaiting_payment', 'payment_uploaded', 'in_progress', 'waiting_customer_approve', 'completed', 'cancelled');
CREATE TYPE slip_status AS ENUM ('pending', 'verified', 'rejected');

-- 1. ตาราง users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'customer',
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตาราง provider_profiles
CREATE TABLE provider_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    bio TEXT,
    location VARCHAR(255),
    price_start DECIMAL(10, 2),
    rating_avg DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตาราง portfolios
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    provider_id INT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตาราง chat_rooms
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, provider_id)
);

-- 6. ตาราง quotations (ต้องสร้างก่อน messages เพื่อใช้เป็น FK)
CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    chat_room_id INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    provider_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    event_date DATE NOT NULL,
    event_start_time TIME NOT NULL,
    event_end_time TIME NOT NULL,
    status quotation_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตาราง messages (ปรับเพิ่ม quotation_id)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_room_id INT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type message_type DEFAULT 'text',
    message_text TEXT,
    quotation_id INT REFERENCES quotations(id) ON DELETE SET NULL, -- เชื่อมกับใบเสนอราคา
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ตาราง bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    quotation_id INT NOT NULL REFERENCES quotations(id),
    customer_id INT NOT NULL REFERENCES users(id),
    provider_id INT NOT NULL REFERENCES users(id),
    booking_status booking_status DEFAULT 'awaiting_payment',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ตาราง payment_slips
CREATE TABLE payment_slips (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    status slip_status DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

-- 9. ตาราง reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES users(id),
    provider_id INT NOT NULL REFERENCES users(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
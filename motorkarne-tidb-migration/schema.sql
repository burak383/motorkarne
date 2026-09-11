-- MotorKarne veritabanı şeması (TiDB Serverless / MySQL uyumlu)

CREATE TABLE motors (
  id            VARCHAR(100) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(100),
  fuel          VARCHAR(100),
  power         VARCHAR(50),
  torque        VARCHAR(50),
  transmission  VARCHAR(255),
  consumption   VARCHAR(50),
  score         DECIMAL(3,1),
  risk          VARCHAR(50),
  risk_level    ENUM('low','medium','high') NOT NULL,
  note          TEXT,
  image_url     TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bir motor birden fazla markada kullanılabiliyor (örn. PureTech -> Peugeot, Citroën, Opel, DS)
CREATE TABLE motor_brands (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  motor_id    VARCHAR(100) NOT NULL,
  brand_name  VARCHAR(100) NOT NULL,
  FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE,
  INDEX idx_motor_brands_motor (motor_id),
  INDEX idx_motor_brands_brand (brand_name)
);

CREATE TABLE motor_pros (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  motor_id    VARCHAR(100) NOT NULL,
  text        TEXT NOT NULL,
  sort_order  INT DEFAULT 0,
  FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE,
  INDEX idx_motor_pros_motor (motor_id)
);

CREATE TABLE motor_cons (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  motor_id    VARCHAR(100) NOT NULL,
  text        TEXT NOT NULL,
  sort_order  INT DEFAULT 0,
  FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE,
  INDEX idx_motor_cons_motor (motor_id)
);

CREATE TABLE chronic_issues (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  motor_id    VARCHAR(100) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  risk        VARCHAR(50),
  description TEXT,
  solution    TEXT,
  sort_order  INT DEFAULT 0,
  FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE,
  INDEX idx_chronic_motor (motor_id)
);

CREATE TABLE vehicles (
  id          VARCHAR(100) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  brand       VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  score       DECIMAL(3,1),
  engine      VARCHAR(255),
  motor_id    VARCHAR(100),
  img         TEXT,
  note        TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE SET NULL,
  INDEX idx_vehicles_brand (brand),
  INDEX idx_vehicles_motor (motor_id)
);

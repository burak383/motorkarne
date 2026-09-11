-- MotorKarne üyelik (auth) tablosu.
-- TiDB Cloud konsolundaki SQL Editor'de, mevcut "motorkarne" veritabanı seçiliyken
-- bir kere çalıştırman yeterli (audit_log tablosunu eklerken yaptığın gibi).

USE motorkarne;

CREATE TABLE members (
  id            VARCHAR(64) PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(50),
  -- E-posta/şifre ile kayıt olanlarda bcrypt hash'i burada tutulur.
  -- Google/Apple ile kayıt olan (şifresiz) hesaplarda bu alan NULL kalır.
  password_hash VARCHAR(255),
  provider      ENUM('email', 'google', 'apple') NOT NULL DEFAULT 'email',
  provider_id   VARCHAR(255),
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_members_email (email),
  INDEX idx_members_provider (provider, provider_id)
);

-- Sign in with Apple desteği için: members.provider ENUM'una 'apple' ekler.
-- TiDB Cloud konsolundaki SQL Editor'de, mevcut "motorkarne" veritabanı
-- seçiliyken bir kere çalıştırman yeterli.

USE motorkarne;

ALTER TABLE members MODIFY COLUMN provider ENUM('email', 'google', 'apple') NOT NULL DEFAULT 'email';

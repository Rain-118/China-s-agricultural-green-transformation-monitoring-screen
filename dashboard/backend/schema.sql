-- Schema for Agriculture Green Transformation Dashboard
CREATE DATABASE IF NOT EXISTS agriculture_green CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agriculture_green;

DROP TABLE IF EXISTS indicator_data;
CREATE TABLE indicator_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'fertilizer,grain,plant_area,machinery,irrigation,electricity,power_gen,pesticide,plastic_film,agri_output,income,consumption,population,gdp',
  indicator VARCHAR(100) NOT NULL COMMENT 'Specific indicator name',
  value DOUBLE,
  UNIQUE KEY uniq_idx (province, year, category, indicator),
  INDEX idx_category (category),
  INDEX idx_province (province),
  INDEX idx_year (year),
  INDEX idx_cat_ind (category, indicator)
) ENGINE=InnoDB;

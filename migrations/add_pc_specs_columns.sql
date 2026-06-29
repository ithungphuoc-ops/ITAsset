-- Migration: Add main_board and power_supply columns to device_laptop_specs
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE device_laptop_specs
  ADD COLUMN IF NOT EXISTS main_board TEXT,
  ADD COLUMN IF NOT EXISTS power_supply TEXT;

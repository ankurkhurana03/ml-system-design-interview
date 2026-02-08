-- Add company and domain tag arrays to gallery_problems
ALTER TABLE gallery_problems ADD COLUMN companies text[] DEFAULT '{}';
ALTER TABLE gallery_problems ADD COLUMN domains text[] DEFAULT '{}';

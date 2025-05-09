-- Reset file-related fields in presentations table
UPDATE presentations
SET file_url = NULL,
    file_provider = NULL; 
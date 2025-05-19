-- Add OneDrive-specific fields to presentations table
ALTER TABLE presentations
ADD COLUMN onedrive_file_id TEXT,
ADD COLUMN onedrive_web_url TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN presentations.onedrive_file_id IS 'The unique identifier for the file in OneDrive';
COMMENT ON COLUMN presentations.onedrive_web_url IS 'The web URL to access the file in OneDrive'; 
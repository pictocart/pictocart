-- Remove duplicates first if any exist (keep the latest one)
DELETE FROM store_site_offers a USING store_site_offers b 
WHERE a.id < b.id AND a.store_id = b.store_id;

-- Add unique constraint on store_id
ALTER TABLE store_site_offers ADD CONSTRAINT store_site_offers_store_id_unique UNIQUE (store_id);

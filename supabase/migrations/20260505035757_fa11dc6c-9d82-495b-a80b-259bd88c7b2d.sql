DELETE FROM provision_job_logs WHERE request_id IN (SELECT id FROM provision_requests WHERE store_id='309b2d56-2ed2-4705-b762-b80c8774bda6');
DELETE FROM provision_requests WHERE store_id='309b2d56-2ed2-4705-b762-b80c8774bda6';
UPDATE stores SET custom_domain=NULL WHERE id='309b2d56-2ed2-4705-b762-b80c8774bda6';
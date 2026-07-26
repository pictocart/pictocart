UPDATE provision_requests SET status='failed', error='Cancelled — provisioning runner paused', completed_at=now() WHERE id='2ec63614-7026-4e50-b07d-ebd734cca7d6';

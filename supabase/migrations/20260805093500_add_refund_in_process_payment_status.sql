-- Migration: Add refund_in_process to payment_status enum

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'refund_in_process';

-- Migration: Add refund_requested to payment_status enum

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'refund_requested';

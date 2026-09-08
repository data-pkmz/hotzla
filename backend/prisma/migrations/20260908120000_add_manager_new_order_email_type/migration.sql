-- Add a dedicated audit-log type for manager notifications.
-- Keeping this separate from ORDER_CONFIRMATION makes delivery history
-- accurately describe which business event produced each email.
ALTER TYPE "EmailType" ADD VALUE 'MANAGER_NEW_ORDER';

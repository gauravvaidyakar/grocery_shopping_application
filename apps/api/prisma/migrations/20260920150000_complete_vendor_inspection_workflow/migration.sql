-- Preserve the legacy NEEDS_ACTION value while adding the explicit workflow states.
ALTER TYPE "InspectionStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';
ALTER TYPE "InspectionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

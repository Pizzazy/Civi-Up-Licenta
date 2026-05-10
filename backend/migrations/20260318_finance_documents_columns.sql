-- Adds financial document workflow columns required by expenses/donations endpoints.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS document_type text,
    ADD COLUMN IF NOT EXISTS invoice_url text,
    ADD COLUMN IF NOT EXISTS proof_url text,
    ADD COLUMN IF NOT EXISTS payment_status text;

ALTER TABLE public.donations
    ADD COLUMN IF NOT EXISTS document_type text,
    ADD COLUMN IF NOT EXISTS invoice_url text,
    ADD COLUMN IF NOT EXISTS proof_url text,
    ADD COLUMN IF NOT EXISTS payment_status text;

UPDATE public.expenses
SET document_type = COALESCE(NULLIF(document_type, ''), 'factura'),
    payment_status = COALESCE(NULLIF(payment_status, ''), CASE WHEN proof_url IS NULL OR proof_url = '' THEN 'in_asteptare_dovada' ELSE 'achitat' END)
WHERE document_type IS NULL
   OR document_type = ''
   OR payment_status IS NULL
   OR payment_status = '';

UPDATE public.donations
SET document_type = COALESCE(NULLIF(document_type, ''), 'factura'),
    payment_status = COALESCE(NULLIF(payment_status, ''), CASE WHEN proof_url IS NULL OR proof_url = '' THEN 'in_asteptare_dovada' ELSE 'achitat' END)
WHERE document_type IS NULL
   OR document_type = ''
   OR payment_status IS NULL
   OR payment_status = '';

ALTER TABLE public.expenses
    ALTER COLUMN document_type SET DEFAULT 'factura',
    ALTER COLUMN payment_status SET DEFAULT 'in_asteptare_dovada';

ALTER TABLE public.donations
    ALTER COLUMN document_type SET DEFAULT 'factura',
    ALTER COLUMN payment_status SET DEFAULT 'in_asteptare_dovada';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.expenses
        WHERE document_type IS NULL OR payment_status IS NULL
    ) THEN
        RAISE EXCEPTION 'expenses still contains NULL values for document_type/payment_status';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.donations
        WHERE document_type IS NULL OR payment_status IS NULL
    ) THEN
        RAISE EXCEPTION 'donations still contains NULL values for document_type/payment_status';
    END IF;
END $$;

ALTER TABLE public.expenses
    ALTER COLUMN document_type SET NOT NULL,
    ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE public.donations
    ALTER COLUMN document_type SET NOT NULL,
    ALTER COLUMN payment_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'expenses_document_type_chk'
          AND conrelid = 'public.expenses'::regclass
    ) THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT expenses_document_type_chk
            CHECK (document_type IN ('factura', 'bon'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'expenses_payment_status_chk'
          AND conrelid = 'public.expenses'::regclass
    ) THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT expenses_payment_status_chk
            CHECK (payment_status IN ('in_asteptare_dovada', 'achitat'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'donations_document_type_chk'
          AND conrelid = 'public.donations'::regclass
    ) THEN
        ALTER TABLE public.donations
            ADD CONSTRAINT donations_document_type_chk
            CHECK (document_type IN ('factura', 'bon'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'donations_payment_status_chk'
          AND conrelid = 'public.donations'::regclass
    ) THEN
        ALTER TABLE public.donations
            ADD CONSTRAINT donations_payment_status_chk
            CHECK (payment_status IN ('in_asteptare_dovada', 'achitat'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_document_type ON public.expenses(document_type);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON public.expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_document_type ON public.donations(document_type);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON public.donations(payment_status);

COMMIT;

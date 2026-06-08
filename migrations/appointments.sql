-- Migration : table rendez-vous
-- À exécuter dans l'éditeur SQL de Supabase (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name     text NOT NULL,
  visitor_email    text,
  visitor_phone    text,
  project          text NOT NULL,
  notes            text,
  status           text NOT NULL DEFAULT 'planifié'
                     CHECK (status IN ('planifié','confirmé','annulé','terminé')),
  employee_id      uuid REFERENCES employees(id) ON DELETE SET NULL,
  appointment_date timestamptz NOT NULL,
  appointment_end  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index pour les recherches par date et par statut
CREATE INDEX IF NOT EXISTS appointments_date_idx     ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx   ON appointments (status);
CREATE INDEX IF NOT EXISTS appointments_employee_idx ON appointments (employee_id);

-- Row Level Security (lecture publique avec anon key, écriture avec service key)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anon_read"  ON appointments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "anon_write" ON appointments FOR ALL    USING (true) WITH CHECK (true);

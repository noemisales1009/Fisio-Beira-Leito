-- ============================================================
-- FISIO BEIRA LEITO × SUPABASE
-- Integra o app à MESMA tabela "patients" já usada pelo fluxo
-- n8n (censo PDF → Supabase) e pelo RoundKids:
--   · paciente ativo  = archived_at nulo
--   · alta / arquivar = preencher archived_at + motivo_arquivamento
--
-- COMO USAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (Dashboard → SQL Editor → New query → Run). Rodar mais de uma
-- vez não causa problema.
-- ============================================================

-- 1) Coluna para a ficha da fisioterapia (suporte ventilatório,
--    alvos, gasometrias, dispositivos etc.). Não afeta o n8n nem
--    o RoundKids — eles simplesmente ignoram esta coluna.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS fisio_dados JSONB;

-- 2) Acesso do app (chave anon) à tabela, no mesmo padrão das
--    tabelas de triagem (PAV/IPCS). Sem isso, o RLS bloqueia a
--    chave anon e o app fica em modo demonstração.
--    Obs.: sem permissão de DELETE — alta é sempre arquivamento.
GRANT SELECT, INSERT, UPDATE ON patients TO anon, authenticated;

DROP POLICY IF EXISTS "Permitir acesso ao app (fisio_beira_leito)" ON patients;
CREATE POLICY "Permitir acesso ao app (fisio_beira_leito)"
  ON patients
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3) Leitura (somente leitura) das precauções e dos diagnósticos do
--    Round, para o app mostrar a precaução e o diagnóstico reais de
--    cada paciente na ficha.
GRANT SELECT ON precautions, paciente_diagnosticos, pergunta_opcoes_diagnostico, perguntas_diagnistico TO anon, authenticated;

DROP POLICY IF EXISTS "Leitura fisio_beira_leito (precautions)" ON precautions;
CREATE POLICY "Leitura fisio_beira_leito (precautions)"
  ON precautions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Leitura fisio_beira_leito (paciente_diagnosticos)" ON paciente_diagnosticos;
CREATE POLICY "Leitura fisio_beira_leito (paciente_diagnosticos)"
  ON paciente_diagnosticos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Leitura fisio_beira_leito (pergunta_opcoes_diagnostico)" ON pergunta_opcoes_diagnostico;
CREATE POLICY "Leitura fisio_beira_leito (pergunta_opcoes_diagnostico)"
  ON pergunta_opcoes_diagnostico FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Leitura fisio_beira_leito (perguntas_diagnistico)" ON perguntas_diagnistico;
CREATE POLICY "Leitura fisio_beira_leito (perguntas_diagnistico)"
  ON perguntas_diagnistico FOR SELECT TO anon, authenticated USING (true);

-- 3b) Tabelas do Round que a fisioterapia também GERENCIA (ler + gravar):
--     · dispositivos_pacientes → aba Equipamentos (adicionar/retirar)
--     · scale_scores           → aba Scores (gravar escalas + histórico)
GRANT SELECT, INSERT, UPDATE ON dispositivos_pacientes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON scale_scores TO anon, authenticated;

DROP POLICY IF EXISTS "Acesso fisio_beira_leito (dispositivos_pacientes)" ON dispositivos_pacientes;
CREATE POLICY "Acesso fisio_beira_leito (dispositivos_pacientes)"
  ON dispositivos_pacientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso fisio_beira_leito (scale_scores)" ON scale_scores;
CREATE POLICY "Acesso fisio_beira_leito (scale_scores)"
  ON scale_scores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4) Sinais vitais da fisioterapia — um registro por paciente,
--    data e turno (M/T/N), com as instabilidades sinalizadas.
CREATE TABLE IF NOT EXISTS fisio_sinais_vitais (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  data           DATE        NOT NULL DEFAULT CURRENT_DATE,
  turno          TEXT        NOT NULL CHECK (turno IN ('M','T','N')),
  spo2           NUMERIC     NULL,
  fc             NUMERIC     NULL,
  fr             NUMERIC     NULL,
  pas            NUMERIC     NULL,
  pad            NUMERIC     NULL,
  temp           NUMERIC     NULL,
  instabilidades TEXT[]      NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fisio_sv_unico UNIQUE (patient_id, data, turno)
);

CREATE INDEX IF NOT EXISTS idx_fisio_sv_paciente
  ON fisio_sinais_vitais (patient_id, data DESC);

GRANT ALL ON fisio_sinais_vitais TO anon, authenticated;

ALTER TABLE fisio_sinais_vitais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso ao app (fisio_sinais_vitais)" ON fisio_sinais_vitais;
CREATE POLICY "Permitir acesso ao app (fisio_sinais_vitais)"
  ON fisio_sinais_vitais
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5) Suporte Ventilatório Atual — lugar separado, um registro por
--    paciente (o suporte vigente). Campos principais em colunas
--    visíveis; os parâmetros variáveis (fluxo, FiO2, PEEP, PIP,
--    MAP, nº TOT, cuff...) em JSONB.
CREATE TABLE IF NOT EXISTS fisio_suporte_ventilatorio (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  suporte             TEXT        NOT NULL,           -- ex.: Máscara Venturi, CNAF, TOT em VM
  situacao            TEXT        NULL,               -- Mantido / Em desmame / Suspenso
  modo                TEXT        NULL,               -- VM: Assistido/Controlado, Espontâneo (PSV)
  modalidade          TEXT        NULL,               -- VM: Pressão Controlada, Volume Controlado, PRVC
  prog_extubacao      BOOLEAN     NOT NULL DEFAULT false,
  prog_extubacao_data DATE        NULL,
  parametros          JSONB       NOT NULL DEFAULT '{}',  -- fluxo, fio2, peep, pip, map, numTot, cuff...
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fisio_sv_atual_unico UNIQUE (patient_id)
);

CREATE INDEX IF NOT EXISTS idx_fisio_suporte_paciente
  ON fisio_suporte_ventilatorio (patient_id);

GRANT ALL ON fisio_suporte_ventilatorio TO anon, authenticated;

ALTER TABLE fisio_suporte_ventilatorio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso ao app (fisio_suporte_ventilatorio)" ON fisio_suporte_ventilatorio;
CREATE POLICY "Permitir acesso ao app (fisio_suporte_ventilatorio)"
  ON fisio_suporte_ventilatorio
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6) Gasometria da fisioterapia — tabela própria (a "gasometrias" do
--    Round só trata distúrbio ácido-base; esta guarda a OXIGENAÇÃO:
--    PaO2, FiO2, MAP e os índices P/F e IO, que é o que a fisio usa.
CREATE TABLE IF NOT EXISTS fisio_gasometria (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  data        TEXT        NULL,   -- data da coleta (como digitada na ficha)
  hora        TEXT        NULL,
  ph          NUMERIC     NULL,
  paco2       NUMERIC     NULL,
  pao2        NUMERIC     NULL,
  hco3        NUMERIC     NULL,
  be          NUMERIC     NULL,
  fio2        NUMERIC     NULL,
  map         NUMERIC     NULL,   -- pressão média de vias aéreas
  pf          NUMERIC     NULL,   -- relação PaO2/FiO2
  io          NUMERIC     NULL,   -- índice de oxigenação = MAP×FiO2×100/PaO2
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fisio_gaso_paciente
  ON fisio_gasometria (patient_id, created_at DESC);

GRANT ALL ON fisio_gasometria TO anon, authenticated;

ALTER TABLE fisio_gasometria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso ao app (fisio_gasometria)" ON fisio_gasometria;
CREATE POLICY "Permitir acesso ao app (fisio_gasometria)"
  ON fisio_gasometria
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

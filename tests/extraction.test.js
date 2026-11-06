import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultConfig,
  extractInvoice,
  extractNumberCandidates,
  normalizeText,
  parseMeasurementLine,
  parseLocalizedNumber,
  validateConfig,
} from "../src/extraction.js";

test("normalizes case, accents, and repeated whitespace", () => {
  assert.equal(normalizeText("  Emissão   da Fatura "), "EMISSAO DA FATURA");
});

test("parses Brazilian decimal and thousands separators", () => {
  assert.equal(parseLocalizedNumber("1.234,567"), 1234.567);
  assert.equal(parseLocalizedNumber("123,45"), 123.45);
  assert.equal(parseLocalizedNumber("1.234"), 1234);
});

test("parses Enel measurement rows after the meter, measure, post, and three register values", () => {
  const line = "15787805 ENRG ATV F PONTA INDU 10 20 1 345,600";
  assert.deepEqual(parseMeasurementLine(line), {
    measure: "ENRG ATV",
    post: "F PONTA INDU",
    value: 345.6,
    sourceLine: line,
    index: 0,
  });
  assert.equal(parseMeasurementLine("99999999 ENRG ATV F PONTA INDU 10 20 1 345,600"), null);
  assert.equal(parseMeasurementLine("15787805 ENRG ATV F PONTA INDU 10 20 1"), null);
});

test("reads contracted demand values from the invoice", () => {
  const config = createDefaultConfig();
  const data = extractInvoice([
    "Demanda contratada Ponta: 360 kW",
    "Demanda contratada Fora de Ponta: 420 kW",
  ], config);
  assert.equal(data.fields.demanda_contratada_ponta.value, 360);
  assert.equal(data.fields.demanda_contratada_ponta.status, "review");
  assert.equal(data.fields.demanda_contratada_fora_ponta.value, 420);
  assert.equal(data.fields.demanda_contratada_fora_ponta.status, "review");
});

test("filters by meter and matches each measurement using its measure and post", () => {
  const config = createDefaultConfig();
  const data = extractInvoice([
    "15787805 ENRG ATV F PONTA INDU 1 2 1 120,000",
    "15787805 ENRG ATV F PONTA 1 2 1 30,000",
    "15787805 ENRG ATV PONTA 1 2 1 45,000",
    "99999999 ENRG ATV PONTA 1 2 1 900,000",
    "15787805 DEMANDA F PONTA INDU 1 2 1 125,000",
    "15787805 DEMANDA F PONTA CAP 1 2 1 130,000",
    "15787805 DEMANDA CONTRATADA FORA PONTA 1 2 1 350,000",
    "15787805 DEMANDA CONTRATADA PONTA 1 2 1 360,000",
    "15787805 ENRG RTV F PONTA INDU 1 2 1 140,000",
    "15787805 ENRG RTV PONTA 1 2 1 150,000",
    "Data de emissão: 01/10/2026",
    "Vencimento 15/10/2026",
    "Bandeira tarifária: Verde",
    "Valor total da fatura R$ 1.234,56",
  ], config);
  assert.equal(data.fields.consumo_fora_ponta.value, 150);
  assert.equal(data.fields.consumo_na_ponta.value, 45);
  assert.equal(data.fields.demanda_faturada_fora_ponta.value, 125);
  assert.equal(data.fields.demanda_faturada_ponta.value, 130);
  assert.equal(data.fields.demanda_contratada_fora_ponta.value, 350);
  assert.equal(data.fields.demanda_contratada_ponta.value, 360);
  assert.equal(data.fields.energia_reativa_fora_ponta.value, 140);
  assert.equal(data.fields.energia_reativa_ponta.value, 150);
  assert.equal(data.fields.valor_bruto.value, 1234.56);
  assert.equal(data.info.issueDate.value, "01/10/2026");
  assert.equal(data.info.dueDate.value, "15/10/2026");
  assert.equal(data.info.tariffFlag.value, "Verde");
});

test("extracts the tariff flag instead of retaining its explanatory text or markdown", () => {
  const data = extractInvoice([
    "Bandeira tarifária**(s) tarifária(s) aplicada(s) no mês: AMARELA**",
  ], createDefaultConfig());
  assert.equal(data.info.tariffFlag.value, "Amarela");
});

test("migrates saved version 1 rules without keeping unreliable numeric positions", () => {
  const legacy = createDefaultConfig();
  legacy.version = 1;
  legacy.fields = Object.fromEntries([
    "consumo_fora_ponta",
    "consumo_na_ponta",
    "demanda_contratada_ponta",
    "demanda_contratada_fora_ponta",
    "demanda_faturada_fora_ponta",
    "demanda_faturada_ponta",
    "energia_reativa_fora_ponta",
    "energia_reativa_ponta",
    "valor_bruto",
  ].map((id) => [id, { aliases: ["IGNORADO"], operation: "first", valueIndex: 0, fixedValue: "" }]));
  legacy.fields.demanda_contratada_ponta.fixedValue = "420";
  const migrated = validateConfig(legacy);
  assert.equal(migrated.version, 3);
  assert.equal("fixedValues" in migrated, false);
  assert.equal(migrated.meterNumber, "15787805");
});

test("rejects malformed imported configuration", () => {
  assert.throws(() => validateConfig({ version: 1, fields: {}, info: {} }), /Regra inválida/);
});

test("extracts localized numeric candidates in order", () => {
  assert.deepEqual(extractNumberCandidates("1.000,00 25,5 12"), [1000, 25.5, 12]);
});

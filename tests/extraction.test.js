import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultConfig,
  extractConfiguredField,
  extractInvoice,
  extractNumberCandidates,
  normalizeText,
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

test("selects the configured numeric position and does not invent a missing zero", () => {
  const rule = { aliases: ["ENRG ATV PONTA"], operation: "first", valueIndex: 3, fixedValue: "" };
  assert.deepEqual(extractConfiguredField(["ENRG ATV PONTA 10 20 1 345,600"], rule), {
    value: 345.6,
    sourceLine: "ENRG ATV PONTA 10 20 1 345,600",
    status: "review",
  });
  assert.equal(extractConfiguredField(["outra linha"], rule).value, null);
});

test("supports explicitly configured fixed values without seeding customer-specific defaults", () => {
  const config = createDefaultConfig();
  config.fields.demanda_contratada_ponta.fixedValue = "360";
  const data = extractInvoice([], config);
  assert.equal(data.fields.demanda_contratada_ponta.value, 360);
  assert.equal(data.fields.demanda_contratada_ponta.status, "fixed");
  assert.equal(data.fields.demanda_contratada_fora_ponta.value, null);
});

test("sums distinct matching rows and reads invoice information", () => {
  const config = createDefaultConfig();
  const data = extractInvoice([
    "ENRG ATV F PONTA INDU 1 2 1 120,000",
    "ENRG ATV F PONTA 1 2 1 30,000",
    "Data de emissão: 01/10/2026",
    "Vencimento 15/10/2026",
    "Bandeira tarifária: Verde",
    "Valor total da fatura R$ 1.234,56",
  ], config);
  assert.equal(data.fields.consumo_fora_ponta.value, 150);
  assert.equal(data.fields.valor_bruto.value, 1234.56);
  assert.equal(data.info.issueDate.value, "01/10/2026");
  assert.equal(data.info.dueDate.value, "15/10/2026");
  assert.equal(data.info.tariffFlag.value, "Verde");
});

test("rejects malformed imported configuration", () => {
  assert.throws(() => validateConfig({ version: 1, fields: {}, info: {} }), /Regra inválida/);
});

test("extracts localized numeric candidates in order", () => {
  assert.deepEqual(extractNumberCandidates("1.000,00 25,5 12"), [1000, 25.5, 12]);
});

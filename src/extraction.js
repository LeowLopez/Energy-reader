export const STORAGE_KEY = "energia-clara-rules-v1";

export const FIELD_DEFINITIONS = [
  {
    id: "consumo_fora_ponta",
    label: "Consumo Fora de Ponta (kWh)",
    kind: "number",
    aliases: ["ENRG ATV F PONTA INDU", "ENRG ATV F PONTA"],
    operation: "sum",
    valueIndex: 3,
  },
  {
    id: "consumo_na_ponta",
    label: "Consumo Na Ponta (kWh)",
    kind: "number",
    aliases: ["ENRG ATV PONTA"],
    operation: "first",
    valueIndex: 3,
  },
  {
    id: "demanda_contratada_ponta",
    label: "Demanda Contratada Na Ponta (kW)",
    kind: "number",
    aliases: ["DEMANDA CONTRATADA PONTA"],
    operation: "first",
    valueIndex: -1,
  },
  {
    id: "demanda_contratada_fora_ponta",
    label: "Demanda Contratada Fora de Ponta (kW)",
    kind: "number",
    aliases: ["DEMANDA CONTRATADA FORA PONTA"],
    operation: "first",
    valueIndex: -1,
  },
  {
    id: "demanda_faturada_fora_ponta",
    label: "Demanda Faturada no Mês Fora de Ponta (kW)",
    kind: "number",
    aliases: ["DEMANDA F PONTA INDU", "DEMANDA FORA PONTA"],
    operation: "first",
    valueIndex: 3,
  },
  {
    id: "demanda_faturada_ponta",
    label: "Demanda Faturada no Mês Na Ponta (kW)",
    kind: "number",
    aliases: ["DEMANDA F PONTA CAP", "DEMANDA PONTA"],
    operation: "first",
    valueIndex: 3,
  },
  {
    id: "energia_reativa_fora_ponta",
    label: "Energia Reativa no Mês Fora de Ponta (kVArh)",
    kind: "number",
    aliases: ["ENRG RTV F PONTA INDU", "ENRG RTV FORA PONTA"],
    operation: "first",
    valueIndex: 3,
  },
  {
    id: "energia_reativa_ponta",
    label: "Energia Reativa no Mês Na Ponta (kVArh)",
    kind: "number",
    aliases: ["ENRG RTV PONTA"],
    operation: "first",
    valueIndex: 3,
  },
  {
    id: "valor_bruto",
    label: "Valor bruto da fatura",
    kind: "currency",
    aliases: ["VALOR BRUTO", "TOTAL BRUTO", "VALOR TOTAL DA FATURA"],
    operation: "first",
    valueIndex: -1,
  },
];

export const INFO_DEFINITIONS = [
  { id: "issueDate", label: "Data de emissão", aliases: ["DATA DE EMISSÃO", "DATA DA EMISSÃO", "EMISSÃO"] },
  { id: "dueDate", label: "Vencimento", aliases: ["DATA DE VENCIMENTO", "VENCIMENTO", "PAGAR ATÉ"] },
  { id: "tariffFlag", label: "Bandeira tarifária", aliases: ["BANDEIRA TARIFÁRIA", "BANDEIRA TARIFARIA", "BANDEIRA"] },
];

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function createDefaultConfig() {
  return {
    version: 1,
    fields: Object.fromEntries(
      FIELD_DEFINITIONS.map(({ id, aliases, operation, valueIndex }) => [
        id,
        { aliases: [...aliases], operation, valueIndex, fixedValue: "" },
      ]),
    ),
    info: Object.fromEntries(INFO_DEFINITIONS.map(({ id, aliases }) => [id, { aliases: [...aliases] }])),
  };
}

export function validateConfig(config) {
  if (!config || config.version !== 1 || typeof config.fields !== "object" || typeof config.info !== "object") {
    throw new Error("O arquivo não contém uma configuração compatível.");
  }
  for (const field of FIELD_DEFINITIONS) {
    const rule = config.fields[field.id];
    if (!rule || !Array.isArray(rule.aliases) || !["first", "last", "sum"].includes(rule.operation)) {
      throw new Error(`Regra inválida para "${field.label}".`);
    }
    if (!Number.isInteger(rule.valueIndex) || rule.valueIndex < -1 || rule.valueIndex > 50) {
      throw new Error(`Posição numérica inválida para "${field.label}".`);
    }
    if (rule.fixedValue !== "" && !Number.isFinite(Number(rule.fixedValue))) {
      throw new Error(`Valor fixo inválido para "${field.label}".`);
    }
    if (rule.aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Os termos de busca de "${field.label}" precisam ser textos.`);
    }
  }
  for (const info of INFO_DEFINITIONS) {
    if (!config.info[info.id] || !Array.isArray(config.info[info.id].aliases) ||
      config.info[info.id].aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Regra inválida para "${info.label}".`);
    }
  }
  return config;
}

export function parseLocalizedNumber(value) {
  const clean = String(value).replace(/[^\d,.-]/g, "");
  if (!clean || !/\d/.test(clean)) return null;
  let normalized = clean;
  if (clean.includes(",")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}$/.test(clean)) {
    normalized = clean.replace(/\./g, "");
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function extractNumberCandidates(line) {
  const matches = String(line).match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map(parseLocalizedNumber).filter((value) => value !== null);
}

function findMatchingLines(lines, aliases) {
  const normalizedAliases = aliases.map(normalizeText).filter(Boolean);
  if (!normalizedAliases.length) return [];
  return lines
    .map((text, index) => {
      const normalized = normalizeText(text);
      const matchedAlias = normalizedAliases
        .filter((alias) => normalized.includes(alias))
        .sort((left, right) => right.length - left.length)[0];
      return matchedAlias ? { text, index, matchedAlias } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.matchedAlias.length - left.matchedAlias.length || left.index - right.index);
}

export function extractConfiguredField(lines, rule) {
  if (rule.fixedValue !== "" && rule.fixedValue !== null && rule.fixedValue !== undefined) {
    const value = parseLocalizedNumber(rule.fixedValue);
    return value === null
      ? { value: null, sourceLine: "", status: "invalid" }
      : { value, sourceLine: "Valor definido manualmente na configuração", status: "fixed" };
  }
  const matches = findMatchingLines(lines, rule.aliases);
  const candidates = matches.map((match) => {
    const values = extractNumberCandidates(match.text);
    const selected = rule.valueIndex === -1 ? values.at(-1) : values[rule.valueIndex];
    return selected === undefined ? null : { ...match, value: selected };
  }).filter(Boolean);
  if (!candidates.length) return { value: null, sourceLine: "", status: "missing" };
  if (rule.operation === "sum") {
    const unique = [...new Map(candidates.map((item) => [item.index, item])).values()];
    return {
      value: unique.reduce((sum, item) => sum + item.value, 0),
      sourceLine: unique.map((item) => item.text).join("\n"),
      status: "review",
    };
  }
  const selected = rule.operation === "last" ? candidates.at(-1) : candidates[0];
  return { value: selected.value, sourceLine: selected.text, status: "review" };
}

function extractInfo(lines, definition, rule) {
  const matches = findMatchingLines(lines, rule.aliases);
  if (!matches.length) return { value: "", sourceLine: "", status: "missing" };
  const sourceLine = matches[0].text;
  if (definition.id === "tariffFlag") {
    const normalizedLine = normalizeText(sourceLine);
    const matchedAlias = rule.aliases.map(normalizeText).filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .find((alias) => normalizedLine.includes(alias));
    const index = normalizedLine.indexOf(matchedAlias ?? "");
    const value = sourceLine.slice(index + (matchedAlias?.length ?? 0)).replace(/^[\s:–—-]+/, "").trim();
    return { value: value || "", sourceLine, status: value ? "review" : "missing" };
  }
  const date = sourceLine.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/);
  return { value: date?.[0] ?? "", sourceLine, status: date ? "review" : "missing" };
}

export function extractInvoice(lines, config) {
  validateConfig(config);
  const fields = Object.fromEntries(FIELD_DEFINITIONS.map((definition) => [
    definition.id,
    { ...extractConfiguredField(lines, config.fields[definition.id]), kind: definition.kind },
  ]));
  const info = Object.fromEntries(INFO_DEFINITIONS.map((definition) => [
    definition.id,
    extractInfo(lines, definition, config.info[definition.id]),
  ]));
  return { fields, info };
}

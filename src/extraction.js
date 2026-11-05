export const STORAGE_KEY = "energia-clara-rules-v1";
export const DEFAULT_METER_NUMBER = "15787805";

export const FIELD_DEFINITIONS = [
  {
    id: "consumo_fora_ponta",
    label: "Consumo Fora de Ponta (kWh)",
    kind: "number",
    measure: "ENRG ATV",
    posts: ["F PONTA", "F PONTA INDU"],
    operation: "sum",
  },
  {
    id: "consumo_na_ponta",
    label: "Consumo Na Ponta (kWh)",
    kind: "number",
    measure: "ENRG ATV",
    posts: ["PONTA"],
    operation: "first",
  },
  {
    id: "demanda_contratada_ponta",
    label: "Demanda Contratada Na Ponta (kW)",
    kind: "number",
    measure: "DEMANDA CONTRATADA",
    posts: ["PONTA"],
    operation: "first",
  },
  {
    id: "demanda_contratada_fora_ponta",
    label: "Demanda Contratada Fora de Ponta (kW)",
    kind: "number",
    measure: "DEMANDA CONTRATADA",
    posts: ["FORA PONTA", "F PONTA"],
    operation: "first",
  },
  {
    id: "demanda_faturada_fora_ponta",
    label: "Demanda Faturada no Mês Fora de Ponta (kW)",
    kind: "number",
    measure: "DEMANDA",
    posts: ["F PONTA INDU"],
    operation: "first",
  },
  {
    id: "demanda_faturada_ponta",
    label: "Demanda Faturada no Mês Na Ponta (kW)",
    kind: "number",
    measure: "DEMANDA",
    posts: ["F PONTA CAP"],
    operation: "first",
  },
  {
    id: "energia_reativa_fora_ponta",
    label: "Energia Reativa no Mês Fora de Ponta (kVArh)",
    kind: "number",
    measure: "ENRG RTV",
    posts: ["F PONTA INDU"],
    operation: "first",
  },
  {
    id: "energia_reativa_ponta",
    label: "Energia Reativa no Mês Na Ponta (kVArh)",
    kind: "number",
    measure: "ENRG RTV",
    posts: ["PONTA"],
    operation: "first",
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

const LEGACY_FIELD_IDS = [
  "consumo_fora_ponta",
  "consumo_na_ponta",
  "demanda_contratada_ponta",
  "demanda_contratada_fora_ponta",
  "demanda_faturada_fora_ponta",
  "demanda_faturada_ponta",
  "energia_reativa_fora_ponta",
  "energia_reativa_ponta",
  "valor_bruto",
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
    version: 3,
    meterNumber: DEFAULT_METER_NUMBER,
    info: Object.fromEntries(INFO_DEFINITIONS.map(({ id, aliases }) => [id, { aliases: [...aliases] }])),
  };
}

export function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("O arquivo não contém uma configuração compatível.");
  }
  if (config.version === 1) config = migrateLegacyConfig(config);
  else if (config.version === 2) config = migrateVersionTwoConfig(config);
  if (config.version !== 3 || !config.info || typeof config.info !== "object") {
    throw new Error("O arquivo não contém uma configuração compatível.");
  }
  if (typeof config.meterNumber !== "string" || !/^\d{1,30}$/.test(config.meterNumber.trim())) {
    throw new Error("Informe um número de medidor formado apenas por dígitos.");
  }
  if (config.meterNumber !== config.meterNumber.trim()) config = { ...config, meterNumber: config.meterNumber.trim() };
  for (const info of INFO_DEFINITIONS) {
    if (!config.info[info.id] || !Array.isArray(config.info[info.id].aliases) ||
      config.info[info.id].aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Regra inválida para "${info.label}".`);
    }
  }
  return config;
}

function migrateLegacyConfig(config) {
  if (!config.fields || !config.info || typeof config.fields !== "object" || typeof config.info !== "object") {
    throw new Error("O arquivo não contém uma configuração compatível.");
  }
  for (const id of LEGACY_FIELD_IDS) {
    const rule = config.fields[id];
    if (!rule || !Array.isArray(rule.aliases) || !["first", "last", "sum"].includes(rule.operation) ||
      !Number.isInteger(rule.valueIndex) || rule.valueIndex < -1 || rule.valueIndex > 50 ||
      rule.aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Regra inválida para "${id}".`);
    }
  }
  const migrated = createDefaultConfig();
  for (const definition of INFO_DEFINITIONS) {
    const aliases = config.info[definition.id]?.aliases;
    if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Regra inválida para "${definition.label}".`);
    }
    migrated.info[definition.id].aliases = [...aliases];
  }
  return migrated;
}

function migrateVersionTwoConfig(config) {
  if (typeof config.meterNumber !== "string" || !config.info || typeof config.info !== "object") {
    throw new Error("O arquivo não contém uma configuração compatível.");
  }
  const migrated = createDefaultConfig();
  migrated.meterNumber = config.meterNumber;
  for (const definition of INFO_DEFINITIONS) {
    const aliases = config.info[definition.id]?.aliases;
    if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`Regra inválida para "${definition.label}".`);
    }
    migrated.info[definition.id].aliases = [...aliases];
  }
  return migrated;
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

function isNumericToken(token) {
  return /^-?\d+(?:[.,]\d+)*$/.test(token);
}

export function parseMeasurementLine(line, meterNumber = DEFAULT_METER_NUMBER, index = 0) {
  const parts = String(line).trim().split(/\s+/);
  if (!parts[0]?.startsWith(meterNumber)) return null;

  let cursor = 1;
  const measureParts = [];
  while (cursor < parts.length && parts[cursor] !== "PONTA" && parts[cursor] !== "F") {
    measureParts.push(parts[cursor]);
    cursor += 1;
  }
  if (cursor === parts.length || measureParts.length === 0) return null;

  const postParts = [];
  while (cursor < parts.length && !isNumericToken(parts[cursor])) {
    postParts.push(parts[cursor]);
    cursor += 1;
  }
  if (!postParts.length) return null;

  let skippedReadings = 0;
  while (cursor < parts.length && skippedReadings < 3) {
    if (isNumericToken(parts[cursor])) skippedReadings += 1;
    cursor += 1;
  }
  if (skippedReadings !== 3 || cursor >= parts.length || !isNumericToken(parts[cursor])) return null;

  const value = parseLocalizedNumber(parts[cursor]);
  if (value === null || value <= 0) return null;
  return {
    measure: measureParts.join(" "),
    post: postParts.join(" "),
    value,
    sourceLine: String(line),
    index,
  };
}

function extractMeasurementField(measurements, definition) {
  const measure = normalizeText(definition.measure);
  const posts = definition.posts.map(normalizeText);
  const matches = measurements.filter((item) => {
    const normalizedPost = normalizeText(item.post);
    return normalizeText(item.measure).includes(measure) &&
      posts.some((post) => normalizedPost === post || normalizedPost.startsWith(`${post} `));
  });
  if (!matches.length) return { value: null, sourceLine: "", status: "missing" };
  const selected = definition.operation === "sum" ? matches : matches.slice(0, 1);
  return {
    value: selected.reduce((total, item) => total + item.value, 0),
    sourceLine: selected.map((item) => item.sourceLine).join("\n"),
    status: "review",
  };
}

function extractContractedDemand(lines, measurements, definition) {
  const label = normalizeText("DEMANDA CONTRATADA");
  const matchesPost = (sourceLine) => {
    const normalized = normalizeText(sourceLine);
    const labelIndex = normalized.indexOf(label);
    if (labelIndex < 0) return false;
    const remainder = normalized.slice(labelIndex + label.length);
    const isOutsidePeak = /\b(?:FORA(?: DE)? PONTA|F PONTA)\b/.test(remainder);
    const isPeak = /\bPONTA\b/.test(remainder) && !isOutsidePeak;
    return definition.id === "demanda_contratada_fora_ponta" ? isOutsidePeak : isPeak;
  };
  const meterMeasurement = measurements.find((item) =>
    normalizeText(item.measure).includes(label) && matchesPost(item.sourceLine),
  );
  if (meterMeasurement) {
    return { value: meterMeasurement.value, sourceLine: meterMeasurement.sourceLine, status: "review" };
  }

  const match = lines.find(matchesPost);
  if (!match) return { value: null, sourceLine: "", status: "missing" };
  const labelMatch = match.match(/DEMANDA\s+CONTRATADA/i);
  const value = extractNumberCandidates(match.slice((labelMatch?.index ?? 0) + label.length)).at(-1);
  return value === undefined
    ? { value: null, sourceLine: "", status: "missing" }
    : { value, sourceLine: match, status: "review" };
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
  config = validateConfig(config);
  const measurements = lines
    .map((line, index) => parseMeasurementLine(line, config.meterNumber, index))
    .filter(Boolean);
  const fields = Object.fromEntries(FIELD_DEFINITIONS.map((definition) => {
    let result;
    if (definition.id === "demanda_contratada_ponta" || definition.id === "demanda_contratada_fora_ponta") {
      result = extractContractedDemand(lines, measurements, definition);
    } else if (definition.measure) {
      result = extractMeasurementField(measurements, definition);
    } else {
      result = extractConfiguredField(lines, definition);
    }
    return [definition.id, { ...result, kind: definition.kind }];
  }));
  const info = Object.fromEntries(INFO_DEFINITIONS.map((definition) => [
    definition.id,
    extractInfo(lines, definition, config.info[definition.id]),
  ]));
  return { fields, info };
}

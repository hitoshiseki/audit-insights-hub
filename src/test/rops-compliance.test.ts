import { describe, it, expect } from "vitest";
import type { AuditRow, ParsedQuestion, ResponseValue } from "@/types/audit";
import {
  adherenceOf,
  adherenceTone,
  classifyRop,
  computeRopResults,
  formatPct,
  globalKpis,
  groupByArea,
  groupByMonth,
  groupByRop,
  normalizeRopKey,
  sortByAdherence,
} from "@/lib/rops-compliance";
import { ROP_AREAS, ROP_META, ropMetaOf, type RopLevel } from "@/lib/rop-levels";

/** Monta as ParsedQuestion de uma ROP com N testes. */
function questionsFor (rop: string, count: number): ParsedQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    category: rop,
    number: i + 1,
    text: `Teste ${i + 1}`,
    fullHeader: `${rop} [${i + 1}- Teste ${i + 1}]`,
  }));
}

/** Uma auditoria com as respostas informadas, na ordem dos testes de cada ROP. */
function row (
  answers: Record<string, (ResponseValue | null)[]>,
  overrides: Partial<AuditRow> = {}
): AuditRow {
  const responses: Record<string, ResponseValue | null> = {};
  for (const [rop, values] of Object.entries(answers)) {
    values.forEach((value, i) => {
      responses[`${rop} [${i + 1}- Teste ${i + 1}]`] = value;
    });
  }
  return {
    timestamp: new Date(2026, 0, 20, 9, 0),
    auditor: "Auditor A",
    auditDate: new Date(2026, 0, 15),
    sector: "UTI Adulto",
    leadershipPresent: "Sim",
    responses,
    ...overrides,
  };
}

const C: ResponseValue = "CONFORME";
const NC: ResponseValue = "NÃO CONFORME";
const NA: ResponseValue = "NÃO SE APLICA";

describe("normalizeRopKey", () => {
  it("colapsa espaços duplicados, apara as pontas e sobe a caixa", () => {
    expect(normalizeRopKey("  ROP  X ")).toBe("ROP X");
    expect(normalizeRopKey("Rop x")).toBe("ROP X");
  });

  it("agrupa como uma só ROP cabeçalhos que diferem apenas por espaços", () => {
    const questions = [...questionsFor("ROP  X", 1), ...questionsFor("ROP X ", 1)];
    // Os fullHeader diferem, então o segundo teste vira o nº 1 de outro cabeçalho.
    const groups = groupByRop(computeRopResults([row({})], questions));
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("ROP X");
  });
});

describe("classifyRop — exemplos da especificação", () => {
  it("Exemplo 1: CONFORME, CONFORME, NÃO SE APLICA, CONFORME → CONFORME", () => {
    const questions = questionsFor("ROP A", 4);
    const [result] = computeRopResults([row({ "ROP A": [C, C, NA, C] })], questions);
    expect(result.result).toBe("CONFORME");
    expect(result.applicable).toBe(3);
    expect(result.naoSeAplica).toBe(1);
  });

  it("Exemplo 2: uma única NÃO CONFORME reprova a ROP inteira", () => {
    const questions = questionsFor("ROP A", 4);
    const [result] = computeRopResults([row({ "ROP A": [C, NC, NA, C] })], questions);
    expect(result.result).toBe("NÃO CONFORME");
  });

  it("Exemplo 3: todos NÃO SE APLICA → NÃO AVALIADA", () => {
    const questions = questionsFor("ROP A", 3);
    const [result] = computeRopResults([row({ "ROP A": [NA, NA, NA] })], questions);
    expect(result.result).toBe("NÃO AVALIADA");
    expect(result.applicable).toBe(0);
    expect(result.adherencePercent).toBeNull();
  });

  it("célula vazia vira SEM RESPOSTA e torna a ROP INCOMPLETA", () => {
    const questions = questionsFor("ROP A", 3);
    const [result] = computeRopResults([row({ "ROP A": [C, null, C] })], questions);
    expect(result.result).toBe("INCOMPLETA");
    expect(result.semResposta).toBe(1);
  });

  it("INCOMPLETA vence NÃO AVALIADA quando há vazio junto de NÃO SE APLICA", () => {
    expect(classifyRop({ totalTests: 3, conforme: 0, naoConforme: 0, naoSeAplica: 2, semResposta: 1 }))
      .toBe("INCOMPLETA");
  });

  it("a adesão da linha é informativa e não muda a classificação binária", () => {
    const questions = questionsFor("ROP A", 4);
    const [result] = computeRopResults([row({ "ROP A": [C, C, C, NC] })], questions);
    expect(result.adherencePercent).toBe(75);
    expect(result.result).toBe("NÃO CONFORME");
  });
});

describe("adherenceOf", () => {
  const questions = [...questionsFor("ROP A", 2), ...questionsFor("ROP B", 2), ...questionsFor("ROP C", 2)];
  const rows = [
    row({ "ROP A": [C, C], "ROP B": [C, NC], "ROP C": [NA, NA] }),
    row({ "ROP A": [C, C], "ROP B": [C, null], "ROP C": [NA, NA] }),
  ];
  const results = computeRopResults(rows, questions);

  it("exclui NÃO AVALIADA do numerador e do denominador", () => {
    const adherence = adherenceOf(results);
    expect(adherence.naoAvaliada).toBe(2);
    expect(adherence.evaluated).toBe(4); // 2 conformes + 1 não conforme + 1 incompleta
    expect(adherence.conforme).toBe(2);
    expect(adherence.percent).toBe(50);
  });

  it("mantém INCOMPLETA no denominador, nunca no numerador", () => {
    const incomplete = results.filter((r) => r.result === "INCOMPLETA");
    expect(incomplete).toHaveLength(1);
    const adherence = adherenceOf(incomplete);
    expect(adherence.conforme).toBe(0);
    expect(adherence.evaluated).toBe(1);
    expect(adherence.percent).toBe(0);
  });

  it("percent é null quando não há nenhuma ROP avaliada", () => {
    const naoAvaliadas = results.filter((r) => r.result === "NÃO AVALIADA");
    expect(adherenceOf(naoAvaliadas).percent).toBeNull();
    expect(formatPct(adherenceOf(naoAvaliadas).percent)).toBe("—");
  });
});

describe("globalKpis", () => {
  it("conta auditorias, setores e ROPs distintos", () => {
    const questions = [...questionsFor("ROP A", 1), ...questionsFor("ROP B", 1)];
    const rows = [
      row({ "ROP A": [C], "ROP B": [NC] }),
      row({ "ROP A": [C], "ROP B": [C] }, { sector: "Pronto Atendimento" }),
    ];
    const kpis = globalKpis(computeRopResults(rows, questions));
    expect(kpis.totalAudits).toBe(2);
    expect(kpis.totalSectors).toBe(2);
    expect(kpis.totalRops).toBe(2);
    expect(kpis.totalResults).toBe(4);
    expect(kpis.percent).toBe(75);
  });
});

describe("agrupamento temporal", () => {
  it("usa a Data da Auditoria, não o carimbo de envio do formulário", () => {
    const questions = questionsFor("ROP A", 1);
    const rows = [
      row({ "ROP A": [C] }, {
        auditDate: new Date(2026, 0, 15),
        timestamp: new Date(2026, 2, 30, 10, 0), // enviado em março
      }),
      row({ "ROP A": [NC] }, {
        auditDate: new Date(2026, 1, 10),
        timestamp: new Date(2026, 2, 31, 10, 0),
      }),
    ];
    const months = groupByMonth(computeRopResults(rows, questions));
    expect(months.map((m) => m.key)).toEqual(["2026-01", "2026-02"]);
    expect(months[0].percent).toBe(100);
    expect(months[1].percent).toBe(0);
  });
});

describe("formatPct e adherenceTone", () => {
  it("formata com uma casa decimal em pt-BR", () => {
    expect(formatPct(79.05)).toBe("79,1%");
    expect(formatPct(100)).toBe("100,0%");
    expect(formatPct(null)).toBe("—");
  });

  it("aplica os limites de 70 e 50", () => {
    expect(adherenceTone(70)).toBe("good");
    expect(adherenceTone(69.9)).toBe("warn");
    expect(adherenceTone(50)).toBe("warn");
    expect(adherenceTone(49.9)).toBe("bad");
    expect(adherenceTone(null)).toBe("none");
  });
});

describe("sortByAdherence", () => {
  it("joga as ROPs sem avaliação para o fim, nas duas direções", () => {
    const groups = [
      { key: "a", label: "A", conforme: 1, naoConforme: 1, incompleta: 0, naoAvaliada: 0, evaluated: 2, percent: 50 },
      { key: "b", label: "B", conforme: 0, naoConforme: 0, incompleta: 0, naoAvaliada: 3, evaluated: 0, percent: null },
      { key: "c", label: "C", conforme: 2, naoConforme: 0, incompleta: 0, naoAvaliada: 0, evaluated: 2, percent: 100 },
    ];
    expect(sortByAdherence(groups, "desc").map((g) => g.key)).toEqual(["c", "a", "b"]);
    expect(sortByAdherence(groups, "asc").map((g) => g.key)).toEqual(["a", "c", "b"]);
  });
});

/** As 30 ROPs como aparecem na planilha real do HMUE. */
const REAL_ROPS = [
  "DIVULGAÇÃO DE INCIDENTES SOBRE A SEGURANÇA DO PACIENTE",
  "GESTÃO DE INCIDENTES SOBRE A SEGURANÇA DOS PACIENTES (notificação adversa)",
  "RELATÓRIOS TRIMESTRAIS SOBRE A SEGURANÇA DOS PACIENTES",
  "RESPONSABILIZAÇÃO PELA QUALIDADE",
  "IDENTIFICAÇÃO DO PACIENTE",
  "LISTA DE ABREVIAÇÕES PERIGOSAS - LAP",
  "CONCILIAÇÃO MEDICAMENTOSA COMO PRIORIDADE ESTRATÉGICA",
  "CONCILIAÇÃO MEDICAMENTOSA NAS TRANSIÇÕES DE CUIDADO",
  "LISTA DE VERIFICAÇÃO PARA CIRURGIA SEGURA",
  "TRANSFERÊNCIA DE INFORMAÇÕES NAS TRANSIÇÕES DE CUIDADO",
  "USO RACIONAL DE ANTIMICROBIANOS",
  "ELETRÓLITOS CONCENTRADOS",
  "SEGURANÇA NO USO DA HEPARINA",
  "MEDICAÇÃO DE ALTA VIGILÂNCIA - MAV",
  "SEGURANÇA DAS BOMBAS DE INFUSÃO - BIC",
  "SEGURANÇA DOS NARCÓTICOS",
  "PROGRAMA DE MANUTENÇÃO PREVENTIVA",
  "SEGURANÇA DO PACIENTE: CAPACITAÇÃO E TREINAMENTO",
  "PREVENÇÃO DE VIOLÊNCIA NO LOCAL DE TRABALHO",
  "FLUXO DE PACIENTES",
  "PLANO DE SEGURANÇA DO PACIENTE",
  "ADESÃO ÀS PRÁTICAS DE HIGIENE DAS MÃOS",
  "HIGIENE DAS MÃOS: CAPACITAÇÃO E TREINAMENTO",
  "TAXAS DE INFECÇÃO",
  "REPROCESSAMENTO",
  "PREVENÇÃO DE QUEDAS E REDUÇÃO DE DANOS",
  "PREVENÇÃO DE LESÃO POR PRESSÃO",
  "TRATAMENTO DA PELE E FERIDAS",
  "PROFILAXIA PARA TROMBOEMBOLISMO VENOSO - TEV",
  "PREVENÇÃO DE SUICÍDIO",
];

describe("mapa de níveis e áreas (assets/rop_nivel.pdf)", () => {
  it("resolve as 30 ROPs da planilha real", () => {
    const unmapped = REAL_ROPS.filter((name) => ropMetaOf(normalizeRopKey(name)) === null);
    expect(unmapped).toEqual([]);
  });

  it("distribui os níveis como na tabela QGA", () => {
    const byLevel: Record<RopLevel, number> = { Diamante: 0, Platina: 0, Ouro: 0 };
    for (const name of REAL_ROPS) {
      byLevel[ropMetaOf(normalizeRopKey(name))!.level]++;
    }
    expect(byLevel).toEqual({ Diamante: 3, Platina: 10, Ouro: 17 });
  });

  it("distribui as áreas como na tabela QGA", () => {
    const byArea = new Map<string, number>(ROP_AREAS.map((a) => [a, 0]));
    for (const name of REAL_ROPS) {
      const area = ropMetaOf(normalizeRopKey(name))!.area;
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    expect(ROP_AREAS.map((a) => byArea.get(a))).toEqual([4, 6, 6, 5, 4, 5]);
  });

  it("toda entrada do mapa aponta para uma área conhecida", () => {
    for (const meta of Object.values(ROP_META)) {
      expect(ROP_AREAS).toContain(meta.area);
    }
  });

  it("propaga nível e área para os resultados consolidados", () => {
    const questions = questionsFor("RESPONSABILIZAÇÃO PELA QUALIDADE", 1);
    const [result] = computeRopResults([row({ "RESPONSABILIZAÇÃO PELA QUALIDADE": [C] })], questions);
    expect(result.ropLevel).toBe("Diamante");
    expect(result.ropArea).toBe("Cultura de segurança");

    const areas = groupByArea([result]);
    expect(areas[0].label).toBe("Cultura de segurança");
  });
});

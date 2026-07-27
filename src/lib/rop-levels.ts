import {
  AlertTriangle,
  Biohazard,
  MessagesSquare,
  Pill,
  ShieldPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Nível e área de segurança de cada ROP, conforme a tabela QGA
 * "Práticas Organizacionais Obrigatórias" (assets/rop_nivel.pdf).
 *
 * O mapa é explícito e NUNCA por similaridade de string: a nomenclatura do PDF
 * diverge da planilha do HMUE em vários pontos — "Identificação do cliente" vs
 * "IDENTIFICAÇÃO DO PACIENTE", "Prevenção de úlceras de pressão" vs
 * "PREVENÇÃO DE LESÃO POR PRESSÃO", "transições de atendimento" vs
 * "TRANSIÇÕES DE CUIDADO", entre outros.
 */

export type RopLevel = "Diamante" | "Platina" | "Ouro";

export const ROP_LEVEL_ORDER: RopLevel[] = ["Diamante", "Platina", "Ouro"];

export const AREA_CULTURA = "Cultura de segurança";
export const AREA_COMUNICACAO = "Comunicação";
export const AREA_MEDICAMENTOS = "Uso de medicamentos";
export const AREA_VIDA_PROFISSIONAL = "Vida profissional / Força de trabalho";
export const AREA_INFECCOES = "Controle de infecções";
export const AREA_RISCO = "Avaliação de risco";

/** Na ordem do PDF, que é a mesma ordem exibida na faixa "Adesão por categoria". */
export const ROP_AREAS: string[] = [
  AREA_CULTURA,
  AREA_COMUNICACAO,
  AREA_MEDICAMENTOS,
  AREA_VIDA_PROFISSIONAL,
  AREA_INFECCOES,
  AREA_RISCO,
];

export interface RopMeta {
  level: RopLevel;
  area: string;
}

/**
 * Chaveado por normalizeRopKey() — trim + colapso de espaços + caixa alta —
 * usando o nome da ROP como aparece na planilha.
 */
export const ROP_META: Record<string, RopMeta> = {
  // Cultura de segurança
  "RESPONSABILIZAÇÃO PELA QUALIDADE": { level: "Diamante", area: AREA_CULTURA },
  "GESTÃO DE INCIDENTES SOBRE A SEGURANÇA DOS PACIENTES (NOTIFICAÇÃO ADVERSA)": { level: "Ouro", area: AREA_CULTURA },
  "RELATÓRIOS TRIMESTRAIS SOBRE A SEGURANÇA DOS PACIENTES": { level: "Ouro", area: AREA_CULTURA },
  "DIVULGAÇÃO DE INCIDENTES SOBRE A SEGURANÇA DO PACIENTE": { level: "Platina", area: AREA_CULTURA },

  // Comunicação
  "IDENTIFICAÇÃO DO PACIENTE": { level: "Ouro", area: AREA_COMUNICACAO },
  "LISTA DE ABREVIAÇÕES PERIGOSAS - LAP": { level: "Ouro", area: AREA_COMUNICACAO },
  "CONCILIAÇÃO MEDICAMENTOSA COMO PRIORIDADE ESTRATÉGICA": { level: "Diamante", area: AREA_COMUNICACAO },
  "CONCILIAÇÃO MEDICAMENTOSA NAS TRANSIÇÕES DE CUIDADO": { level: "Diamante", area: AREA_COMUNICACAO },
  "LISTA DE VERIFICAÇÃO PARA CIRURGIA SEGURA": { level: "Ouro", area: AREA_COMUNICACAO },
  "TRANSFERÊNCIA DE INFORMAÇÕES NAS TRANSIÇÕES DE CUIDADO": { level: "Platina", area: AREA_COMUNICACAO },

  // Uso de medicamentos
  "USO RACIONAL DE ANTIMICROBIANOS": { level: "Platina", area: AREA_MEDICAMENTOS },
  "ELETRÓLITOS CONCENTRADOS": { level: "Ouro", area: AREA_MEDICAMENTOS },
  "SEGURANÇA NO USO DA HEPARINA": { level: "Ouro", area: AREA_MEDICAMENTOS },
  "MEDICAÇÃO DE ALTA VIGILÂNCIA - MAV": { level: "Ouro", area: AREA_MEDICAMENTOS },
  "SEGURANÇA DAS BOMBAS DE INFUSÃO - BIC": { level: "Platina", area: AREA_MEDICAMENTOS },
  "SEGURANÇA DOS NARCÓTICOS": { level: "Ouro", area: AREA_MEDICAMENTOS },

  // Vida profissional / Força de trabalho
  "PROGRAMA DE MANUTENÇÃO PREVENTIVA": { level: "Ouro", area: AREA_VIDA_PROFISSIONAL },
  "SEGURANÇA DO PACIENTE: CAPACITAÇÃO E TREINAMENTO": { level: "Ouro", area: AREA_VIDA_PROFISSIONAL },
  "PREVENÇÃO DE VIOLÊNCIA NO LOCAL DE TRABALHO": { level: "Ouro", area: AREA_VIDA_PROFISSIONAL },
  "FLUXO DE PACIENTES": { level: "Ouro", area: AREA_VIDA_PROFISSIONAL },
  "PLANO DE SEGURANÇA DO PACIENTE": { level: "Ouro", area: AREA_VIDA_PROFISSIONAL },

  // Controle de infecções
  "ADESÃO ÀS PRÁTICAS DE HIGIENE DAS MÃOS": { level: "Platina", area: AREA_INFECCOES },
  "HIGIENE DAS MÃOS: CAPACITAÇÃO E TREINAMENTO": { level: "Ouro", area: AREA_INFECCOES },
  "TAXAS DE INFECÇÃO": { level: "Ouro", area: AREA_INFECCOES },
  REPROCESSAMENTO: { level: "Ouro", area: AREA_INFECCOES },

  // Avaliação de risco
  "PREVENÇÃO DE QUEDAS E REDUÇÃO DE DANOS": { level: "Platina", area: AREA_RISCO },
  "PREVENÇÃO DE LESÃO POR PRESSÃO": { level: "Platina", area: AREA_RISCO },
  "PREVENÇÃO DE SUICÍDIO": { level: "Platina", area: AREA_RISCO },
  "PROFILAXIA PARA TROMBOEMBOLISMO VENOSO - TEV": { level: "Platina", area: AREA_RISCO },
  "TRATAMENTO DA PELE E FERIDAS": { level: "Platina", area: AREA_RISCO },

  // Consta no PDF, mas não existe na planilha do HMUE.
  "AVALIAÇÃO DE RISCO DE SEGURANÇA DOMICILIAR": { level: "Platina", area: AREA_RISCO },
};

export function ropMetaOf (ropKey: string): RopMeta | null {
  return ROP_META[ropKey] ?? null;
}

export const ROP_LEVEL_COLORS: Record<RopLevel, string> = {
  Diamante: "hsl(190, 75%, 42%)",
  Platina: "hsl(215, 16%, 52%)",
  Ouro: "hsl(38, 92%, 45%)",
};

/** Símbolo compacto usado onde não cabe o badge inteiro (eixo de gráfico). */
export const ROP_LEVEL_SYMBOLS: Record<RopLevel, string> = {
  Diamante: "◆",
  Platina: "▰",
  Ouro: "●",
};

export const ROP_AREA_ICONS: Record<string, LucideIcon> = {
  [AREA_CULTURA]: ShieldPlus,
  [AREA_COMUNICACAO]: MessagesSquare,
  [AREA_MEDICAMENTOS]: Pill,
  [AREA_VIDA_PROFISSIONAL]: Users,
  [AREA_INFECCOES]: Biohazard,
  [AREA_RISCO]: AlertTriangle,
};

export interface RealExamQuestionRecord {
  id: string;
  provaOrigem: string;
  banca: string;
  numeroQuestao: string;
  paginaPdf: string;
  assuntoCobrado: string;
  habilidadeExigida: string;
  conteudoSecundario: string;
  codigoEdital: string;
  vinculoTipo: 'direto' | 'correlato' | 'nao_classificado';
  vinculoBruto: string;
  enunciadoOpcional?: string;
  gabaritoOpcional?: string;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(headerLine: string): string {
  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (const ch of headerLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === ',') commas += 1;
      else if (ch === ';') semis += 1;
    }
  }
  return semis > commas ? ';' : ',';
}

function classifyVinculo(raw: string): 'direto' | 'correlato' | 'nao_classificado' {
  const norm = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (norm.includes('diret')) return 'direto';
  if (norm.includes('correlat') || norm.includes('indiret')) return 'correlato';
  return 'nao_classificado';
}

export function parseBaseQuestoesCsv(csvText: string): {
  records: RealExamQuestionRecord[];
  errors: string[];
} {
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return { records: [], errors: ['O conteúdo CSV está vazio.'] };
  }

  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      records: [],
      errors: ['O arquivo CSV precisa conter cabeçalho e ao menos uma linha de questão.'],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = splitCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeHeader);

  const findCol = (patterns: string[]): number => {
    for (const pat of patterns) {
      const idx = headers.findIndex((h) => h.includes(pat));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colProva = findCol(['prova_de_origem', 'prova_origem', 'prova']);
  const colBanca = findCol(['banca']);
  const colNumero = findCol(['numero_da_questao', 'numero_questao', 'questao', 'num']);
  const colPagina = findCol(['pagina_do_pdf', 'pagina_pdf', 'pagina', 'pag']);
  const colAssunto = findCol(['assunto_efetivamente', 'assunto_cobrado', 'assunto', 'tema']);
  const colHabilidade = findCol(['habilidade_exigida', 'habilidade']);
  const colSecundario = findCol(['conteudo_secundario', 'secundario']);
  const colCodigo = findCol(['codigo_do_edital', 'codigo_edital', 'codigo', 'cod']);
  const colVinculo = findCol(['vinculo', 'direto_ou_correlato']);
  const colEnunciado = findCol(['enunciado', 'texto']);
  const colGabarito = findCol(['gabarito', 'resposta']);

  if (colAssunto === -1 && colProva === -1 && colCodigo === -1) {
    return {
      records: [],
      errors: [
        'Cabeçalho não reconhecido. Esperado formato compatível com Base_Questoes_Pareto.csv (Prova de origem, Banca, Número da questão, Página do PDF, Assunto efetivamente cobrado, Habilidade exigida, Conteúdo secundário, Código do edital, Vínculo).',
      ],
    };
  }

  const records: RealExamQuestionRecord[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r], delimiter);
    if (cols.every((c) => !c)) continue;

    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : '');
    const provaOrigem = get(colProva) || 'Prova não informada';
    const banca = get(colBanca) || 'Não informada';
    const numeroQuestao = get(colNumero) || String(r);
    const paginaPdf = get(colPagina) || '-';
    const assuntoCobrado = get(colAssunto) || 'Assunto não especificado';
    const habilidadeExigida = get(colHabilidade) || 'Não especificada';
    const conteudoSecundario = get(colSecundario) || '-';
    const codigoEdital = get(colCodigo) || '-';
    const vinculoBruto = get(colVinculo) || 'Não classificado';

    const idBase = `${provaOrigem}_${numeroQuestao}_${codigoEdital}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    records.push({
      id: `${idBase}_${r}`,
      provaOrigem,
      banca,
      numeroQuestao,
      paginaPdf,
      assuntoCobrado,
      habilidadeExigida,
      conteudoSecundario,
      codigoEdital,
      vinculoTipo: classifyVinculo(vinculoBruto),
      vinculoBruto,
      enunciadoOpcional: get(colEnunciado) || undefined,
      gabaritoOpcional: get(colGabarito) || undefined,
    });
  }

  return { records, errors: [] };
}

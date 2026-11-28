import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = "gemini-4-hydrogen";

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function handleGeminiError(res: express.Response, err: unknown) {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|503)\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : 500;

  if (
    rawMessage.includes("PERMISSION_DENIED") ||
    rawMessage.includes("API_KEY_INVALID") ||
    statusCode === 403 ||
    statusCode === 401
  ) {
    res.status(statusCode).json({
      error:
        "Chave da API Gemini ausente ou inválida. Verifique a configuração de GEMINI_API_KEY no painel Settings > Secrets.",
      code: "API_KEY_ERROR",
    });
    return;
  }

  if (rawMessage.includes("RESOURCE_EXHAUSTED") || statusCode === 429) {
    res.status(429).json({
      error:
        "Limite de requisições da API Gemini atingido no momento. Aguarde alguns instantes ou verifique a cota em Settings > Secrets.",
      code: "RATE_LIMIT",
    });
    return;
  }

  res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    error: `Falha ao consultar a inteligência pedagógica CESGRANRIO: ${rawMessage}`,
    code: "GEMINI_ERROR",
  });
}

const QUESTION_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rotuloTipo: {
      type: Type.STRING,
      description: 'Deve ser exatamente "QUESTÃO INÉDITA".',
    },
    perfilAplicado: { type: Type.STRING },
    codigoEdital: { type: Type.STRING },
    intersecaoPerfis: { type: Type.STRING },
    nivelDificuldade: { type: Type.INTEGER },
    nivelNome: {
      type: Type.STRING,
      description: "Reconhecimento | Aplicação | Interpretação | Integração",
    },
    habilidadeAvaliada: { type: Type.STRING },
    enunciado: { type: Type.STRING },
    alternativas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          letra: { type: Type.STRING, description: "A, B, C, D ou E" },
          texto: { type: Type.STRING },
          correta: { type: Type.BOOLEAN },
          tipoDistrator: {
            type: Type.STRING,
            description:
              "Para alternativas incorretas, o tipo de distrator técnico (ex.: Troca de unidades, Inversão física). Para a correta, 'Gabarito'.",
          },
          justificativa: {
            type: Type.STRING,
            description:
              "Explicação técnica individual do porquê esta alternativa está certa ou errada.",
          },
        },
        required: ["letra", "texto", "correta", "tipoDistrator", "justificativa"],
      },
    },
    gabaritoLetra: { type: Type.STRING },
    raciocinioResolucao: { type: Type.STRING },
    pegadinhaPrincipal: { type: Type.STRING },
    conhecimentoIndispensavel: { type: Type.STRING },
    recomendacaoRevisao: { type: Type.STRING },
  },
  required: [
    "rotuloTipo",
    "perfilAplicado",
    "codigoEdital",
    "intersecaoPerfis",
    "nivelDificuldade",
    "nivelNome",
    "habilidadeAvaliada",
    "enunciado",
    "alternativas",
    "gabaritoLetra",
    "raciocinioResolucao",
    "pegadinhaPrincipal",
    "conhecimentoIndispensavel",
    "recomendacaoRevisao",
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // 1. Professor IA — 9 Passos Metodologia CESGRANRIO
  app.post("/api/cesgranrio/teach", async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "GEMINI_API_KEY não configurada no servidor. Adicione a chave no painel Settings > Secrets para ativar o Professor IA CESGRANRIO.",
        code: "MISSING_API_KEY",
      });
      return;
    }

    const {
      systemInstruction,
      topicTitle,
      codigoEdital,
      macroName,
      resumoEstrategico,
      bancaPattern,
      keyTrap,
      isIntersection,
      otherProfileCode,
      customContext,
      realQuestionsContext,
    } = req.body ?? {};

    if (!topicTitle || !systemInstruction) {
      res.status(400).json({ error: "Tópico e instrução do perfil são obrigatórios." });
      return;
    }

    const userPrompt = `Ensine o tópico abaixo seguindo rigorosamente a Metodologia em 9 Passos do Professor IA — DNA DA BANCA CESGRANRIO:

TÓPICO DO EDITAL: ${topicTitle}
CÓDIGO DO EDITAL NO PERFIL ATIVO: ${codigoEdital || "Não especificado"}
INTERSEÇÃO ENTRE PERFIS: ${
      isIntersection
        ? `SIM — conteúdo em comum com o outro perfil (${otherProfileCode || "ambos os editais"}). Identifique expressamente essa interseção.`
        : "Conteúdo específico do perfil ativo."
    }
MACROÁREA: ${macroName || "Conhecimentos Específicos"}
ESCOPO ESTRATÉGICO DO PROJETO: ${resumoEstrategico || "-"}
PADRÃO CESGRANRIO OBSERVADO: ${bancaPattern || "-"}
PEGADINHA RECORRENTE: ${keyTrap || "-"}
${realQuestionsContext ? `REGISTROS REAIS DA BASE DO CANDIDATO:\n${realQuestionsContext}\n` : ""}
${customContext ? `OBSERVAÇÃO/ERRO DO CANDIDATO PARA REFORÇO:\n${customContext}\n` : ""}

Gere explicações visuais, objetivas e didáticas (Método Feynman + analogia prática + mecanismo + exemplos numéricos/técnicos limpos sem calculadora + pares conceituais que não podem ser confundidos + cobrança CESGRANRIO + pegadinhas + 1 questão comentada resolvida + 1 QUESTÃO INÉDITA com 5 alternativas A–E para testar a aprendizagem).`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tituloAula: { type: Type.STRING },
              intersecaoNota: { type: Type.STRING },
              passo1Fundamentacao: { type: Type.STRING },
              passo2AnalogiaPratica: { type: Type.STRING },
              passo3MecanismoFuncionamento: { type: Type.STRING },
              passo4ExemplosTecnicos: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              passo5NaoConfundir: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    conceitoA: { type: Type.STRING },
                    conceitoB: { type: Type.STRING },
                    diferencaChave: { type: Type.STRING },
                  },
                  required: ["conceitoA", "conceitoB", "diferencaChave"],
                },
              },
              passo6ComoCesgranrioCobra: { type: Type.STRING },
              passo7PegadinhasPrincipais: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              passo8QuestaoComentada: {
                type: Type.OBJECT,
                properties: {
                  rotulo: {
                    type: Type.STRING,
                    description: 'Rotule explicitamente como "QUESTÃO INÉDITA COMMENTADA (PADRÃO CESGRANRIO)".',
                  },
                  enunciado: { type: Type.STRING },
                  resolucaoPassoAPasso: { type: Type.STRING },
                  conclusaoTecnica: { type: Type.STRING },
                },
                required: ["rotulo", "enunciado", "resolucaoPassoAPasso", "conclusaoTecnica"],
              },
              passo9QuestaoTeste: QUESTION_ITEM_SCHEMA,
            },
            required: [
              "tituloAula",
              "intersecaoNota",
              "passo1Fundamentacao",
              "passo2AnalogiaPratica",
              "passo3MecanismoFuncionamento",
              "passo4ExemplosTecnicos",
              "passo5NaoConfundir",
              "passo6ComoCesgranrioCobra",
              "passo7PegadinhasPrincipais",
              "passo8QuestaoComentada",
              "passo9QuestaoTeste",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json({ lesson: parsed });
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  // 2. Gerador de Questões e Simulados CESGRANRIO (1 a 5 questões inéditas)
  app.post("/api/cesgranrio/generate-questions", async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "GEMINI_API_KEY não configurada no servidor. Adicione a chave no painel Settings > Secrets para gerar questões CESGRANRIO.",
        code: "MISSING_API_KEY",
      });
      return;
    }

    const {
      systemInstruction,
      topics,
      quantity = 1,
      difficultyLevel = 3,
      skillFocus,
      errorFocus,
      realQuestionsContext,
    } = req.body ?? {};

    const safeQty = Math.min(5, Math.max(1, Number(quantity) || 1));
    if (!systemInstruction || !Array.isArray(topics) || topics.length === 0) {
      res.status(400).json({ error: "Selecione pelo menos um tópico do edital ativo." });
      return;
    }

    const topicsBlock = topics
      .map(
        (t: any, i: number) =>
          `${i + 1}. [${t.codigoEdital || t.id}] ${t.subtopic} (${t.macroName}) | Interseção: ${
            t.isIntersection ? `Sim (${t.otherProfileCode || "ambos"})` : "Exclusivo do perfil ativo"
          } | Escopo: ${t.resumoEstrategico || "-"} | Padrão/Armadilha: ${t.keyTrap || "-"}`
      )
      .join("\n");

    const userPrompt = `Elabore exatamente ${safeQty} questão(ões) inédita(s) no padrão CESGRANRIO para o perfil ativo.

TÓPICO(S) SELECIONADO(S):
${topicsBlock}

PARÂMETROS PEDAGÓGICOS OBRIGATÓRIOS:
- Nível de Dificuldade Alvo: Nível ${difficultyLevel} (1=Reconhecimento, 2=Aplicação, 3=Interpretação, 4=Integração).
- Habilidade Cognitiva Prioritária: ${skillFocus || "Selecionar a mais aderente ao tópico (Identificar, Diferenciar, Interpretar, Calcular, Aplicar, Relacionar, Analisar, Reconhecer condições de funcionamento ou Avaliar resultados)"}.
- Rotulagem obrigatória: rotuloTipo = "QUESTÃO INÉDITA". Nunca simule ser questão oficial aplicada.
- Exatamente 5 alternativas (A, B, C, D, E), com apenas 1 correta (correta = true) e 4 distratores tecnicamente plausíveis baseados em erros reais (troca de unidades, inversão física, confusão de equipamentos, erro de sinal, interpretação incompleta, etc.), cada um com justificativa técnica individual.
- Cálculos numéricos limpos (sem necessidade de calculadora).
${errorFocus ? `- FOCO DE REFORÇO DE ERRO DO CANDIDATO: ${errorFocus}\n` : ""}
${realQuestionsContext ? `- REFERÊNCIAS DA BASE REAL DO CANDIDATO:\n${realQuestionsContext}\n` : ""}`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: QUESTION_ITEM_SCHEMA,
              },
            },
            required: ["questions"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json({ questions: Array.isArray(parsed.questions) ? parsed.questions : [] });
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  // 3. Analisador de Questões Reais (TP 2018 / TP 2023.1 / Base_Questoes_Pareto.csv)
  app.post("/api/cesgranrio/analyze-real", async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "GEMINI_API_KEY não configurada no servidor. Adicione a chave no painel Settings > Secrets para analisar questões reais.",
        code: "MISSING_API_KEY",
      });
      return;
    }

    const { systemInstruction, questionText, csvMetadata, profileTopicsSummary } = req.body ?? {};
    if (!systemInstruction || (!questionText && !csvMetadata)) {
      res.status(400).json({ error: "Informe o enunciado ou selecione um registro da base real." });
      return;
    }

    const userPrompt = `Analise a QUESTÃO REAL abaixo segundo as 8 dimensões de análise histórica da CESGRANRIO (Seção 10) e as Regras de Precisão (Seção 14):

${
  csvMetadata
    ? `METADADOS DA BASE CLASSIFICADA (Base_Questoes_Pareto.csv):
- Prova de origem: ${csvMetadata.provaOrigem}
- Banca registrada: ${csvMetadata.banca}
- Número da questão: ${csvMetadata.numeroQuestao} | Página PDF: ${csvMetadata.paginaPdf}
- Assunto efetivamente cobrado: ${csvMetadata.assuntoCobrado}
- Habilidade exigida: ${csvMetadata.habilidadeExigida}
- Conteúdo secundário: ${csvMetadata.conteudoSecundario}
- Código do edital: ${csvMetadata.codigoEdital}
- Vínculo declarado: ${csvMetadata.vinculoBruto}\n`
    : ""
}
${questionText ? `TEXTO / ENUNCIADO DA QUESTÃO REAL:\n${questionText}\n` : "Nota: apenas os metadados estruturados da questão real foram fornecidos; baseie a análise estritamente nesses metadados sem inventar texto de alternativas não informadas."}

${profileTopicsSummary ? `TÓPICOS DO PERFIL ATIVO PARA CORRELAÇÃO:\n${profileTopicsSummary}\n` : ""}

ATENÇÃO ÀS REGRAS DE PRECISÃO:
- Rotule claramente como "QUESTÃO REAL".
- Se o enunciado completo não foi colado, NÃO invente alternativas A–E; analise os padrões de distratores típicos daquela habilidade/assunto deixando claro o que vem dos metadados reais e o que é orientação técnica.
- Não utilize prova de outra banca que não seja CESGRANRIO como evidência direta do estilo CESGRANRIO.`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rotuloTipo: {
                type: Type.STRING,
                description: 'Sempre "QUESTÃO REAL".',
              },
              avisoPrecisaoBanca: { type: Type.STRING },
              conteudoCobrado: { type: Type.STRING },
              habilidadeExigida: { type: Type.STRING },
              nivelDificuldade: { type: Type.STRING },
              conceitoIndispensavel: { type: Type.STRING },
              logicaDistratores: { type: Type.STRING },
              conhecimentosSecundarios: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              relacaoComEdital: { type: Type.STRING },
              variacaoDeCobrancaPossivel: { type: Type.STRING },
            },
            required: [
              "rotuloTipo",
              "avisoPrecisaoBanca",
              "conteudoCobrado",
              "habilidadeExigida",
              "nivelDificuldade",
              "conceitoIndispensavel",
              "logicaDistratores",
              "conhecimentosSecundarios",
              "relacaoComEdital",
              "variacaoDeCobrancaPossivel",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json({ analysis: parsed });
    } catch (err) {
      handleGeminiError(res, err);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build não encontrado. Execute npm run build.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Express + Vite rodando na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});

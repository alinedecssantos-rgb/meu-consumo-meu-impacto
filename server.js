
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const INSTRUCOES_IA = `
Você é um assistente especializado em consumo consciente e sustentabilidade,
com foco em famílias brasileiras e no ODS 12 da ONU.

Analise os dados recebidos e produza recomendações educativas, práticas,
realistas e respeitosas para ajudar a pessoa a consumir de forma mais
sustentável, considerando sua realidade financeira e familiar.

Regras obrigatórias:
- Não altere, recalcule ou invente o Índice de Consumo Sustentável (ICS).
- Não invente dados que não estejam no questionário.
- Não julgue nem constranja a pessoa por seus hábitos ou renda.
- Priorize ações simples, acessíveis e de baixo custo.
- Diferencie dados informados de estimativas.
- Responda exclusivamente em JSON válido, usando exatamente esta estrutura:
{
  "resumo": "Resumo personalizado",
  "principal_oportunidade": "Principal oportunidade de melhoria",
  "por_que": "Explicação baseada nos dados recebidos",
  "recomendacao_principal": "Recomendação prioritária",
  "acoes": [
    {
      "titulo": "Título da ação",
      "descricao": "Como colocar a ação em prática"
    }
  ],
  "mensagem_final": "Mensagem curta de incentivo"
}
Inclua de 3 a 5 ações no campo acoes.
`;

function chaveConfigurada() {
  const chave = process.env.GEMINI_API_KEY;

  return Boolean(
    chave &&
    chave.trim() &&
    chave !== "COLE_SUA_CHAVE_DO_GEMINI_AQUI"
  );
}

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    projeto: "Meu Consumo, Meu Impacto",
    iaConfigurada: chaveConfigurada(),
    provedor: "Google Gemini",
  });
});

app.post("/api/analisar", async (req, res) => {
  try {
    if (!chaveConfigurada()) {
      return res.status(503).json({
        erro: "A chave do Gemini não está configurada no arquivo .env.",
      });
    }

    const dados = req.body;

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      return res.status(400).json({
        erro: "Os dados enviados para análise são inválidos.",
      });
    }

    // Importa o SDK oficial do Gemini no servidor.
    const { GoogleGenAI } = await import("@google/genai");

    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const resposta = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      contents: JSON.stringify(dados),
      config: {
        systemInstruction: INSTRUCOES_IA,
        responseMimeType: "application/json",
        maxOutputTokens: 900,
      },
    });

    const texto = resposta.text;

    if (!texto) {
      throw new Error("O Gemini não retornou texto para análise.");
    }

    let resultado;

    try {
      resultado = JSON.parse(texto);
    } catch {
      throw new Error("A resposta do Gemini não veio em JSON válido.");
    }

    return res.json(resultado);
  } catch (erro) {
    console.error("Erro na análise com Gemini:", erro.message);

    return res.status(500).json({
      erro: "Não foi possível gerar a análise neste momento.",
      detalhe:
        process.env.NODE_ENV === "development"
          ? erro.message
          : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Meu Consumo, Meu Impacto disponível em http://localhost:${PORT}`
  );
});

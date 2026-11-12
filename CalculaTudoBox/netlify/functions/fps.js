exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const { cpu, gpu, game, resolution, quality, ram } = JSON.parse(event.body || '{}');
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada na Netlify.' })
    };
  }

  const prompt = `Você é um especialista em hardware de PC e benchmarks de jogos.
Analise a seguinte configuração:
- Processador (CPU): ${cpu}
- Placa de Vídeo (GPU): ${gpu}
- Memória RAM: ${ram}
- Jogo: ${game}
- Resolução: ${resolution}
- Qualidade Gráfica: ${quality}

Responda EXCLUSIVAMENTE em formato JSON válido, sem crases de markdown, seguindo exatamente esta estrutura:
{
  "avgFps": 120,
  "minFps": 85,
  "maxFps": 150,
  "status": "Fluidez Competitiva",
  "bottleneckTitle": "Hardware Bem Equilibrado",
  "bottleneckDesc": "Explicação curta de 1 frase sobre o equilíbrio entre CPU e GPU.",
  "aiTip": "Dica prática de 2 frases sobre quais configurações ajustar no jogo (DLSS, FSR, sombras, texturas) para extrair o melhor desempenho."
}`;

  try {
    const response = await fetch(
      `https://googleapis.com{apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textResult);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao consultar a IA.' })
    };
  }
};

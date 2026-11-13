exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  let bodyData = {};
  try {
    bodyData = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Dados inválidos enviados.' }) };
  }

  const { cpu, gpu, game, resolution, quality, ram } = bodyData;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada na Netlify.' })
    };
  }

  const prompt = `Você é um engenheiro de testes de hardware (estilo Gamers Nexus e TechPowerUp).
Calcule uma estimativa REALISTA e conservadora de FPS baseada em benchmarks reais de mercado:
- Processador (CPU): ${cpu}
- Placa de Vídeo (GPU): ${gpu}
- Memória RAM: ${ram}
- Jogo: ${game}
- Resolução: ${resolution}
- Qualidade Gráfica: ${quality} (renderização nativa, sem Frame Generation)

Regras de realismo:
1. Se a GPU tiver 4GB de VRAM ou menos em jogos pesados/recentes em 1080p Alto/Ultra, reduza drasticamente o FPS pelo estouro de VRAM.
2. Se a RAM for 8GB em jogos modernos, reduza o minFps para refletir engasgos.
3. Jogos competitivos (CS2, Valorant, Fortnite) dependem mais da CPU em 1080p Baixo/Médio.

Responda EXCLUSIVAMENTE em formato JSON válido seguindo esta estrutura:
{
  "avgFps": 85,
  "minFps": 58,
  "maxFps": 110,
  "status": "Jogável (60+ FPS)",
  "bottleneckTitle": "Gargalo de Placa de Vídeo (GPU)",
  "bottleneckDesc": "Explicação curta de 1 frase sobre qual peça está limitando o sistema.",
  "aiTip": "Dica prática de 2 frases sobre ajustes gráficos neste jogo para ganhar FPS."
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
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error ? data.error.message : 'Erro na API do Gemini' })
      };
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    let textResult = firstPart ? firstPart.text : '';

    textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(textResult);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao processar resposta: ' + error.message })
    };
  }
};

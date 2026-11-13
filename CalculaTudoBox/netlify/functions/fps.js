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

  const prompt = `Você é um engenheiro de testes de hardware (estilo Gamers Nexus e TechPowerUp).
Calcule uma estimativa REALISTA e conservadora de FPS baseada em benchmarks reais de mercado (nunca superestime placas de entrada ou antigas):
- Processador (CPU): ${cpu}
- Placa de Vídeo (GPU): ${gpu}
- Memória RAM: ${ram}
- Jogo: ${game}
- Resolução: ${resolution}
- Qualidade Gráfica: ${quality} (considere renderização nativa, sem Frame Generation ativado por padrão)

Regras obrigatórias de realismo:
1. Se a GPU tiver 4GB de VRAM ou menos e o jogo for pesado/recente em 1080p Alto/Ultra, reduza drasticamente o FPS devido ao estouro de VRAM.
2. Se a RAM for 8GB em jogos modernos (Warzone, Cyberpunk, GTA, etc.), reduza o minFps (1% low) para refletir engasgos (stuttering).
3. Jogos competitivos (CS2, Valorant, Fortnite) dependem muito mais do single-core da CPU em 1080p Baixo/Médio.
4. Jogos AAA pesados dependem quase 100% da GPU em 1440p e 4K.

Responda EXCLUSIVAMENTE em formato JSON válido, sem crases de markdown, seguindo esta estrutura:
{
  "avgFps": 85,
  "minFps": 58,
  "maxFps": 110,
  "status": "Jogável (60+ FPS)",
  "bottleneckTitle": "Gargalo de Placa de Vídeo (GPU)",
  "bottleneckDesc": "Explicação técnica direta de 1 frase sobre qual peça está limitando o sistema nessa resolução.",
  "aiTip": "Dica prática de 2 frases citando configurações específicas deste jogo (ex: ativar DLSS/FSR Qualidade, reduzir sombras ou volumetria) para ganhar FPS."
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
        body: JSON.stringify({ error: data.error?.message || 'Erro na API do Gemini' })
      };
    }

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
      body: JSON.stringify({ error: 'Erro interno ao processar resposta da IA.' })
    };
  }
};

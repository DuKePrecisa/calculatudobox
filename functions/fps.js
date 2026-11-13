export async function onRequestPost(context) {
  const { request, env } = context;

  let bodyData = {};
  try {
    bodyData = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Dados inválidos enviados.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { cpu, gpu, game, resolution, quality, ram } = bodyData;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada na Cloudflare.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    const url = "https://googleapis.com" + apiKey;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error ? data.error.message : 'Erro na API do Gemini' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    let textResult = firstPart ? firstPart.text : '';

    textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();

    return new Response(textResult, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao processar resposta: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

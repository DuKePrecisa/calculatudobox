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

  const { query, tarifa } = bodyData;
  const apiKey = (env.GEMINI_API_KEY || '').replace(/\s+/g, '');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Chave GEMINI_API_KEY não configurada na Cloudflare.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const prompt = `Você é um engenheiro eletricista especialista em eficiência energética residencial no Brasil (padrão PROCEL/INMETRO).
Analise a solicitação do usuário e estime a potência elétrica real em Watts (W), o tempo médio de uso diário (em horas decimais, ex: 0.5 para 30 min, 8 para 8h, 24 para geladeira com fator de ciclo) e os dias de uso por mês.

Solicitação do usuário: "${query}"
Tarifa informada: R$ ${tarifa || 0.85} por kWh.

Regras técnicas importantes:
1. Para aparelhos com termostato ou ciclo (geladeira, freezer, ar-condicionado inverter), informe a potência equivalente média contínua OU a potência nominal ajustando as horas efetivas de compressor ligado para que o kWh mensal fique fiel às tabelas do PROCEL/INMETRO. Explique isso brevemente em "observacao".
2. Se o usuário descrever vários aparelhos de uma vez (ex: "2 lâmpadas LED 9W e 1 TV 50 polegadas"), some a potência equivalente ou consolide o cenário de forma clara no nome.
3. Responda EXCLUSIVAMENTE em JSON válido, sem markdown ou texto extra, seguindo esta estrutura exata:
{
  "nomeAparelho": "Nome padronizado do aparelho ou conjunto",
  "potenciaWatts": 150,
  "horasPorDia": 8.0,
  "diasPorMes": 30,
  "seloProcelEstimado": "A (Econômico)",
  "observacao": "Explicação técnica curta de 1 frase sobre como a potência e o ciclo de funcionamento foram estimados.",
  "dicaEconomia": "Dica prática e objetiva de 2 frases para reduzir o consumo em kWh deste aparelho."
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
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

    const rawText = await response.text();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Erro na API do Gemini (${response.status}): ${rawText.substring(0, 120)}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(rawText);
    const firstCandidate = data.candidates && data.candidates[0];
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts[0];
    let textResult = firstPart ? firstPart.text : '';

    textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();

    return new Response(textResult, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno de conexão: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

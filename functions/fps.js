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
  const apiKey = (env.GEMINI_API_KEY || '').replace(/\s+/g, '');

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

Responda EXCLUSIVAMENTE em formato JSON válido seguindo esta estrutura exata, sem textos adicionais:
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
    // Usando o modelo estável e rápido gemini-1.5-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

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
        error: `Servidor de IA ocupado no momento (${response.status}). Tente clicar novamente em alguns segundos.` 
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
```[cite: 9]

---

### 2. Atualizar a função `calcularFPS()` no arquivo `calculadora-fps.html`
Certifique-se de que a função de envio no seu arquivo HTML está limpa e com tratamento de erros adequado (substitua a função antiga no script do seu HTML):

```javascript
async function calcularFPS() {
  const cpu = document.getElementById('cpu-input').value.trim();
  const gpu = document.getElementById('gpu-input').value.trim();
  const game = document.getElementById('game-input').value.trim();
  const resolution = document.getElementById('res').value;
  const quality = document.getElementById('qual').value;
  const ram = document.getElementById('ram').value;

  const btn = document.getElementById('calc-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');

  if (!cpu || !gpu || !game) {
    errorBox.textContent = "Por favor, preencha o Processador, a Placa de Vídeo e o Jogo.";
    errorBox.style.display = 'block';
    return;
  }

  errorBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = "⏳ Simulando desempenho com IA...";

  try {
    const response = await fetch('/fps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpu, gpu, game, resolution, quality, ram })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao conectar com o servidor.');
    }

    document.getElementById('res-hardware-label').textContent = `${game} • ${resolution} (${quality})`;
    document.getElementById('res-avg').textContent = data.avgFps;
    document.getElementById('res-min').textContent = `${data.minFps} FPS`;
    document.getElementById('res-max').textContent = `${data.maxFps} FPS`;
    document.getElementById('res-status').textContent = data.status;
    document.getElementById('res-bottleneck-title').textContent = data.bottleneckTitle;
    document.getElementById('res-bottleneck-desc').textContent = data.bottleneckDesc;
    document.getElementById('res-ai-tip').textContent = data.aiTip;

    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    errorBox.textContent = `Falha na simulação: ${err.message}`;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Calcular FPS e Gargalo";
  }
}
```[cite: 8]

Faça o *commit* dessas atualizações no seu GitHub e teste novamente. A consulta à API vai responder de forma bem mais ágil e estável!

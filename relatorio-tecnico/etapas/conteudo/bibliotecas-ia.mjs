/**
 * Bibliotecas e endereços que indicam uso de um provedor de IA. Nome de pacote
 * em minúsculas e com `-` no lugar de `_`.
 */

const BIBLIOTECAS = {
  openai: 'OpenAI', '@openai/agents': 'OpenAI', 'openai-agents': 'OpenAI',
  '@anthropic-ai/sdk': 'Anthropic', anthropic: 'Anthropic', '@anthropic-ai/claude-agent-sdk': 'Anthropic', 'claude-agent-sdk': 'Anthropic',
  '@google/generative-ai': 'Google', 'google-generativeai': 'Google', '@google/genai': 'Google', 'google-genai': 'Google',
  '@google-cloud/vertexai': 'Google', 'google-cloud-aiplatform': 'Google',
  llamaindex: 'LlamaIndex',
  ai: 'Vercel AI SDK',
  cohere: 'Cohere', 'cohere-ai': 'Cohere',
  mistralai: 'Mistral', '@mistralai/mistralai': 'Mistral',
  groq: 'Groq', 'groq-sdk': 'Groq',
  replicate: 'Replicate',
  'huggingface-hub': 'Hugging Face', '@huggingface/inference': 'Hugging Face', transformers: 'Hugging Face', '@huggingface/transformers': 'Hugging Face', '@xenova/transformers': 'Hugging Face',
  ollama: 'Ollama',
  together: 'Together', 'together-ai': 'Together',
  elevenlabs: 'ElevenLabs', '@elevenlabs/elevenlabs-js': 'ElevenLabs', 'elevenlabs-node': 'ElevenLabs',
  '@pinecone-database/pinecone': 'Pinecone', pinecone: 'Pinecone', 'pinecone-client': 'Pinecone',
  chromadb: 'Chroma',
  openrouter: 'OpenRouter', '@openrouter/ai-sdk-provider': 'OpenRouter', '@openrouter/sdk': 'OpenRouter',
  litellm: 'LiteLLM', crewai: 'CrewAI',
}

const PREFIXOS = [
  ['@langchain/', 'LangChain'], ['langchain', 'LangChain'], ['langgraph', 'LangChain'],
  ['@llamaindex/', 'LlamaIndex'], ['llama-index', 'LlamaIndex'],
  ['@ai-sdk/', 'Vercel AI SDK'],
]

const PROVEDOR_DO_AI_SDK = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', 'google-vertex': 'Google', mistral: 'Mistral',
  cohere: 'Cohere', groq: 'Groq', togetherai: 'Together', replicate: 'Replicate', elevenlabs: 'ElevenLabs',
}

/**
 * @param {string} nome  nome do pacote como aparece no manifesto ou no import
 * @returns {string|null} provedor, ou null se não é biblioteca de IA conhecida
 */
export function provedorDaBiblioteca(nome) {
  const pacote = nome.trim().toLowerCase().replace(/_/g, '-')
  if (Object.hasOwn(BIBLIOTECAS, pacote)) return BIBLIOTECAS[pacote]
  if (pacote.startsWith('@ai-sdk/')) return PROVEDOR_DO_AI_SDK[pacote.slice('@ai-sdk/'.length)] ?? 'Vercel AI SDK'
  return PREFIXOS.find(([prefixo]) => pacote.startsWith(prefixo))?.[1] ?? null
}

const ENDERECOS = [
  ['api.openai.com', 'OpenAI'], ['api.anthropic.com', 'Anthropic'], ['generativelanguage.googleapis.com', 'Google'],
  ['api.groq.com', 'Groq'], ['openrouter.ai', 'OpenRouter'], ['api.mistral.ai', 'Mistral'], ['api.cohere', 'Cohere'],
  ['api.elevenlabs.io', 'ElevenLabs'], ['api.replicate.com', 'Replicate'], ['api-inference.huggingface.co', 'Hugging Face'],
  ['localhost:11434', 'Ollama'],
]

const IMPORT_JS = /(?:\bfrom\s+|\brequire\(\s*|\bimport\(\s*|\bimport\s+)(['"])([^'"\s]+)\1/g
const IMPORT_PYTHON = /^\s*"?(?:from\s+([\w.]+)\s+import\b|import\s+([\w.]+(?:\s*,\s*[\w.]+)*))/

function pacoteDoEspecificador(especificador) {
  const partes = especificador.split('/')
  return especificador.startsWith('@') ? partes.slice(0, 2).join('/') : partes[0]
}

function provedorDoModuloPython(modulo) {
  const partes = modulo.split('.')
  for (let fim = partes.length; fim > 0; fim--) {
    const provedor = provedorDaBiblioteca(partes.slice(0, fim).join('-'))
    if (provedor) return provedor
  }
  return null
}

/**
 * @param {string} linha
 * @param {string} caminho  decide a sintaxe de import a procurar
 * @returns {string|null} o provedor que a linha importa ou cujo endereço cita
 */
export function provedorNaLinha(linha, caminho) {
  if (/\.(py|ipynb)$/i.test(caminho)) {
    const achado = linha.match(IMPORT_PYTHON)
    for (const modulo of (achado?.[1] ?? achado?.[2] ?? '').split(',')) {
      const provedor = modulo.trim() && provedorDoModuloPython(modulo.trim())
      if (provedor) return provedor
    }
  } else {
    for (const achado of linha.matchAll(IMPORT_JS)) {
      const provedor = provedorDaBiblioteca(pacoteDoEspecificador(achado[2]))
      if (provedor) return provedor
    }
  }
  return ENDERECOS.find(([endereco]) => linha.includes(endereco))?.[1] ?? null
}

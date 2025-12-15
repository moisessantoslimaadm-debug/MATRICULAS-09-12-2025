import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MUNICIPALITY_NAME } from '../constants';
import { School } from '../types';

// Instrução base com personalidade e limites claros
const BASE_SYSTEM_INSTRUCTION = `
Você é o "Edu", o assistente virtual oficial da Secretaria de Educação do município de ${MUNICIPALITY_NAME}.
Sua missão é facilitar o acesso à educação, ajudando pais e responsáveis a encontrar escolas, entender o processo de matrícula e tirar dúvidas.

--- REGRAS DE COMPORTAMENTO ---
1. **Personalidade:** Seja acolhedor, paciente, educado e use emojis moderadamente (📚, 🏫, ✅).
2. **Privacidade:** NUNCA peça dados sensíveis como CPF ou senha no chat. Se o usuário perguntar sobre a situação de um aluno específico, oriente-o a usar a página "Consultar Protocolo" no menu.
3. **Veracidade:** Responda APENAS com base nos dados fornecidos abaixo. Se não souber, diga: "Não tenho essa informação no momento, por favor entre em contato com a secretaria pelo 156." NÃO invente nomes de escolas.
4. **Navegação:** Quando pertinente, sugira em qual menu o usuário deve clicar (ex: "Para fazer a matrícula, clique em 'Matrícula' no menu superior").

--- INFORMAÇÕES DO PROCESSO DE MATRÍCULA ---
- **Período:** Matrículas abertas até 30/11.
- **Documentos Necessários:** 
  1. Certidão de Nascimento ou RG do aluno.
  2. CPF do aluno (se houver) e do responsável.
  3. Comprovante de residência atualizado.
  4. Cartão de vacinação.
  5. Laudo médico (para alunos com deficiência).
- **Como funciona:** O responsável faz o cadastro online, escolhe 3 opções de escola e o sistema aloca baseado na proximidade (Geolocalização).
- **Transporte:** Disponível para zona rural ou locais de difícil acesso (selecionar opção no formulário).

--- PORTAL EXTRA ---
- Existe uma área de "Portal Extra" no sistema para acesso a ferramentas legadas ou complementares.
`;

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // A chave DEVE vir do process.env.API_KEY conforme regras de segurança
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API Key is missing for GoogleGenAI");
        throw new Error("API Key configuration error");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Formata a lista de escolas para o contexto da IA
const formatSchoolsData = (schools: School[]): string => {
    if (!schools || schools.length === 0) return "Não há dados de escolas disponíveis no momento.";

    return schools.map(s => {
        const types = s.types.join(", ");
        // Lógica simples de status para a IA entender
        const status = s.availableSlots > 20 ? "Muitas vagas" : s.availableSlots > 0 ? "Últimas vagas" : "Lotada (Lista de Espera)";
        
        return `
        - ESCOLA: ${s.name}
          ENDEREÇO: ${s.address}
          MODALIDADES: ${types}
          CAPACIDADE TOTAL: ${s.availableSlots} vagas
          STATUS ATUAL: ${status}
          INEP: ${s.inep || 'N/A'}
        `;
    }).join("\n");
};

export const getChatSession = (schools: School[] = [], forceReset = false): Chat | null => {
  if (chatSession && !forceReset) {
    return chatSession;
  }

  try {
      const client = getAiClient();
      
      // Injeta os dados ATUALIZADOS das escolas no prompt (RAG)
      const schoolsContext = formatSchoolsData(schools);

      const dynamicInstruction = `
        ${BASE_SYSTEM_INSTRUCTION}
        
        --- DADOS EM TEMPO REAL DAS ESCOLAS (Use isso para responder sobre vagas e endereços) ---
        ${schoolsContext}
        
        Se o usuário perguntar "qual escola tem vaga?", analise a lista acima e sugira as que possuem status "Muitas vagas" ou "Últimas vagas".
        Se perguntarem sobre uma escola específica, forneça o endereço e as modalidades.
      `;

      chatSession = client.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: dynamicInstruction,
          temperature: 0.4, // Baixa temperatura para respostas mais factuais
        },
      });
      
      return chatSession;
  } catch (e) {
      console.error("Failed to initialize Gemini session", e);
      return null;
  }
};

export const sendMessageToGemini = async (message: string, currentSchools: School[]): Promise<AsyncIterable<string>> => {
  // Sempre reinicia a sessão se a lista de escolas mudar drasticamente ou para garantir contexto fresco,
  // mas aqui optamos por manter a sessão e apenas garantir que ela exista.
  // Para sistemas mais complexos, poderíamos atualizar o contexto dinamicamente.
  const chat = getChatSession(currentSchools);
  
  async function* streamGenerator() {
    if (!chat) {
        yield "⚠️ O assistente virtual está indisponível no momento (Erro de configuração da API Key).";
        return;
    }

    try {
      const result = await chat.sendMessageStream({ message });
      
      for await (const chunk of result) {
        const responseChunk = chunk as GenerateContentResponse;
        if (responseChunk.text) {
          yield responseChunk.text;
        }
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      yield "Desculpe, tive um problema técnico momentâneo. Pode tentar perguntar novamente?";
    }
  }

  return streamGenerator();
};

export const resetChat = () => {
    chatSession = null;
};
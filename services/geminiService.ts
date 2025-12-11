import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MUNICIPALITY_NAME } from '../constants';
import { School } from '../types';

// Instrução base sem dados fixos
const BASE_SYSTEM_INSTRUCTION = `
Você é o "Edu", o assistente virtual oficial da Secretaria de Educação do município de ${MUNICIPALITY_NAME}.
Sua função é auxiliar pais e responsáveis no processo de matrícula escolar online e tirar dúvidas sobre as escolas da rede.

Informações importantes sobre o processo:
- O período de matrícula está aberto.
- Documentos: Certidão de Nascimento/RG, CPF, Comprovante de Residência, Cartão de Vacinação.
- Alunos com deficiência devem apresentar laudo médico.
- O sistema permite escolher 3 escolas de preferência.
- O portal conta com uma área de "Portal Extra" no menu ou na tela inicial, onde é possível acessar sistemas complementares ou legados (apps externos).
`;

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // Graceful handling if API key is missing
    const apiKey = process.env.API_KEY || 'dummy_key_for_safe_fail';
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Aceita a lista atualizada de escolas, mas só recria se forçar ou se não existir sessão
export const getChatSession = (schools: School[] = [], forceReset = false): Chat | null => {
  // Se já existe sessão e não estamos forçando reset, retorna a existente para manter histórico
  if (chatSession && !forceReset) {
    return chatSession;
  }

  try {
      const client = getAiClient();
      
      // Injeta dados reais no prompt (RAG - Retrieval Augmented Generation)
      const schoolsInfo = schools.length > 0 
        ? schools.map(s => `
          - Nome: ${s.name}
            Endereço: ${s.address}
            Modalidades: ${s.types.join(", ")}
            Vagas Totais: ${s.availableSlots}
            INEP: ${s.inep || 'N/A'}
        `).join("\n")
        : "Nenhuma escola cadastrada no banco de dados no momento.";

      const dynamicInstruction = `
        ${BASE_SYSTEM_INSTRUCTION}
        
        Abaixo está a lista ATUALIZADA de Escolas da Rede Municipal (Dados do Banco de Dados):
        ${schoolsInfo}

        Diretrizes:
        1. Use estritamente a lista acima para responder sobre vagas e localização.
        2. Se a escola não estiver na lista, informe que não encontrou a unidade na rede municipal.
        3. Seja sempre educado, claro e objetivo.
        4. Se não souber a resposta, oriente ligar no 156.
      `;

      chatSession = client.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: dynamicInstruction,
          temperature: 0.5, 
        },
      });
      
      return chatSession;
  } catch (e) {
      console.error("Failed to initialize Gemini session", e);
      return null;
  }
};

export const sendMessageToGemini = async (message: string, currentSchools: School[]): Promise<AsyncIterable<string>> => {
  // Inicializa a sessão se não existir. 
  const chat = getChatSession(currentSchools);
  
  async function* streamGenerator() {
    if (!chat) {
        yield "O assistente virtual está temporariamente indisponível (Erro de Configuração de API).";
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
      yield "Desculpe, estou com dificuldades técnicas de conexão com a IA no momento. Por favor, tente novamente em instantes.";
    }
  }

  return streamGenerator();
};

export const resetChat = () => {
    chatSession = null;
};
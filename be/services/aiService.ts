import { OpenAI } from 'openai';
import MenuItem from '../models/MenuItem.js';

// Non inizializzare immediatamente, ma creare una funzione che lo farà al momento giusto
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY non trovata. Usando il parser semplice di fallback.');
      return null;
    }

    try {
      openaiClient = new OpenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      console.error('Errore nell\'inizializzazione del client OpenAI:', error);
      return null;
    }
  }
  return openaiClient;
}

/**
 * Elabora il testo dell'ordine tramite AI per estrarre elementi del menu
 */
export async function processOrderText(text: string, storeId: string) {
  try {
    // Ottiene il menu del negozio
    const menuItems = await MenuItem.find({ storeId });

    if (!menuItems || menuItems.length === 0) {
      console.warn('Nessun menu trovato per storeId:', storeId);
      return simpleParser(text, []);
    }

    const client = getOpenAIClient();

    // Se non abbiamo un client OpenAI, usiamo il parser semplice
    if (!client) {
      return simpleParser(text, menuItems);
    }

    try {
      const menuText = menuItems.map(item =>
        `${item.name}: €${item.price} - ${item.description || 'No description'}`
      ).join('\n');

      // Richiesta a OpenAI
      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Sei un assistente per ordinazioni al ristorante. Estrai gli elementi ordinati dal testo del cliente.
            Menu disponibile:\n${menuText}
            
            Restituisci solo un JSON array con elementi nel formato:
            [{"menuItemId": "<id dell'item>", "name": "<nome dell'item>", "quantity": <numero>}]`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });

      // Elabora la risposta
      const content = completion.choices[0].message.content;
      if (!content) return simpleParser(text, menuItems);

      try {
        const parsedResponse = JSON.parse(content);
        if (!Array.isArray(parsedResponse.items)) return simpleParser(text, menuItems);

        // Mappa gli elementi ai menuItem del database
        return parsedResponse.items.map((item: { name: string; quantity: any; }) => {
          const menuItem = menuItems.find(mi =>
            mi.name.toLowerCase() === item.name.toLowerCase()
          );

          if (!menuItem) return null;

          return {
            menuItem: menuItem._id,
            quantity: item.quantity || 1,
            name: menuItem.name
          };
        }).filter(Boolean);
      } catch (parseError) {
        console.error('Errore nel parsing della risposta AI:', parseError);
        return simpleParser(text, menuItems);
      }
    } catch (aiError) {
      console.error('Errore nella chiamata OpenAI:', aiError);
      return simpleParser(text, menuItems);
    }
  } catch (error) {
    console.error('Errore generale in processOrderText:', error);
    return simpleParser(text, []);
  }
}

/**
 * Parser semplice di fallback quando OpenAI non è disponibile
 */
// Sostituire la funzione simpleParser esistente con questa versione migliorata

function simpleParser(text: string, menuItems: any[]) {
  console.log('Usando parser semplice per:', text);
  const textLower = text.toLowerCase();
  const result = [];

  // Prima di tutto, controlla se c'è un orario nell'ordine
  let timeSlot = null;
  // Pattern per riconoscere orari come "per le 7:15", "alle 19:30", "7 e 15", ecc.
  const timePattern = /per\s+le\s+(\d{1,2})(?::(\d{1,2}))?|\s+alle\s+(\d{1,2})(?::(\d{1,2}))?|\s+(\d{1,2})[:\s][eE]?\s*(\d{1,2})?\s/i;
  const timeMatch = textLower.match(timePattern);

  if (timeMatch) {
    // Prendiamo il primo gruppo non undefined tra quelli che contengono ore
    let hours = parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]);
    // Prendiamo il primo gruppo non undefined tra quelli che contengono minuti
    let minutes = parseInt(timeMatch[2] || timeMatch[4] || timeMatch[6] || '0');

    // Aggiusta l'orario per AM/PM - se l'ora è tra 1 e 11 di sera, è probabilmente PM
    if (hours >= 1 && hours <= 11) {
      const now = new Date();
      if (now.getHours() >= 12) {
        hours += 12;
      }
    }

    timeSlot = Math.floor((hours * 60 + minutes) / 15);
    console.log(`Orario rilevato: ${hours}:${minutes.toString().padStart(2, '0')}, slot: ${timeSlot}`);
  }

  // Rileva richieste di menu
  if (textLower.includes('menu') ||
    textLower.includes('cosa c\'è') ||
    textLower.includes('cosa hai') ||
    textLower.includes('cosa avete') ||
    textLower.includes('cosa posso ordinare')) {
    // Restituisci un elemento speciale per indicare una richiesta di menu
    return [{ special: 'menu_request', name: 'informazioni sul menu', quantity: 1 }];
  }

  // Se non ci sono elementi di menu disponibili
  if (menuItems.length === 0) {
    console.log('Nessun elemento di menu disponibile per il parser semplice');
    return [{ special: 'no_menu', name: 'menu non disponibile', quantity: 1 }];
  }

  // Analizza il testo per trovare quantità e prodotti
  const quantityWords = {
    'una': 1, 'un': 1, 'uno': 1, 'due': 2, 'tre': 3, 'quattro': 4,
    'cinque': 5, 'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10
  };

  for (const item of menuItems) {
    const itemName = item.name.toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();

    // Cerca la menzione di questo prodotto nel testo
    if (textLower.includes(itemName) ||
      (itemCategory && textLower.includes(itemCategory)) ||
      (itemName.includes('pizza') && textLower.includes('pizza'))) {

      // Cerca quantità numeriche o testuali prima del nome del prodotto
      let quantity = 1;

      // Pattern specifico per questo prodotto, evitando di catturare numeri di orari
      const numericPattern = new RegExp(`\\b(\\d+)\\s+(?!e\\s+\\d|\\.|:|\\d).*?${itemName}`, 'i');
      const numericMatch = textLower.match(numericPattern);

      if (numericMatch) {
        quantity = parseInt(numericMatch[1]);
      } else {
        // Cerca parole di quantità
        for (const [word, value] of Object.entries(quantityWords)) {
          const quantityPattern = new RegExp(`\\b${word}\\s+(?:pizza\\s+)?${itemName}`, 'i');
          if (quantityPattern.test(textLower)) {
            quantity = value;
            break;
          }
        }
      }

      result.push({
        menuItem: item._id,
        quantity: quantity,
        name: item.name,
        ...(timeSlot && { pickupTime: timeSlot })
      });
    }
  }

  // Se non abbiamo trovato prodotti ma c'è un orario, segnala che dobbiamo chiedere l'ordine
  if (result.length === 0 && timeSlot) {
    return [{
      special: 'time_only',
      name: 'solo orario specificato',
      quantity: 1,
      pickupTime: timeSlot
    }];
  }

  // Se non abbiamo trovato nulla, aggiungi un elemento generico
  if (result.length === 0) {
    return [{ special: 'unknown', name: 'elemento non riconosciuto', quantity: 1 }];
  }

  // Se abbiamo rilevato un orario, aggiungiamolo a tutti gli elementi
  if (timeSlot) {
    for (const item of result) {
      item.pickupTime = timeSlot;
    }
  }

  return result;
}
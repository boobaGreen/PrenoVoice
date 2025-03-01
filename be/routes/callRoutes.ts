import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { processOrderText } from '../services/aiService.js';
import { OrderStatus } from '../constants/orderEnums.js';
import Order from '../models/Order.js';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Definiamo i tipi accettati per input
type GatherInput = 'speech' | 'dtmf';

// Endpoint che gestisce le chiamate in arrivo
router.post('/incoming', (req: Request, res: Response) => {
    try {
        console.log('Chiamata in arrivo:', req.body);
        const response = new VoiceResponse();

        // Ottieni lo storeId dal parametro o usa un ID di default
        const storeId = req.query.storeId?.toString() || '1234';

        // Saluta l'utente in modo caloroso e naturale
        response.say({
            voice: 'Polly.Bianca', // Proviamo Bianca che potrebbe essere più naturale
            language: 'it-IT'
        }, 'Buongiorno! Sono Bianca della pizzeria La Bella Napoli. Come posso aiutarti oggi?');

        // Impostazione dei parametri per memorizzare lo storeId
        response.gather({
            input: 'speech' as any,
            action: `/api/calls/collect-order?storeId=${storeId}`,
            language: 'it-IT',
            speechTimeout: 'auto'
        });

        console.log('TwiML generato per incoming:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore nella gestione della chiamata in arrivo:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace, c\'è stato un problema con la tua chiamata. Potresti richiamare tra qualche minuto?');
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Endpoint per raccogliere l'ordine
router.post('/collect-order', async (req: Request, res: Response) => {
    try {
        console.log('Collect order - Speech Result:', req.body.SpeechResult);
        console.log('Collect order - Request body:', req.body);

        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult;
        const storeId = req.query.storeId?.toString() || '1234';

        if (speechResult) {
            try {
                // Elabora l'ordine usando l'AI
                const orderItems = await processOrderText(speechResult, storeId);
                console.log('Elementi ordine riconosciuti:', orderItems);

                // Gestisci casi speciali
                if (orderItems.length === 1 && orderItems[0].special === 'menu_request') {
                    response.say({
                        voice: 'Polly.Bianca',
                        language: 'it-IT'
                    }, 'Oggi abbiamo diverse specialità! Posso consigliarti la nostra pizza Margherita con mozzarella di bufala, la piccante Pizza Diavola, e per dessert un ottimo Tiramisù fatto in casa. Abbiamo anche Coca Cola e acqua naturale. Cosa ti piacerebbe ordinare?');

                    response.gather({
                        input: 'speech' as any,
                        action: `/api/calls/collect-order?storeId=${storeId}`,
                        language: 'it-IT',
                        speechTimeout: 'auto'
                    });
                }
                else if (orderItems.length === 1 && orderItems[0].special === 'no_menu') {
                    response.say({
                        voice: 'Polly.Bianca',
                        language: 'it-IT'
                    }, 'Mi dispiace tanto, ma oggi il nostro chef sta aggiornando il menù. Potresti riprovare più tardi? Grazie della comprensione!');

                    // Termina la chiamata
                    response.hangup();
                }
                else if (orderItems.length === 1 && orderItems[0].special === 'unknown') {
                    response.say({
                        voice: 'Polly.Bianca',
                        language: 'it-IT'
                    }, 'Scusa, non ho capito bene. Posso suggerirti la nostra pizza Margherita, la piccante pizza Diavola, o magari preferisci una bevanda come una Coca Cola o dell\'acqua? Abbiamo anche un delizioso tiramisù per dessert.');

                    response.gather({
                        input: 'speech' as any,
                        action: `/api/calls/collect-order?storeId=${storeId}`,
                        language: 'it-IT',
                        speechTimeout: 'auto'
                    });
                }
                else if (orderItems && orderItems.length > 0) {
                    // Crea una descrizione leggibile dell'ordine
                    const orderDescription = orderItems
                        .map((item: { quantity: any; name: any; }) => `${item.quantity} ${item.name || 'item'}`)
                        .join(', ');

                    // Salva l'ordine base nella query per utilizzarlo nella fase successiva
                    const baseOrderQuery = encodeURIComponent(JSON.stringify(orderItems));

                    response.say({
                        voice: 'Polly.Bianca',
                        language: 'it-IT'
                    }, `Perfetto! Ho segnato ${orderDescription}. Ti chiedo ancora un paio di cose... Desideri anche qualcosa da bere con il tuo ordine?`);

                    // Configura la raccolta della risposta sulla bevanda
                    response.gather({
                        input: 'speech' as any,
                        action: `/api/calls/add-drinks?storeId=${storeId}&baseOrder=${baseOrderQuery}`,
                        language: 'it-IT',
                        speechTimeout: 'auto'
                    });
                } else {
                    response.say({
                        voice: 'Polly.Bianca',
                        language: 'it-IT'
                    }, 'Scusami, non sono riuscita a capire cosa vorresti ordinare. Puoi ripetere per favore?');

                    response.gather({
                        input: 'speech' as any,
                        action: `/api/calls/collect-order?storeId=${storeId}`,
                        language: 'it-IT',
                        speechTimeout: 'auto'
                    });
                }
            } catch (error) {
                console.error('Errore nell\'elaborazione dell\'ordine:', error);
                response.say({
                    voice: 'Polly.Bianca',
                    language: 'it-IT'
                }, 'Mi scuso, ma ho avuto un problema a processare il tuo ordine. Potresti ripetere in modo più semplice?');

                response.gather({
                    input: 'speech' as any,
                    action: `/api/calls/collect-order?storeId=${storeId}`,
                    language: 'it-IT',
                    speechTimeout: 'auto'
                });
            }
        } else {
            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, 'Non sono riuscita a sentirti. Puoi dirmi cosa vorresti ordinare oggi?');

            response.gather({
                input: 'speech' as any,
                action: `/api/calls/collect-order?storeId=${storeId}`,
                language: 'it-IT',
                speechTimeout: 'auto'
            });
        }

        console.log('TwiML generato per collect-order:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore generale in collect-order:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace, c\'è stato un piccolo problema tecnico. Potresti richiamare tra qualche minuto?');
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Nuovo endpoint per chiedere se vuole bevande
router.post('/add-drinks', (req: Request, res: Response) => {
    try {
        console.log('Add drinks - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const storeId = req.query.storeId?.toString() || '1234';
        const baseOrder = req.query.baseOrder ? JSON.parse(decodeURIComponent(req.query.baseOrder.toString())) : [];

        let updatedOrder = [...baseOrder];
        const wantsDrinks = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok') ||
            speechResult.toLowerCase().includes('acqua') ||
            speechResult.toLowerCase().includes('coca') ||
            speechResult.toLowerCase().includes('bere');

        if (wantsDrinks &&
            (speechResult.toLowerCase().includes('acqua') ||
                speechResult.toLowerCase().includes('naturale'))) {
            // Aggiungi acqua all'ordine
            updatedOrder.push({ name: 'Acqua', quantity: 1 });
        }

        if (wantsDrinks &&
            (speechResult.toLowerCase().includes('coca') ||
                speechResult.toLowerCase().includes('cola'))) {
            // Aggiungi coca cola all'ordine
            updatedOrder.push({ name: 'Coca Cola', quantity: 1 });
        }

        const updatedOrderQuery = encodeURIComponent(JSON.stringify(updatedOrder));

        // Chiedi per il dolce
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, `Perfetto! E per finire, ti posso aggiungere anche un delizioso tiramisù fatto in casa?`);

        response.gather({
            input: 'speech' as any,
            action: `/api/calls/add-dessert?storeId=${storeId}&updatedOrder=${updatedOrderQuery}`,
            language: 'it-IT',
            speechTimeout: 'auto'
        });

        console.log('TwiML generato per add-drinks:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in add-drinks:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi scuso per l\'inconveniente. Procediamo con il tuo ordine base.');

        // Redirect to confirm-order in caso di errore
        response.redirect(`/api/calls/final-questions?storeId=${req.query.storeId || '1234'}`);
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Nuovo endpoint per chiedere se vuole dessert
router.post('/add-dessert', (req: Request, res: Response) => {
    try {
        console.log('Add dessert - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const storeId = req.query.storeId?.toString() || '1234';
        const updatedOrder = req.query.updatedOrder ? JSON.parse(decodeURIComponent(req.query.updatedOrder.toString())) : [];

        const wantsDessert = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok') ||
            speechResult.toLowerCase().includes('tiramisù') ||
            speechResult.toLowerCase().includes('tiramisu') ||
            speechResult.toLowerCase().includes('dolce');

        if (wantsDessert) {
            // Aggiungi tiramisù all'ordine
            updatedOrder.push({ name: 'Tiramisu', quantity: 1 });
        }

        const finalOrderQuery = encodeURIComponent(JSON.stringify(updatedOrder));

        // Chiedi preferenze sul taglio della pizza
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, `Ultima domanda, vuoi che le pizze siano tagliate a spicchi?`);

        response.gather({
            input: 'speech' as any,
            action: `/api/calls/final-confirm?storeId=${storeId}&finalOrder=${finalOrderQuery}`,
            language: 'it-IT',
            speechTimeout: 'auto'
        });

        console.log('TwiML generato per add-dessert:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in add-dessert:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace per il problema. Procediamo con la conferma del tuo ordine.');

        // Redirect alla conferma in caso di errore
        response.redirect(`/api/calls/final-confirm?storeId=${req.query.storeId || '1234'}`);
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Endpoint finale per confermare l'ordine completo
router.post('/final-confirm', (req: Request, res: Response) => {
    try {
        console.log('Final confirm - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const storeId = req.query.storeId?.toString() || '1234';
        const finalOrder = req.query.finalOrder ? JSON.parse(decodeURIComponent(req.query.finalOrder.toString())) : [];

        // Aggiungi preferenza taglio pizza
        const wantsCut = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok');

        // Prepara un riassunto dell'ordine
        const orderDescription = finalOrder
            .map((item: { quantity: any; name: any; }) => `${item.quantity} ${item.name || 'item'}`)
            .join(', ');

        const cuttingPreference = wantsCut ? 'tagliate a spicchi' : 'non tagliate';

        // Chiedi conferma finale in modo conversazionale
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, `Perfetto! Riassumo il tuo ordine: ${orderDescription}, con le pizze ${cuttingPreference}. Ti sembra tutto corretto o vuoi modificare qualcosa?`);

        response.gather({
            input: 'speech' as any,
            action: `/api/calls/complete-order?storeId=${storeId}&cutting=${wantsCut}`,
            language: 'it-IT',
            speechTimeout: 'auto'
        });

        console.log('TwiML generato per final-confirm:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in final-confirm:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace per il problema. Considero il tuo ordine come confermato. Grazie!');

        // Termina in caso di errore
        response.hangup();
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Endpoint finale per completare l'ordine
router.post('/complete-order', (req: Request, res: Response) => {
    try {
        console.log('Complete order - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';

        const isConfirmed = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok') ||
            speechResult.toLowerCase().includes('perfetto') ||
            speechResult.toLowerCase().includes('corretto') ||
            !speechResult.toLowerCase().includes('no') &&
            !speechResult.toLowerCase().includes('modific');

        if (isConfirmed) {
            // Qui potresti salvare l'ordine nel database
            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, 'Fantastico! Il tuo ordine è stato registrato e sarà pronto tra circa 25 minuti. Puoi passare a ritirarlo o se preferisci consegnare a domicilio è possibile concordare un orario. Grazie per averci scelto e buon appetito!');
        } else {
            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, 'Nessun problema! Puoi richiamare quando vuoi per fare un nuovo ordine. Grazie per la tua pazienza e a presto!');
        }

        // Chiudi la chiamata
        response.hangup();

        console.log('TwiML generato per complete-order:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in complete-order:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace per l\'inconveniente. Il tuo ordine è stato comunque registrato. Grazie e arrivederci!');
        response.hangup();
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});


router.post('/final-confirm', (req: Request, res: Response) => {
    try {
        console.log('Final confirm - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const storeId = req.query.storeId?.toString() || '1234';
        const finalOrder = req.query.finalOrder ? JSON.parse(decodeURIComponent(req.query.finalOrder.toString())) : [];
        const callerPhone = req.body.Caller || '';

        // Aggiungi preferenza taglio pizza
        const wantsCut = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok');

        // Prepara un riassunto dell'ordine
        const orderDescription = finalOrder
            .map((item: { quantity: any; name: any; }) => `${item.quantity} ${item.name || 'item'}`)
            .join(', ');

        const cuttingPreference = wantsCut ? 'tagliate a spicchi' : 'non tagliate';

        // Passa i dati dell'ordine completo
        const orderDataQuery = encodeURIComponent(JSON.stringify({
            items: finalOrder,
            cutting: wantsCut,
            notes: wantsCut ? 'Pizze tagliate a spicchi' : 'Pizze non tagliate',
            phone: callerPhone,
            storeId: storeId
        }));

        // Chiedi l'orario di ritiro
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, `Perfetto! Riassumo il tuo ordine: ${orderDescription}, con le pizze ${cuttingPreference}. A che ora vorresti ritirare il tuo ordine? Il tempo di preparazione è di circa 20 minuti.`);

        response.gather({
            input: 'speech' as any,
            action: `/api/calls/select-time?orderData=${orderDataQuery}`,
            language: 'it-IT',
            speechTimeout: 'auto'
        });

        console.log('TwiML generato per final-confirm:', response.toString());
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in final-confirm:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace per il problema. Procederemo senza specificare un orario di ritiro.');

        response.redirect(`/api/calls/complete-order?storeId=${req.query.storeId || '1234'}`);
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Aggiungi questi NUOVI endpoint alla fine del tuo file callRoutes.ts esistente:

// Nuovo endpoint per selezionare l'orario di ritiro
router.post('/select-time', (req: Request, res: Response) => {
    try {
        console.log('Select time - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const orderDataStr = req.query.orderData?.toString() || '{}';
        let orderData;

        try {
            orderData = JSON.parse(decodeURIComponent(orderDataStr));
        } catch (e) {
            orderData = {};
            console.error('Errore nel parsing dei dati ordine:', e);
        }

        // Estrai l'orario dal testo
        let selectedSlot = calculateSlot(speechResult);

        // Verifica che l'orario non sia troppo presto (dando tempo per la preparazione)
        const currentTime = new Date();
        const currentSlot = getCurrentTimeSlot();
        const minSlot = currentSlot + 2; // Almeno 30 minuti per la preparazione

        if (selectedSlot < minSlot) {
            // Se l'orario è troppo presto, suggerisci un orario valido
            const suggestedTime = getTimeFromSlot(minSlot);

            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, `Mi dispiace, ma abbiamo bisogno di almeno 30 minuti per preparare il tuo ordine. Ti va bene ritirare alle ${suggestedTime}?`);

            // Passa lo slot suggerito
            response.gather({
                input: 'speech' as any,
                action: `/api/calls/confirm-time?orderData=${orderDataStr}&slot=${minSlot}`,
                language: 'it-IT',
                speechTimeout: 'auto'
            });
        } else {
            // Chiedi conferma dell'orario
            const selectedTime = getTimeFromSlot(selectedSlot);

            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, `Hai selezionato le ore ${selectedTime} come orario di ritiro. Confermi?`);

            response.gather({
                input: 'speech' as any,
                action: `/api/calls/confirm-time?orderData=${orderDataStr}&slot=${selectedSlot}`,
                language: 'it-IT',
                speechTimeout: 'auto'
            });
        }

        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in select-time:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace, non ho capito l\'orario. Userò l\'orario di default tra 30 minuti.');

        // Usa l'orario di default
        const defaultSlot = getCurrentTimeSlot() + 2;
        response.redirect(`/api/calls/confirm-time?orderData=${req.query.orderData}&slot=${defaultSlot}`);

        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Endpoint per confermare l'orario e completare l'ordine
router.post('/confirm-time', async (req: Request, res: Response) => {
    try {
        console.log('Confirm time - Speech Result:', req.body.SpeechResult);
        const response = new VoiceResponse();
        const speechResult = req.body.SpeechResult || '';
        const slot = parseInt(req.query.slot?.toString() || '0');
        const orderDataStr = req.query.orderData?.toString() || '{}';
        let orderData;

        try {
            orderData = JSON.parse(decodeURIComponent(orderDataStr));
        } catch (e) {
            orderData = {};
            console.error('Errore nel parsing dei dati ordine:', e);
        }

        const isConfirmed = speechResult.toLowerCase().includes('sì') ||
            speechResult.toLowerCase().includes('si') ||
            speechResult.toLowerCase().includes('certo') ||
            speechResult.toLowerCase().includes('ok') ||
            speechResult.toLowerCase().includes('perfetto') ||
            speechResult.toLowerCase().includes('corretto') ||
            !speechResult.toLowerCase().includes('no') &&
            !speechResult.toLowerCase().includes('modific');

        if (isConfirmed) {
            try {
                // Crea il nuovo ordine nel database
                const newOrder = new Order({
                    storeId: orderData.storeId || '1234',
                    items: orderData.items.map((item: any) => ({
                        menuItem: item.menuItem,
                        quantity: item.quantity || 1,
                        notes: ''
                    })),
                    totalPrice: 0, // Questo andrebbe calcolato correttamente
                    status: OrderStatus.PENDING,
                    slot: slot,
                    customerInfo: {
                        name: 'Cliente telefonico',
                        phone: orderData.phone || 'Anonimo'
                    },
                    notes: orderData.notes || ''
                });

                await newOrder.save();
                console.log('Ordine salvato con successo:', newOrder._id);

                // Comunica il completamento dell'ordine
                const pickupTime = getTimeFromSlot(slot);
                response.say({
                    voice: 'Polly.Bianca',
                    language: 'it-IT'
                }, `Fantastico! Il tuo ordine è stato registrato. Sarà pronto per il ritiro alle ${pickupTime}. Grazie per aver scelto la nostra pizzeria!`);
            } catch (dbError) {
                console.error('Errore nel salvataggio dell\'ordine:', dbError);
                response.say({
                    voice: 'Polly.Bianca',
                    language: 'it-IT'
                }, 'Il tuo ordine è stato ricevuto ma abbiamo avuto un piccolo problema tecnico nel salvarlo. Ti preghiamo di chiamare il negozio per conferma.');
            }
        } else {
            response.say({
                voice: 'Polly.Bianca',
                language: 'it-IT'
            }, 'Nessun problema! Puoi richiamare quando vuoi per fare un nuovo ordine. Grazie per la tua pazienza e a presto!');
        }

        // Chiudi la chiamata
        response.hangup();

        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Errore in confirm-time:', error);
        const response = new VoiceResponse();
        response.say({
            voice: 'Polly.Bianca',
            language: 'it-IT'
        }, 'Mi dispiace per l\'inconveniente. Il tuo ordine è stato ricevuto. Grazie e arrivederci!');
        response.hangup();
        res.set('Content-Type', 'text/xml');
        res.send(response.toString());
    }
});

// Aggiungi queste funzioni di utilità alla fine del file
function getCurrentTimeSlot(): number {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Math.floor(minutes / 15);
}

function getTimeFromSlot(slot: number): string {
    const totalMinutes = slot * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function calculateSlot(speechText: string): number {
    // Cerca pattern come "13:45", "13 e 45", "alle 2", ecc.
    const timeRegex = /(\d{1,2})[:\s][eE]?\s*(\d{1,2})?/;
    const match = speechText.match(timeRegex);

    if (match) {
        let hours = parseInt(match[1]);
        // Se l'ora è tra 1 e 11, probabilmente è PM se siamo nel pomeriggio/sera
        if (hours >= 1 && hours <= 11) {
            const now = new Date();
            if (now.getHours() >= 12) {
                hours += 12;
            }
        }
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return Math.floor((hours * 60 + minutes) / 15);
    }

    // Se non troviamo un orario specifico, restituisci uno slot dopo 30 minuti
    return getCurrentTimeSlot() + 2;
}

export default router;

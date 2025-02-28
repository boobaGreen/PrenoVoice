# Idea App - Backend

## Descrizione del Progetto

Questo progetto rappresenta il backend dell'applicazione Idea App. L'applicazione consente agli utenti di creare, gestire e condividere idee. Il backend è responsabile della gestione delle richieste API, dell'interazione con il database e dell'implementazione della logica di business.

## Struttura del Progetto

- **/config**: Configurazioni dell'applicazione, come le variabili d'ambiente e le impostazioni del database.
- **/controllers**: Contiene la logica di gestione delle richieste HTTP e le risposte.
- **/models**: Definizione dei modelli di dati utilizzati dall'applicazione, spesso mappati alle collezioni del database.
- **/routes**: Definizione delle rotte dell'API e l'associazione delle rotte ai rispettivi controller.
- **/services**: Servizi di supporto per la logica di business, come l'interazione con il database o l'invio di email.
- **/utils**: Utility e helper functions che forniscono funzionalità comuni riutilizzabili in diverse parti dell'applicazione.

## Struttura del Database

Il database utilizzato è MongoDB. La struttura del database è la seguente:

### Modello Idea

```javascript
const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Idea', ideaSchema);
```

## Tecnologie Utilizzate

- **Node.js**: Ambiente di runtime JavaScript per eseguire il codice lato server.
- **Express.js**: Framework web per Node.js che facilita la creazione di API RESTful.
- **MongoDB**: Database NoSQL utilizzato per memorizzare i dati dell'applicazione.
- **Mongoose**: Libreria di modellazione degli oggetti per MongoDB e Node.js.

## Installazione

1. Clonare il repository:
        ```bash
        git clone <repository-url>
        ```
2. Installare le dipendenze:
        ```bash
        cd idea-app/be
        npm install
        ```
3. Configurare le variabili d'ambiente:
        Creare un file `.env` nella directory principale e aggiungere le seguenti variabili:
        ```plaintext
        DB_CONNECTION=<stringa_di_connessione_al_database>
        PORT=<porta_su_cui_gira_il_server>
        ```

## Utilizzo

Per avviare il server in modalità di sviluppo:
```bash
npm run dev
```

Per avviare il server in modalità di produzione:
```bash
npm start
```

## API Endpoints

- **GET /ideas**: Recupera tutte le idee presenti nel database.
        ```bash
        curl -X GET http://localhost:<porta>/ideas
        ```
- **POST /ideas**: Crea una nuova idea e la salva nel database.
        ```bash
        curl -X POST http://localhost:<porta>/ideas -H "Content-Type: application/json" -d '{"title": "Nuova Idea", "description": "Descrizione della nuova idea"}'
        ```
- **GET /ideas/:id**: Recupera una singola idea per ID dal database.
        ```bash
        curl -X GET http://localhost:<porta>/ideas/<id>
        ```
- **PUT /ideas/:id**: Aggiorna un'idea esistente per ID nel database.
        ```bash
        curl -X PUT http://localhost:<porta>/ideas/<id> -H "Content-Type: application/json" -d '{"title": "Idea Aggiornata", "description": "Descrizione aggiornata"}'
        ```
- **DELETE /ideas/:id**: Elimina un'idea esistente per ID dal database.
        ```bash
        curl -X DELETE http://localhost:<porta>/ideas/<id>
        ```

## Contributi

I contributi sono benvenuti! Si prega di aprire una issue o una pull request per discutere i cambiamenti proposti. Assicurarsi di seguire le linee guida del progetto e di eseguire i test prima di inviare una pull request.

## Licenza

Questo progetto è distribuito sotto la licenza MIT. Vedi il file [LICENSE](LICENSE) per maggiori dettagli.
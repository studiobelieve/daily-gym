// Materiale per l'allenamento nomi: persone inventate con nome, lavoro, città e un dettaglio.
export const NOMI_F = ['Giulia', 'Chiara', 'Francesca', 'Sara', 'Martina', 'Valentina', 'Alessia', 'Federica', 'Elena', 'Silvia',
  'Roberta', 'Paola', 'Ilaria', 'Beatrice', 'Camilla', 'Noemi', 'Rebecca', 'Ginevra', 'Aurora', 'Viola', 'Emma', 'Sophie',
  'Hannah', 'Olivia', 'Laura', 'Marta', 'Lucia', 'Carla', 'Teresa', 'Nadia', 'Irene', 'Greta', 'Diana', 'Rosa', 'Bianca', 'Agata'];
export const NOMI_M = ['Marco', 'Luca', 'Andrea', 'Matteo', 'Davide', 'Simone', 'Stefano', 'Riccardo', 'Gabriele', 'Lorenzo',
  'Paolo', 'Antonio', 'Giuseppe', 'Salvatore', 'Ciro', 'Gennaro', 'Vincenzo', 'Pietro', 'Tommaso', 'Edoardo', 'James', 'Oliver',
  'Daniel', 'Thomas', 'Samuel', 'Leo', 'Nicola', 'Fabio', 'Massimo', 'Claudio', 'Raffaele', 'Bruno', 'Dario', 'Elia', 'Ivan', 'Ugo'];
export const COGNOMI = ['Russo', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti',
  'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Caruso', 'Ferrara',
  'Santoro', 'Martini', 'Leone', 'Longo', 'Gentile', 'Vitale', 'Serra', 'Coppola', 'D\'Angelo', 'Smith', 'Walker', 'Bennett', 'Parker'];
export const LAVORI = ['avvocata/o', 'fotografa/o', 'architetta/o', 'pasticciera/e', 'dentista', 'commercialista', 'pilota',
  'insegnante di yoga', 'social media manager', 'farmacista', 'chef', 'ingegnera/e', 'giornalista', 'veterinaria/o',
  'agente immobiliare', 'grafica/o', 'personal trainer', 'sommelier', 'notaio', 'fioraia/o', 'DJ', 'barista', 'medico', 'sarta/o'];
export const CITTA = ['Napoli', 'Salerno', 'Roma', 'Milano', 'Torino', 'Bari', 'Palermo', 'Firenze', 'Bologna', 'Londra',
  'Caserta', 'Sorrento', 'Pozzuoli', 'Avellino', 'Genova', 'Verona', 'Lecce', 'Barcellona', 'Parigi', 'Berlino'];
export const DETTAGLI = ['ha appena adottato un cane', 'corre maratone', 'colleziona vinili', 'parla quattro lingue',
  'ha vissuto in Giappone', 'suona il violino', 'odia il caffè', 'fa immersioni', 'ha tre figli', 'scrive gialli',
  'coltiva pomodori sul balcone', 'tifa Napoli', 'fa surf', 'ha un food truck', 'è appena tornata/o dall\'Islanda',
  'fa ceramica', 'gioca a padel', 'colleziona orologi', 'cucina sushi', 'ha un gatto di nome Pippo'];

export function lavoroPer(lavoro, femmina) {
  return lavoro.replace(/(\w+)a\/o/g, (_, b) => b + (femmina ? 'a' : 'o')).replace(/(\w+)a\/e/g, (_, b) => b + (femmina ? 'a' : 'e'));
}

export function dettaglioPer(d, femmina) {
  return d.replace(/a\/o/g, femmina ? 'a' : 'o');
}

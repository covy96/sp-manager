-- SEED libreria voci di capitolato (template GLOBALE, studio = NULL).
-- Idempotente: rimuove e reinserisce le 278 voci globali.
-- Esegui DOPO database/capitolato.sql, nel SQL Editor di Supabase.

delete from capitolato_voci where studio is null;

insert into capitolato_voci
  (studio, categoria_code, categoria_nome, codice, titolo, descrizione, unita, tipo, sommano_labels, ordine)
values
  (NULL, $cap$A$cap$, $cap$Opere provvisionali$cap$, $cap$A01$cap$, $cap$ALLESTIMENTO CANTIERE$cap$, $cap$Allestimento del cantiere con adeguata cartellonistica prescritta dalle normative vigenti, tutte le protezioni necessarie all'interno delle aree d’intervento.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 1),
  (NULL, $cap$A$cap$, $cap$Opere provvisionali$cap$, $cap$A02$cap$, $cap$IMPIANTI PROVVISORI$cap$, $cap$Impianto elettrico (quadro di cantiere) ed idraulico (punto acqua e wc operatori) provvisionale.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 2),
  (NULL, $cap$A$cap$, $cap$Opere provvisionali$cap$, $cap$A03$cap$, $cap$MOVIMENTAZIONE MATERIALI$cap$, $cap$Installazione  di  tutto  ciò  che  necessita  per  il carico e scarico dei materiali per l'intera durata del cantiere.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$A$cap$, $cap$Opere provvisionali$cap$, $cap$A04$cap$, $cap$TENUTA DEL CANTIERE$cap$, $cap$Tenuta del cantiere in stato di pulizia durante l'esecuzione dei lavori delle parti comuni di transito ove si rendesse necessario e pulizia finale delle aree oggetto di lavorazione e delle aree esterna. Compresa protezione di quanto consegnato e delle aree ed elementi limitrofi a quelli oggetto di cantiere. Compreso report fotografico dettagliato delle aree oggetto d’intervento o di transito delle maestranze o limitrofe, ante e post operazioni di demolizione, al fine di acclarare lo stato dei luoghi prima dell’allestimento del cantiere. 
Pulizia di cantiere finale al fine dell'inserimento degli allestimenti. 
Protezione del pavimento finito con telo in plastica pesante e strato di tessuto non tessuto sottostante durante le opere di finitura.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$A$cap$, $cap$Opere provvisionali$cap$, $cap$A05$cap$, $cap$PULIZIE DI FINE CANTIERE EDILE$cap$, $cap$Pulizie di fine cantiere edile, prima dell'installazione degli arredi$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B01$cap$, $cap$DEMOLIZIONI TRAMEZZI$cap$, $cap$Demolizione di tramezzi interni in cartongesso, sp. 6 cm, compresa la rimozione dell'orditura metallica di supporto. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento, nonché ogni onere necessario per dare l'area sgombra e pronta per le lavorazioni successive.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 1),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B02$cap$, $cap$DEMOLIZIONE COPERTURA$cap$, $cap$Demolizione della copertura esistente, compresi il manto di finitura e l'orditura di sostegno. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento, e ogni onere per l'esecuzione a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 2),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B03$cap$, $cap$RIMOZIONE SCALA$cap$, $cap$Rimozione della scala esistente di accesso al piano interrato, compresi il parapetto e il cancelletto di accesso. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 3),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B04$cap$, $cap$RIMOZIONE SERRAMENTI$cap$, $cap$Rimozione di serramenti esterni esistenti, compresi telai, controtelai e opere di fissaggio. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 4),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B05$cap$, $cap$RIMOZIONE PORTA DOPPIO BATTENTE$cap$, $cap$Rimozione di porta interna a doppio battente, compresi telaio, coprifili e ferramenta. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 5),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B06$cap$, $cap$RIMOZIONE PORTA A BATTENTE$cap$, $cap$Rimozione di porta interna a battente, compresi telaio, coprifili e ferramenta. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B07$cap$, $cap$RIMOZIONE BOTOLA INGRESSO SOTTOTETTO$cap$, $cap$Demolizione della botola di accesso al piano sottotetto esistente, compresi telaio e finiture. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 7),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B08$cap$, $cap$RIMOZIONE PAVIMENTAZIONE E SOTTOFONDO$cap$, $cap$Rimozione della pavimentazione esistente e del relativo sottofondo/massetto. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento, e ogni onere per dare il piano pronto per le lavorazioni successive.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 8),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B09$cap$, $cap$RIMOZIONE RIVESTIMENTI$cap$, $cap$Rimozione dei rivestimenti esistenti (piastrelle o carta da parati) come da progetto, compresa la scarnitura del supporto ove necessario. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 9),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B10$cap$, $cap$RIMOZIONE ZOCCOLINI IN GRES$cap$, $cap$Rimozione di zoccolini in gres esistenti come da progetto, compresa la pulizia del supporto. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$ml$cap$, $cap$singolo$cap$, $cap$["SOMMANO ml"]$cap$::jsonb, 10),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B11$cap$, $cap$RIMOZIONE ZOCCOLINI IN LEGNO$cap$, $cap$Rimozione di zoccolini in legno esistenti come da progetto, compresa la pulizia del supporto. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$ml$cap$, $cap$singolo$cap$, $cap$["SOMMANO ml"]$cap$::jsonb, 11),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B12$cap$, $cap$RIMOZIONE IMPIANTO ELETTRICO$cap$, $cap$Rimozione dell'impianto elettrico esistente, compresi sfilaggio dei conduttori, rimozione di frutti, placche, scatole e canaline. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 12),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B13$cap$, $cap$RIMOZIONE IMPIANTO IDRAULICO$cap$, $cap$Rimozione dell'impianto idrico-sanitario esistente, compresi tubazioni, apparecchi sanitari e relativi accessori. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 13),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B14$cap$, $cap$RIMOZIONE CANNA FUMARIA$cap$, $cap$Rimozione della canna fumaria esistente, compresi comignolo e opere accessorie. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 14),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B15$cap$, $cap$RIMOZIONE RADIATORE$cap$, $cap$Rimozione di radiatori esistenti, compreso lo scollegamento dall'impianto e le opere accessorie. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 15),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B16$cap$, $cap$DEMOLIZIONE CONTROSOFFITTO CARTONGESSO$cap$, $cap$Demolizione di controsoffitto in cartongesso, compresa la rimozione dell'orditura metallica di sostegno. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 16),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B17$cap$, $cap$RIMOZIONE PAVIMENTO IN PARQUET$cap$, $cap$Rimozione del pavimento esistente in parquet, compresa la rimozione dei residui di collante e del sottofondo. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 17),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B18$cap$, $cap$RIMOZIONE IMPIANTO A GAS$cap$, $cap$Rimozione dell'impianto a gas esistente, compresi la caldaia, le tubazioni e gli accessori, previa messa in sicurezza e sezionamento dell'alimentazione. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 18),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B19$cap$, $cap$RIMOZIONE TERMOARREDO$cap$, $cap$Rimozione di termoarredo esistente, compreso lo scollegamento dall'impianto e le opere accessorie. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 19),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B20$cap$, $cap$DEMOLIZIONE VELETTA$cap$, $cap$Demolizione di veletta in muratura, sp. 10 cm. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 20),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B21$cap$, $cap$DEMOLIZIONE GRADINO$cap$, $cap$Demolizione del gradino esistente in corrispondenza del bagno. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 21),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B22$cap$, $cap$APERTURA NICCHIA$cap$, $cap$Apertura di nicchia per alloggiamento schermi, dimensioni L 90 x H 55 cm, a quota 110 cm dal piano finito. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento, e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 22),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B23$cap$, $cap$RIMOZIONE PORTA SCORREVOLE$cap$, $cap$Rimozione di porta scorrevole esistente, compresi cassonetto, binari, coprifili e ferramenta. Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 23),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B24$cap$, $cap$RIMOZIONE CONTROSOFFITTO ACUSTICO$cap$, $cap$Rimozione dei pannelli acustici in Celenit con mantenimento della struttura portante esistente (H 315 cm). Compresi carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 24),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B25$cap$, $cap$REVISIONE IMPIANTI$cap$, $cap$Revisione degli impianti esistenti con verifica funzionale e adeguamento ove necessario. Compresi smontaggi, movimentazione interna, carico, trasporto, abbassamento al piano e conferimento a discarica autorizzata dei materiali di risulta, inclusi oneri di smaltimento. Opera eseguita a regola d’arte.Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 25),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B26$cap$, $cap$SCAVO PIANO INTERRATO$cap$, $cap$Scavo a mano del terreno per l'abbassamento della quota del piano interrato (zona nuovo spogliatoio), sp. 20 cm, compreso il trasporto a mano al piano strada e il noleggio di arganello per il sollevamento dei materiali di risulta. Compresi carico, trasporto e conferimento a discarica autorizzata, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 26),
  (NULL, $cap$B$cap$, $cap$Demolizioni$cap$, $cap$B27$cap$, $cap$DEMOLIZIONE PAVIMENTO E MASSETTO$cap$, $cap$Demolizione del pavimento e del sottostante massetto per l'abbassamento della quota del piano interrato (zona nuovo spogliatoio), sp. ca. 10 cm. Compresi carico, trasporto e conferimento a discarica autorizzata dei materiali di risulta, inclusi i relativi oneri di smaltimento.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 27),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C01$cap$, $cap$SOTTOFONDO$cap$, $cap$Realizzazione di nuovo sottofondo sp. 10 cm per passaggio impianti
Compreso di strato di polietilene 10 mm, per isolamento termico dalle cantine
Dimensioni sp: 10 cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 1),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C02$cap$, $cap$COSTRUZIONE OPERA MURARIA PERIMETRALE$cap$, $cap$Realizzazione di muratura portante in corrispondenza dei muri perimetrali, quale tamponamento per la chiusura e la riduzione di alcune aperture (finestre/porte), sp. 40 cm. Compresi materiali, sfridi, ponteggi di servizio, carico, trasporto e smaltimento dei materiali di risulta, nonché ogni onere e magistero per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 2),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C03$cap$, $cap$COSTRUZIONE SOLETTA$cap$, $cap$Realizzazione di solaio in laterocemento per l'allineamento alla soletta del piano terra, compresi travetti, pignatte, armatura e getto di completamento in cls. Compresi casseratura, disarmo, carico, trasporto e smaltimento dei materiali di risulta, nonché ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 3),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C04$cap$, $cap$COSTRUZIONE COPERTURA$cap$, $cap$Realizzazione di nuova copertura esterna, compresi struttura portante, manto di copertura, elementi di raccordo e sigillature. Compresi ponteggi di servizio, carico, trasporto e smaltimento dei materiali di risulta, nonché ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 4),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C05$cap$, $cap$RINFORZO SOLAIO$cap$, $cap$Realizzazione di rinforzo del solaio esistente mediante idonei elementi di rinforzo dimensionati secondo progetto strutturale, compresi fissaggi, saldature/bullonature, trattamenti protettivi e ogni onere e magistero per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 5),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C06$cap$, $cap$SCALA DI COLLEGAMENTO$cap$, $cap$Realizzazione di scala di collegamento tra il piano terra e il piano primo, con struttura portante in ferro, compresi gradini, parapetto/ringhiera, trattamento antiruggine e verniciatura, fissaggi e ogni onere e magistero per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C07$cap$, $cap$MURO IN CARTONGESSO BASE$cap$, $cap$Realizzazione di pareti in doppia lastra in cartongesso su entrambi i lati, montanti ed ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 10 cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 7),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C08$cap$, $cap$MURO IN CARTONGESSO - CON ISOLANTE - 10 cm$cap$, $cap$Realizzazione di pareti in doppia lastra in cartongesso su entrambi i lati, struttura 50x50, Lana di vetro da 60 mm con densità 32kg/mc (Tipo Knauf Mineral Wool 32 o Isover Arena 32)
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 10 cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 8),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C09$cap$, $cap$MURO IN CARTONGESSO IDRO$cap$, $cap$Realizzazione di pareti in doppia lastra in cartongesso idro - 12.5 mm - su entrambi i lati, struttura 75x75
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 10 cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 9),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C10$cap$, $cap$NICCHIE IN CARTONGESSO$cap$, $cap$Realizzazione di pareti in singola lastra in cartongesso, montanti ed ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 5 cm 
Rif. Tav. 02B in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 10),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C11$cap$, $cap$CONTROSOFFITTO IN CARTONGESSO BASE$cap$, $cap$Fornitura e posa in opera di controsoffittatura in lastra singola di cartongesso, dello spessore pari a mm. 12.5, poste in opera a regola d'arte, perfettamente stuccate, mediante orditura in profilati di lamiera zincata pressopiegata, appesa alla sovrastante struttura con profilati pure in lamiera zincata; compresi impalcati, manovalanza, chiodatura, angolari e parabordi, perfetto raccordo alle strutture verticali con formazione di giunto siliconico. 
DImensioni sp: 1.25 cm
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 11),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C12$cap$, $cap$PLACCATURA IN CARTONGESSO$cap$, $cap$Realizzazione di placcatura in singola lastra in cartongesso al fine di riportare in squdra le pareti
Dimensioni sp: 10 cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 12),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C13$cap$, $cap$RINFORZI PARETI IN CARTONGESSO$cap$, $cap$Realizzazione di rinforzi in legno sulle pareti in cartongesso per installazione mensole e insegne.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 13),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C14$cap$, $cap$RIBASSAMENTI IN CARTONGESSO - CON ISOLANTE$cap$, $cap$Realizzazione di ribassamenti in cartongesso comprensivi di struttura, pendinatura a soffitto e strato di lana di vetro da 32kg/mc di almeno 40 mm
DImensioni sp: 1.25 cm
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 14),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C15$cap$, $cap$RIBASSAMENTI CUCINE - CON ISOLANTE$cap$, $cap$Realizzazione di ribassamenti in doppia lastra in cartongesso su lato singolo, comprensivo di struttura e pendinatura, Lana di vetro da almeno 40 mm con densità 32kg/mc (Tipo Knauf Mineral Wool 32 o Isover Arena 32). 
Profondità: 30 cm
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte.
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 15),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C16$cap$, $cap$IMPERMEABILIZZAZIONE DOCCIA$cap$, $cap$Realizzazione di impermeabilizzazione di pareti doccia tramite mapelastic
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 16),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C17$cap$, $cap$VELETTA TENDE$cap$, $cap$Realizzazione di veletta in cartongesso per l'alloggiamento delle tende, compresa struttura metallica di sostegno, lastre, stuccature e rasature, e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 17),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C18$cap$, $cap$RASATURA A GESSO$cap$, $cap$Rasatura a gesso delle nuove superfici in cartongesso, compresa fornitura del materiale, applicazione, carteggiatura e preparazione del supporto per le successive finiture, e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 18),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C19$cap$, $cap$RIPRISTINII$cap$, $cap$Realizzazione di ripristini su pareti esistenti ove sono state realizzate aperture e tracce impianti 
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 19),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C20$cap$, $cap$CREAZIONE BOTOLA$cap$, $cap$Realizzazione di botola per la chiusura della soletta, comprensiva di telaio, elemento di chiusura apribile, ferramenta e finiture di raccordo, e ogni onere e magistero per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 20),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C21$cap$, $cap$REVISIONE TAPPARELLE ESISTENTI$cap$, $cap$Revisione e sistemazione di n.4 tapparelle esistenti, comprensivo di motore e tapparelle. 
Rif. tav. 02 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 21),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C22$cap$, $cap$ASSISTENZE MURARIE IMPIANTI$cap$, $cap$Assistenze murarie per impianto elettrico, meccanico ed idraulico. Tracce nella muratura o pavimento, eseguite a mano, compresa la chiusura delle tracce e l'avvicinamento del materiale di risulta al luogo di deposito provvisorio, carico, trasporto scarico e oneri di discarica:
Rif. Tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 22),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C23$cap$, $cap$LIVELLINA$cap$, $cap$Realizzazione di nuovo strato di livellina per pareggiare rimozione parquet camere
Dimensioni sp: da definire 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 23),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C24$cap$, $cap$MURO BASSO IN CARTONGESSO - CON ISOLANTE - 7.5 cm$cap$, $cap$Realizzazione di pareti in lastra singola in cartongesso su entrambi i lati, struttura 50x50, Lana di vetro da 40 mm con densità 32kg/mc (Tipo Knauf Mineral Wool 32 o Isover Arena 32)
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 7.5 cm 
LASTRE IN CARTONGESSO IDRO PER LE ZONE BAGNO
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 24),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C25$cap$, $cap$CONTROPARETE IN CARTONGESSO - CON ISOLANTE$cap$, $cap$Realizzazione di contropareti in doppio lastra in cartongesso su lato singolo, struttura 50x50, Lana di vetro da 60 mm con densità 32kg/mc (Tipo Knauf Mineral Wool 32 o Isover Arena 32)
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: da definire in fase di progetto cm 
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 25),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C26$cap$, $cap$MURO IN CARTONGESSO$cap$, $cap$Realizzazione di pareti in singola lastra in cartongesso, montanti ed ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Dimensioni sp: 10 cm
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 26),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C27$cap$, $cap$CONTROPARETI IN CARTONGESSO$cap$, $cap$Realizzazione di controparete in cartongesso per squadratura stanza. Struttura 75x75.
Compreso di ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm).
Rif. Tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 27),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C28$cap$, $cap$CONTROSOFFITTO RINFORZATO$cap$, $cap$Fornitura e posa in opera di controsoffittatura strutturale in legno rinforzato per la realizzazione di deposito in quota, idonea a sopportare un carico accidentale uniformemente distribuito fino a 50 kg/m². Comprensiva di orditura portante e secondaria, elementi di irrigidimento, fissaggi meccanici a struttura esistente o idonei supporti, tavolato di chiusura, ferramenta, viteria e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 28),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C29$cap$, $cap$GOLE IN CARTONGESSO$cap$, $cap$Realizzazione di gola luminosa in cartongesso per alloggiamento di profilo LED, costituita da struttura metallica zincata, lastre in cartongesso, sagomature, fissaggi, stuccature e rasature, completa di predisposizione per il passaggio delle linee elettriche e di ogni onere necessario per dare l'opera finita a regola d'arte. Misurazione a metro lineare. Esclusi profili in alluminio, strip LED, alimentatori e collegamenti elettrici.
Rif. tav. 02 in allegato$cap$, $cap$ml$cap$, $cap$singolo$cap$, $cap$["SOMMANO ml"]$cap$::jsonb, 29),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C30$cap$, $cap$VELETTA IN CARTONGESSO$cap$, $cap$Realizzazione di veletta in cartongesso, montanti ed ogni onere e magistero per dare il lavoro finito ad opera d'arte (montanti ogni 60 cm). Comprensivo di rinforzi in legno per il sostegno del serramento interno e della parete in allestimento.
Dimensioni sp: 10 cm
H 100 cm
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 30),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C31$cap$, $cap$GETTO PLATEA$cap$, $cap$Realizzazione di getto di platea in cls armato con doppia rete elettrosaldata, per garantire la successiva posa del sottofondo e della pavimentazione (zona nuovo spogliatoio piano interrato). Compresi casseratura, ferro di armatura, getto, staggiatura e ogni onere e magistero per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 31),
  (NULL, $cap$C$cap$, $cap$Costruzioni$cap$, $cap$C32$cap$, $cap$SPOSTAMENTO PASSAVIVANDE ESISTENTE$cap$, $cap$Spostamento del passavivande esistente mediante rimozione della vetrata, chiusura parziale dell'apertura esistente e realizzazione della nuova porzione di apertura secondo progetto. Compresi adeguamenti murari, ripristino delle superfici con intonaco e rasatura, rimontaggio della vetrata esistente nella nuova posizione, carico, trasporto e smaltimento dei materiali di risulta, nonché ogni onere necessario per dare l'opera finita a regola d'arte.
Rif. tav. 02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 32),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D01$cap$, $cap$PRT_01 - PORTA A DOPPIO SCORRIMENTO - 90 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a doppio scorrimento, comprensiva di ante, telaio/controtelaio, sistema di scorrimento, coprifili, ferramenta e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 90 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 1),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D02$cap$, $cap$PRT_01 - PORTA A DOPPIO SCORRIMENTO - 160 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a doppio scorrimento, comprensiva di ante, telaio/controtelaio, sistema di scorrimento, coprifili, ferramenta e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 160 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 2),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D03$cap$, $cap$PRT_02 - PORTA BATTENTE - 90 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta, serratura e accessori - apertura a destra. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 90 x 210 cm
Rif. tav. 05 in allegato
Bagno disabili$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 3),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D04$cap$, $cap$PRT_03 - PORTA BATTENTE - 70 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta, serratura e accessori - apertura a sinistra. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 70 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 4),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D05$cap$, $cap$PRT_04 - PORTA BATTENTE - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta, serratura e accessori - apertura a sinistra. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 5),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D06$cap$, $cap$PRT_05 - PORTA BATTENTE - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta, serratura e accessori - apertura a sinistra. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 6),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D07$cap$, $cap$PRT_06 - PORTA A DOPPIO BATTENTE BLINDATA - 100 x 225 cm$cap$, $cap$Fornitura e posa in opera di porta a doppio battente blindata, comprensiva di ante, telaio/controtelaio, coprifili, ferramenta di sicurezza, serratura e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 100 x 225 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 7),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D08$cap$, $cap$PRT_07 - PORTA BATTENTE BLINDATA - 100 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente blindata, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta di sicurezza, serratura e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 100 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 8),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D09$cap$, $cap$PRT_08 - PORTA BATTENTE FILOMURO - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente a filomuro, comprensiva di anta, telaio/controtelaio a scomparsa, coprifili, ferramenta, serratura e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 9),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D10$cap$, $cap$SE_01 - SERRAMENTO CON APERTURA A GHIGLIOTTINA$cap$, $cap$Fornitura e posa in opera di serramento esterno con apertura a ghigliottina (scorrimento verticale), comprensivo di telaio, controtelaio, vetrocamera, guarnizioni, ferramenta e accessori. Compresi fissaggi, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte. Anta a ghigliottina 61,5 x 194 cm.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 194 x 290 cm
Rif. tav. 05b in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 10),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D11$cap$, $cap$SE_02 - SERRAMENTO FISSO CON PORTA A BATTENTE$cap$, $cap$Fornitura e posa in opera di serramento esterno fisso comprensivo di porzione mobile con porta a battente, telaio, controtelaio, vetrocamera, guarnizioni, ferramenta e accessori. Compresi fissaggi, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 200 x 290 cm
Dimensioni porta: 90 x 224 cm
Rif. tav. 05b in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 11),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D12$cap$, $cap$SE_03 - SERRAMENTO FISSO$cap$, $cap$Fornitura e posa in opera di serramento esterno fisso, comprensivo di telaio, controtelaio, vetrocamera, guarnizioni e accessori. Compresi fissaggi, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 200 x 290 cm
Rif. tav. 05b in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 12),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D13$cap$, $cap$PRT_01 - PORTA BATTENTE - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta, serratura e accessori - apertura a sinistra. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 13),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D14$cap$, $cap$PRT_02 - PORTA A SCORRIMENTO - 70 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a scorrimento, comprensiva di anta, telaio/controtelaio, sistema di scorrimento, coprifili, ferramenta e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 70 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 14),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D15$cap$, $cap$PRT_03 - PORTA A SCORRIMENTO - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a scorrimento, comprensiva di anta, telaio/controtelaio, sistema di scorrimento, coprifili, ferramenta e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 15),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D16$cap$, $cap$PRT_04 - PORTA BATTENTE FILOMURO - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente a filomuro, comprensiva di anta, telaio/controtelaio a scomparsa, coprifili, ferramenta, serratura e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 16),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D17$cap$, $cap$PRT_05 - PORTA BATTENTE BLINDATA - 90 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente blindata, comprensiva di anta, telaio/controtelaio, coprifili, ferramenta di sicurezza, serratura e accessori. Compresi fissaggi, guarnizioni, sigillature, regolazioni e ogni onere per dare l'opera installata e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 90 x 210 cm
Rif. tav. 05 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 17),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D18$cap$, $cap$P_01 - PORTA A BATTENTE BLINDATA - 90 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente blindata - CLASSE DI SICUREZZA 3 - comprensiva di serramento, copriprofilo e adattamento per installazione serratura con sistema NUKI, maniglia da definire
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 90 x 210 cm
Rif. tav. 10 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 18),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D19$cap$, $cap$P_02 - PORTA BATTENTE - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente - comprensiva di serramento, copriprofilo e serratura - pannello in MDF con abbattimento acustico 30 dB
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 10 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 19),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D20$cap$, $cap$P_03 - PORTA A SCORRIMENTO - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a scorrimento - comprensiva di serramento, copriprofilo e serratura - pannello da definire
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 10 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 20),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D21$cap$, $cap$P_04 - PORTA BATTENTE - 80 x 210 cm$cap$, $cap$Fornitura e posa in opera di porta a battente - comprensiva di serramento, copriprofilo e serratura - pannello da definire
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 80 x 210 cm
Rif. tav. 10 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 21),
  (NULL, $cap$D$cap$, $cap$Abaco porte$cap$, $cap$D22$cap$, $cap$SE_04 - SOVRALUCE CUCINA - 90 x 215 cm$cap$, $cap$Rimozione del sovraluce esistente e fornitura e posa in opera di nuovo sovraluce, completo di telaio, controtelaio, vetrocamera, guarnizioni, ferramenta e accessori. Compresi fissaggi, sigillature, regolazioni, ripristini necessari e ogni onere per dare l'opera finita e perfettamente funzionante a regola d'arte.
AZIENDA XXX
CODICE XXX
Finitura da definire in fase di progettazione
Dimensioni: 90 x 215 cm
Rif. tav. 04 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 22),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E01$cap$, $cap$IMPIANTO IDRICO$cap$, $cap$Progetto e realizzazione di nuovo impianto idrico sanitario di n.2 bagni, n.1 antibagno e n.2 cucine come da progetto esecutivo fornito da vostro professionista - comprensivo di tubazioni e tutto il necessario per la corretta realizzazione dell'impianto. 
Riferimento alle tavole esecutive.
Rif. tav. 04 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 1),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E02$cap$, $cap$ADEGUAMENTO IMPIANTO RISCALDAMENTO$cap$, $cap$Adeguamento impianto di riscaldamento sanitario di n.2 bagni, n.1 antibagno come da progetto esecutivo fornito da vostro professionista - comprensivo di tubazioni e tutto il necessario per la corretta realizzazione dell'impianto. 
Riferimento alle tavole esecutive.
Rif. tav. 04 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 2),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E03$cap$, $cap$DISTACCAMENTO IMPIANTO CONDOMINIALE$cap$, $cap$Distaccamento dall'impianto di riscaldamento condominiale mediante svuotamento del circuito, sezionamento e rimozione dei termosifoni esistenti; compresi tappatura delle derivazioni, smaltimento del materiale rimosso e ogni onere per dare l'opera finita a regola d'arte.
Riferimento alle tavole esecutive
Distaccamento impianto condominiale$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E04$cap$, $cap$SCALDABAGNO ACQUA SANITARIA$cap$, $cap$Fornitura e posa in opera di scaldabagno per acqua calda sanitaria tipo Ariston Velis Evo 50 L (uno per camera), compresi staffaggi, collegamenti idraulici ed elettrici, gruppo di sicurezza, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Riferimento alle tavole esecutive$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E05$cap$, $cap$WC$cap$, $cap$Fornitura e posa in opera di n.2 water - comprensivo di
allacciamento all'impianto idrico, cassetta ad incasso, placca comando a due tasti e sedile. 
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. Tav. 06 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E06$cap$, $cap$LAVABO$cap$, $cap$Fornitura e posa in opera di n. 2 lavabo -comprensivo di tubazioni, rubinetteria e tutto il necessario per l'allacciamento all'impianto idrico.
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. Tav. 06 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 6),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E07$cap$, $cap$MOBILE LAVABO$cap$, $cap$Fornitura e posa in opera di n. 2 mobili lavabo
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. Tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 7),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E08$cap$, $cap$SPECCHIO BAGNO$cap$, $cap$Fornitura e posa in opera di specchio da definire - 
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 8),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E09$cap$, $cap$BIDET A TERRA$cap$, $cap$Fornitura e posa in opera di bidet - comprensivo di tubazioni, rubinetteria e tutto il necessario per l'allacciamento all'impianto idrico.
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 9),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E10$cap$, $cap$PIATTO DOCCIA, BAGNO 01 - 150 x 80 cm$cap$, $cap$Fornitura e posa in opera di piatto doccia - comprensivo di tubazioni, rubinetteria e tutto il necessario per l'allacciamento all'impianto idrico. 
Dimensioni piatto doccia: 150 x 80 cm
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 10),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E11$cap$, $cap$CRISTALLO DOCCIA, BAGNO 01 - 80 x 200 cm$cap$, $cap$Fornitura e posa in opera di cristallo doccia.
Dimensioni cristallo doccia: 150 x 80 cm
Azienda:
Tipologia:
Finitura:
Dimensioni: 80 x 200 cm
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 11),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E12$cap$, $cap$BAGNO DISABILI$cap$, $cap$Fornitura e posa in opera di sanitari relativi al bagno disabili
Riferimento alle tavole esecutive.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 12),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E13$cap$, $cap$TERMOARREDO$cap$, $cap$Fornitura e posa in opera di termoarredo idraulico - comprensivo di tutto il necessario per l'allacciamento all'impianto idrico. 
Azienda:
Tipologia:
Finitura:
Dimensioni:  50 x 120 cm
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 13),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E14$cap$, $cap$RADIATORI$cap$, $cap$Fornitura e posa in opera di radiatore idraulico - comprensivo di tutto il necessario per l'allacciamento all'impianto idrico. 
Azienda:
Tipologia:
Finitura:
Dimensioni:
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 14),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E15$cap$, $cap$IMPIANTO IDRICO - RISCALDAMENTO A PAVIMENTO$cap$, $cap$Fornitura e posa in opera di nuovo impianto di riscaldamento a pavimento tramite pannelli radianti
AZIENDA
MODELLO
COLORE
DIMENSIONI
Rif. tav.31 / 32 / 33 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["SOMMANO mq"]$cap$::jsonb, 15),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E16$cap$, $cap$PREDISPOSIZIONE IMPIANTO ADDOLCITORE$cap$, $cap$Predisposizione dell'impianto per acqua addolcita, con linee dedicate per AF diametro 16 mm e rubinetti, dal punto addolcitore agli apparecchi secondo indicazioni del fornitore; compresi tubazioni, raccordi, staffaggi e ogni onere per dare la predisposizione completa a regola d'arte.
Rif. tav. 9 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["sommano a corpo"]$cap$::jsonb, 16),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E17$cap$, $cap$SISTEMA OSMOSI$cap$, $cap$Fornitura e posa in opera di sistema a osmosi per il trattamento dell'acqua, compresi membrane, prefiltri, serbatoio, raccordi, collegamenti idraulici, prove di funzionamento e ogni onere per dare l'impianto completo e funzionante a regola d'arte.
Rif. tav. 9 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["sommano a corpo"]$cap$::jsonb, 17),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E18$cap$, $cap$GRIGLIATI A PAVIMENTO 100X30$cap$, $cap$Fornitura e posa in opera di grigliati/pilette a pavimento con scarico orizzontale, dimensioni 100x30 cm; compresi sifonatura, raccordi allo scarico, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 9 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 18),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E19$cap$, $cap$GRIGLIATI A PAVIMENTO 30X30$cap$, $cap$Fornitura e posa in opera di grigliati/pilette a pavimento con scarico orizzontale, dimensioni 30x30 cm; compresi sifonatura, raccordi allo scarico, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 9 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 19),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E20$cap$, $cap$CRISTALLO DOCCIA, SCORREVOLE - BAGNO 01 - 80 x 200 cm$cap$, $cap$Fornitura e posa in opera di cristallo doccia scorrevole
Dimensioni cristallo doccia: 150 x 80 cm
Azienda:
Tipologia:
Finitura:
Dimensioni: 80 x 200 cm
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 20),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E21$cap$, $cap$PIATTO DOCCIA, BAGNO 02 - 90 x 70 cm$cap$, $cap$Fornitura e posa in opera di piatto doccia - comprensivo di tubazioni, rubinetteria e tutto il necessario per l'allacciamento all'impianto idrico. 
Dimensioni piatto doccia: 90 x 70 cm
Azienda:
Tipologia:
Finitura:
Dimensioni: 
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 21),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E22$cap$, $cap$CRISTALLO DOCCIA APRIBILE, BAGNO 02 - 90 x 70 cm$cap$, $cap$Fornitura e posa in opera di cristallo doccia apribile.
Dimensioni cristallo doccia: 90 x 70 cm
Azienda:
Tipologia:
Finitura:
Dimensioni: 90 x 70 cm
Riferimento alle tavole esecutive
Rif. tav. 06 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 22),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E23$cap$, $cap$WC A TERRA$cap$, $cap$Fornitura e posa in opera di water a terra filomuro - comprensivo di allacciamento all'impianto idrico, cassetta ad incasso, placca comando a due tasti e sedile.
Riferimento alle tavole esecutive
Rif. tav. 04 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 23),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E24$cap$, $cap$PIATTO DOCCIA - 160 x 70 cm$cap$, $cap$Fornitura e posa in opera di piatto doccia - comprensivo di tubazioni, rubinetteria, vetro divisorio e tutto il necessario per l'allacciamento all'impianto idrico. 
Dimensioni piatto doccia: 160 x 70 cm
Dimensioni specchio: 100 x 210 cm
Riferimento alle tavole esecutive
Rif. tav. 04 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 24),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E25$cap$, $cap$CRISTALLO DOCCIA$cap$, $cap$Fornitura e posa in opera di cristallo doccia 
Dimensioni cristallo doccia, bagno camera 02: 100 x 144 cm
Dimensioni cristallo doccia, antibagno: 100 x 210 cm
Riferimento alle tavole esecutive
Rif. tav. 04 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 25),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E26$cap$, $cap$RADIATORE$cap$, $cap$Fornitura e posa in opera di radiatore idraulico - comprensivo di tutto il necessario per l'allacciamento all'impianto idrico. 
Dimensioni: da definire
Riferimento alle tavole esecutive
Rif. tav. 04 in allegato$cap$, $cap$$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano", "POSA - sommano"]$cap$::jsonb, 26),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E27$cap$, $cap$PILETTA DI SCARICO$cap$, $cap$Fornitura e posa in opera di pilette di scarico a pavimento nell'area laboratorio (quantità e posizione da verificare in cantiere); compresi sifonatura, raccordi allo scarico, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 5 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 27),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E28$cap$, $cap$SISTEMA TRITURAZIONE E SOLLEVAMENTO ACQUE REFLUE$cap$, $cap$Fornitura e posa in opera di apparecchio trituratore e sollevatore per acque reflue domestiche tipo Sanitrit o equivalente, idoneo al collegamento di WC e/o altri apparecchi sanitari; completo di pompa, trituratore, valvole di non ritorno, raccordi, collegamenti idraulici ed elettrici, fissaggi, prove di funzionamento e ogni onere per dare l'impianto perfettamente funzionante a regola d'arte.
Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 28),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E29$cap$, $cap$RUBINETTO ELETTRONICO A INFRAROSSI$cap$, $cap$Fornitura e posa in opera di rubinetto con miscelatore elettronico a infrarossi (personale tipo SETTEMIX cromo 230V; clienti tipo Vertof Kombo Tap nero), completo di corpo incasso, alimentazione, accessori di fissaggio e collegamenti alle predisposizioni idriche ed elettriche; compresi taratura, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 29),
  (NULL, $cap$E$cap$, $cap$Idrico-sanitario$cap$, $cap$E30$cap$, $cap$PLACCA COMANDO WC AUTOMATICA E MANUALE$cap$, $cap$Fornitura e posa in opera di placca di comando per cassetta WC a doppia modalità di azionamento (automatica tramite sensore di prossimità e manuale a pulsante), completa di alimentazione, accessori, collegamenti, regolazioni e ogni onere per dare il sistema perfettamente funzionante e installato a regola d'arte.
Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 30),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F01$cap$, $cap$IMPIANTO ELETTRICO$cap$, $cap$el:
- Linee di alimentazioni
- Linee di alimentazione in derivazione
- Distribuzione principale piano terra
- Illuminazione ordinaria
- Illuminazione di emergenza / sicurezza
- FM prese e alimentazioni dirette
- Impianto trasmissione dati / telefonia
- Documentazione e verifiche
Rif. tav. 05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 1),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F02$cap$, $cap$IMPIANTO DATI$cap$, $cap$Fornitura e posa in opera di nuovo impianto dati comprensivo di posa cavi UTP, punti rete, Rack, patch cord e certificazione impianto, come da progetto esecutivo fornito da vostro professionista$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 2),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F03$cap$, $cap$IMPIANTO ANTINTRUSIONE TELEGESTIBILE$cap$, $cap$Fornitura e posa di centralina wireless per la gestione dell'impanto antintrusione completo di contatti magnetici, sensori sonda, rilevatori volumetrici, tastiere con display, telecomandi e sirene, comprensivo di programmazione e collaudo come da progetto esecutivo fornito da vostro professionista.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F04$cap$, $cap$Quadro elettrico generale$cap$, $cap$Fornitura e posa in opera di nuovo quadro elettrico generale e creazione di n.2 sottoquadri e salvavite riferite alle 2 camere.
Rif. tav. 05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F05$cap$, $cap$MONTAGGIO CORPI LUMINOSI$cap$, $cap$Montaggio di corpi illuminanti forniti dal cliente, compresi fissaggi, collegamenti elettrici alle predisposizioni esistenti, allineamenti, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F06$cap$, $cap$CASSE AUDIO$cap$, $cap$Fornitura e posa in opera di casse audio (tipo e modello da definire), compresi staffaggi, cablaggi, collegamenti all'impianto audio, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F07$cap$, $cap$FARETTI ORIENTABILI$cap$, $cap$Fornitura e posa in opera di faretti orientabili a LED incassati nel controsoffitto (modello da definire), compresi fissaggi, collegamenti elettrici, orientamento, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 7),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F08$cap$, $cap$LED PANEL$cap$, $cap$Fornitura e posa in opera di pannelli LED (modello da definire), compresi fissaggi a incasso o a sospensione, collegamenti elettrici, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 8),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F09$cap$, $cap$PLAFONIERA SERVIZIO$cap$, $cap$Fornitura e posa in opera di plafoniere a LED per i locali di servizio (modello da definire), compresi fissaggi, collegamenti elettrici, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 9),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F10$cap$, $cap$LUCE EMERGENZA$cap$, $cap$Fornitura e posa in opera di luce di emergenza mod. Beghelli Micro Dot 19719

Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 10),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F11$cap$, $cap$STRIP LED GOLE$cap$, $cap$Fornitura e posa in opera di striscia LED ad alta efficienza, idonea per installazione in gole luminose e profili in alluminio, completa di alimentatori, accessori di fissaggio, cablaggi, connessioni, giunzioni, terminali e ogni componente necessario al corretto funzionamento dell'impianto. Compresi collegamenti elettrici, prove di funzionamento, regolazioni e ogni onere per dare l'opera perfettamente installata e funzionante a regola d'arte. 

Colore 3000 K

Da definire

Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 11),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F12$cap$, $cap$CAMPANELLO$cap$, $cap$Fornitura e posa in opera di campanello wireless (Wi-Fi) per chiamata accesso disabili (modello da definire), compresi alimentazione, configurazione, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 6b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 12),
  (NULL, $cap$F$cap$, $cap$Elettrico$cap$, $cap$F13$cap$, $cap$ASCIUGATORE MANI ELETTRICO$cap$, $cap$Fornitura e posa in opera di asciugatore elettrico per mani a parete, completo di staffaggi, collegamenti elettrici alle predisposizioni esistenti, fissaggi, messa in servizio, prove di funzionamento e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 13),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G01$cap$, $cap$IMPIANTO CLIMATIZZAZIONE$cap$, $cap$Verifica e integrazione di impianto di climatizzazione esistente per riscaldamento e raffrescamento. Verifica e integrazione di macchina interna ed esterna. Fornitura e posa in opera di nuovi terminali - canale microforato a vista verniciato RAL da definire; termostato per la regolazione e quanto necessario alla finalizzazione dell'impianto come da progetto esecutivo fornito da vostro professionista. Compreso collaudo e rilascio certificazioni.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 1),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G02$cap$, $cap$IMPIANTO AREAZIONE FORZATA$cap$, $cap$Verifica e integrazione di  impianto di trattamento aria esistente. Verifica e integrazione di canale di ripresa aria. Fornitura e posa in opera di nuovi terminali da definire e quanto necessario alla finalizzazione dell'impianto come da progetto esecutivo fornito da vostro professionista. Compreso collaudo e rilascio certificazioni.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 2),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G03$cap$, $cap$IMPIANTO ASPIRAZIONE CUCINA$cap$, $cap$Fornitura e posa in opera di impianto di aspirazione a carboni attivi per la cucina, comprensivo di gruppo aspirante, filtri a carboni attivi, canalizzazioni, comandi e accessori. Compresi collegamenti alle predisposizioni, fissaggi, staffaggi, prove di funzionamento e ogni onere necessario per dare l'opera completa e funzionante a regola d'arte.
Riferimento alle tavole esecutive$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G04$cap$, $cap$IMPIANTO RISCALDAMENTO A RADIATORI$cap$, $cap$Fornitura e posa in opera di impianto di riscaldamento a radiatori, comprensivo di corpi scaldanti, valvole, detentori, teste termostatiche, tubazioni di adduzione e ritorno, collegamenti al generatore, sfiati, prove di tenuta e ogni onere necessario per dare l'impianto completo e funzionante a regola d'arte.
Riferimento alle tavole esecutive$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G05$cap$, $cap$IMPIANTO CONDIZIONAMENTO CON SPLIT$cap$, $cap$Realizzazione di impianto di condizionamento con unità split per ogni camera (modelli e potenze da definire), comprensivo di unità interne ed esterne, linee frigorifere, scarico condensa, collegamenti elettrici, staffaggi, prove di funzionamento e ogni onere necessario per dare l'impianto completo e funzionante a regola d'arte.
Riferimento alle tavole esecutive$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G06$cap$, $cap$IMPIANTO RICAMBIO D'ARIA FORZATO$cap$, $cap$Fornitura e posa in opera di impianto di ripresa ed espulsione per ricambio d'aria forzato tramite impianto canalizzato, comprensivo di macchina esterna e macchina interna.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 6),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G07$cap$, $cap$REVISIONE IMPIANTO CLIMATIZZAZIONE$cap$, $cap$Revisione di impianto di climatizzazione per il raffrescamento, comprensivo di spostamento unità interna della camera 01, spostamento unità esterna, allaccio per lo scarico della condensa di tutti gli split previsti, comprensivo di tubazioni e tutto il necessario per realizzare l'impiano alla regola dell'arte, e pulizia dei filtri delle unità interne esistenti
Compreso collaudo e rilascio certificazioni.
Rif. tav. 09 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 7),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G08$cap$, $cap$IMPIANTO ESTRAZIONE FORZATA$cap$, $cap$Fornitura e posa in opera di ventola motorizzata per estrazione d'aria forzata 12 V/h tramite impianto canalizzato.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 8),
  (NULL, $cap$G$cap$, $cap$Meccanico$cap$, $cap$G09$cap$, $cap$CANNA FUMARIA$cap$, $cap$Rimozione della tubazione flessibile esistente all'interno della canna fumaria e risanamento mediante intubamento con guaina termoindurente tipo Furanflex o equivalente, dimensionata secondo le verifiche in opera. Compresi adattamenti, raccordi, terminali, opere accessorie, trasporto e conferimento a discarica dei materiali di risulta, eventuale impianto provvisorio di estrazione durante le lavorazioni e rilascio delle certificazioni di conformità, per dare l'opera eseguita a regola d'arte.
Rif. tav. 09 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 9),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H01$cap$, $cap$PROFILO OTTONE$cap$, $cap$Fornitura e posa in opera di profili in ottone a pavimento in corrispondenza dei cambi di pavimentazione (parquet/piastrelle), compresi taglio a misura, fissaggio, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$ml$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano ml", "POSA - sommano ml"]$cap$::jsonb, 1),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H02$cap$, $cap$PARQUET$cap$, $cap$Parquet Berti Pavimenti Legno 
Rovere spazzolato verniciato 2 strati
Dim. Lung. 550/880, Largh. 120, sp. 13 mm
Posa: spina ungherese 60°

Rif. tav. 05 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq +30% sfrido", "POSA - sommano mq"]$cap$::jsonb, 2),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H03$cap$, $cap$GRES R10$cap$, $cap$Gres R10
Casalgrande
unicolore grigio cenere scura R10
Dim. 30 x 30 cm
sp. 8 mm
Posa: lineare

Rif. tav. 05 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq + 5% sfrido", "POSA - sommano mq"]$cap$::jsonb, 3),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H04$cap$, $cap$PAV_01 - XXX$cap$, $cap$Pavimentazione in piastrelle in gres
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 4),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H05$cap$, $cap$ZOCCOLINO LEGNO$cap$, $cap$Fornitura e posa in opera di zoccolino in legno grezzo, compresi taglio, fissaggio, stuccatura dei giunti e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$ml$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - ml", "POSA - ml"]$cap$::jsonb, 5),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H06$cap$, $cap$SGUSCIA$cap$, $cap$Fornitura e posa in opera di sguscia integrata
paraspigoli

Rif. tav. 05 in allegato$cap$, $cap$ml$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - ml", "POSA - ml"]$cap$::jsonb, 6),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H07$cap$, $cap$ZERBINO$cap$, $cap$Zerbino da definire in fase di progettoDimensioni: 102.5 x 60 cm
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura: incassato nel pavimento
Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 7),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H08$cap$, $cap$PARASPIGOLI$cap$, $cap$Fornitura e posa in opera di paraspigoli, compresi taglio a misura, fissaggio, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["sommano a corpo"]$cap$::jsonb, 8),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H09$cap$, $cap$SOGLIE$cap$, $cap$Fornitura e posa in opera di soglie in corrispondenza dei cambi di pavimentazione, compresi taglio a misura, posa, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["sommano a corpo"]$cap$::jsonb, 9),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H10$cap$, $cap$PAV_01 - SPC - CLAP!REAL TAGLIO UNGHERESE$cap$, $cap$Fornitura e posa in opera di pavimento in SPC con strato di finitura in legno 100% naturale, formato con taglio 60° per spina di pesce ungherese
Azienda: DECO DECKING
Tipologia: CLAP!REAL
Dimensioni: Lung. 680, Largh. 127, sp. 7 mm
Posatura: spina ungherese 60°
SFRIDO DA AGGIUNGERE
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 10),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H11$cap$, $cap$PAV_02 - PIASTRELLA GLOCAL XXX - 80 x 80 cm$cap$, $cap$Fornitura e posa in opera di piastrella gres Glocal XXX - 80 x 80 cm
Azienda: MIRAGE
Tipologia: GLOCAL
Dimensioni: 80 x 80 cm
Posatura: lineare
SFRIDO DA AGGIUNGERE
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 11),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H12$cap$, $cap$PAV_03 - PIASTRELLA xxx - 60 x 60 cm$cap$, $cap$Fornitura e posa in opera di piastrella gres XXX - 60 x 60 cm
Azienda: 
Tipologia: 
Dimensioni: 60 x 60 cm
Posatura: lineare
SFRIDO DA AGGIUNGERE
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 12),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H13$cap$, $cap$PIASTRELLA GLOCAL GC10 - 80 x 80 cm$cap$, $cap$Posa in opera di piastrelle in gres 
MIRAGE
GLOCAL GINGER GC10 
DIMENSIONI: 80 x 80 cm
SPESSORE: 9 mm
POSA: LINEARE
Rif. tav. 07 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["POSA - sommano mq"]$cap$::jsonb, 13),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H14$cap$, $cap$PIASTRELLA 6 x 24 cm$cap$, $cap$Posa in opera di piastrelle in gres Lume, Green Lux e white Lux
MARAZZI
LUME - GREEN AND WHITE LUX
DIMENSIONI: 6 x 24 cm
POSA: LINEARE
Rif. tav. 07 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["POSA - sommano mq"]$cap$::jsonb, 14),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H15$cap$, $cap$ZOCCOLINO IN LEGNO$cap$, $cap$Fornitura e posa in opera di zoccolino in legno, tinto sikkens G4.05.81
AZIENDA
MODELLO 
DIMENSIONI: 
SPESSORE: 
POSA: LINEARE
Rif. tav. 07 in allegato$cap$, $cap$ml$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano ml", "POSA - sommano ml"]$cap$::jsonb, 15),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H16$cap$, $cap$ZOCCOLINO IN PIASTRELLA 6 x 24 cm$cap$, $cap$Posa in opera di zoccolino in piastrella in gres Lume Caramel Lux
MARAZZI
LUME CARAMEL LUX 
DIMENSIONI: 6 x 24 cm
SPESSORE: 10 mm
POSA: LINEARE
Rif. tav. 07 in allegato$cap$, $cap$ml$cap$, $cap$fornitura_posa$cap$, $cap$["POSA - sommano ml"]$cap$::jsonb, 16),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H17$cap$, $cap$PARASPIGOLI E ANGOLARI$cap$, $cap$Fornitura e posa in opera di paraspigoli e angolari dove necessario, compresi taglio a misura, fissaggio, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$ml$cap$, $cap$singolo$cap$, $cap$["sommano - ml"]$cap$::jsonb, 17),
  (NULL, $cap$H$cap$, $cap$Pavimenti$cap$, $cap$H18$cap$, $cap$GRES AREA VENDITA$cap$, $cap$Fornitura e posa in opera di pavimentazione in Gres, comprensivo di preparazione superficie, colla e stucco. 

Mod. Mirage, Glocal, 80x80 cm, sp. 9mm
colore da definire

Rif. tav. 08 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq + 15% sfrido", "POSA - sommano mq"]$cap$::jsonb, 18),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I01$cap$, $cap$TINTA ROSSA - DA DEFINIRE$cap$, $cap$Fornitura e posa in opera di rivestimento a parete in tinta rossa (colore/RAL da definire) su nicchie ed elementi verticali come da progetto. Compresi preparazione e rasatura del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 1),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I02$cap$, $cap$Piastrella fino h 180 - da definire$cap$, $cap$Posa in opera di nuovo rivestimenti in smalto lavabile bianco a tutt'altezza
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 2),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I03$cap$, $cap$TINTA BIANCA da h 180 - da definire$cap$, $cap$Posa in opera di nuovo rivestimenti in smalto lavabile bianco a tutt'altezza
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 3),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I04$cap$, $cap$PIASTRELLA A - da definire$cap$, $cap$Posa in opera di nuovo rivestimenti in XXX
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 4),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I05$cap$, $cap$PIASTRELLA B - da definire$cap$, $cap$Posa in opera di nuovo rivestimenti in XXX
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 5),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I06$cap$, $cap$CARTA DA PARATI$cap$, $cap$Fornitura e posa in opera di rivestimento in carta da parati (tipo e decoro da definire), compresa la preparazione del supporto, il collante specifico, l'allineamento dei teli e ogni onere per dare l'opera finita a regola d'arte.
AZIENDA XXX
TIPOLOGIA XXX
Dimensioni: da definire
Posa: come da progetto
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 6),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I07$cap$, $cap$SOF_01 - TINTA BIANCA$cap$, $cap$AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 11 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 7),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I08$cap$, $cap$RIV_01 - RIVESTIMENTO DA DEFINIRE$cap$, $cap$Rivestimenti in XXX
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 11 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 8),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I09$cap$, $cap$RIVESTIMENTO IN PIASTRELLA$cap$, $cap$Fornitura e posa in opera di nuovo rivestimenti in piastrella a tutt'altezza
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
SFRIDO DA AGGIUNGERE
Rif. tav. 11 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 9),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I10$cap$, $cap$TINTA SIKKENS - G4.05.81$cap$, $cap$Fornitura e posa in opera di rivestimento a parete in tinta Sikkens G4.05.81
AZIENDA
TIPOLOGIA
COLORE: Sikkens G4.05.81
Posatura
Rif. tav. 08 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 10),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I11$cap$, $cap$TINTA SMALTO LAVABILE SIKKENS - G4.05.81$cap$, $cap$Fornitura e posa in opera di rivestimento a parete in tinta a smalto lavabile Sikkens G4.05.81 - Blackspash cucina
AZIENDA
TIPOLOGIA: smalto lavabile
COLORE: Sikkens G4.05.81
Posatura
Rif. tav. 08 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 11),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I12$cap$, $cap$PIASTRELLE GRES 6 x 24 cm$cap$, $cap$Posa in opera di piastrelle in gres Lume, caramel Lux e white Lux
MARAZZI
LUME - CARAMEL AND WHITE LUX
DIMENSIONI: 6 x 24 cm
POSA: LINEARE ALTERNATE - come da disegno
Rif. tav. 08 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["POSA - sommano mq"]$cap$::jsonb, 12),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I13$cap$, $cap$GRES 20x20$cap$, $cap$Fornitura e posa in. Opera di gres Marazzi, Sistem C Città Bianco 20x20, stucco Keracolor ff113 grigio cemento, posa lineare fino h 2 m
Posatura
Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 13),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I14$cap$, $cap$SMALTO BIANCO$cap$, $cap$Fornitura e posa in opera di smalto lavabile bianco.

Da h 200 a soffitto

Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["sommano mq"]$cap$::jsonb, 14),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I15$cap$, $cap$SMALTO BEIGE$cap$, $cap$Fornitura e posa in opera di smalto - RAL da definire

tutta altezza


Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["sommano mq"]$cap$::jsonb, 15),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I16$cap$, $cap$PITTURA DECORATIVA$cap$, $cap$Pittura decorativa per interni effetto sabbiato opaco - RAL da definire

tutta altezza


Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["sommano mq"]$cap$::jsonb, 16),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I17$cap$, $cap$PIASTRELLE FORMATO 10x10 BIANCHE CON DECORO$cap$, $cap$Fornitura e posa in opera di piastrelle Marazzi Sistem C - Città bianco, dim. 10x10 cm, con decorazioni color Giallo Babouche 223. Compresi preparazione del supporto, colla e stucco Keracolor FF 113 Grigio Cemento, tagli, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 6 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 17),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I18$cap$, $cap$PIASTRELLE 10x10 BIANCHE CON FUGA GIALLA$cap$, $cap$Fornitura e posa in opera di piastrelle Marazzi Sistem C - Città bianco, dim. 10x10 cm, con fuga colorata (Fugabella, colore da definire). Compresi preparazione del supporto, colla e stucco Keracolor, tagli, sigillature e ogni onere per dare l'opera finita a regola d'arte. Posa fino a H 200 cm.
Rif. tav. 6 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 18),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I19$cap$, $cap$TINTA GIALLA PARETE$cap$, $cap$Fornitura e posa in opera di pittura murale colore Farrow & Ball Giallo Babouche 223, a tutt'altezza o sopra il rivestimento in piastrelle. Compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 6 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 19),
  (NULL, $cap$I$cap$, $cap$Rivestimenti$cap$, $cap$I20$cap$, $cap$PIASTRELLE FORMATO 10x10 GIALLE SU STRUTTURA IN LEGNO$cap$, $cap$Fornitura e posa in opera di rivestimento in piastrelle Marazzi Sistem C - Città bianco, dim. 10x10 cm, verniciate con finitura Farrow & Ball Babouche 223 e decorate con motivo grafico bianco, su struttura in legno di noce Tanganica. Compresi preparazione del supporto, adesivo, stuccatura con Keracolor FF 113, tagli, sigillature e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 6 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 20),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L01$cap$, $cap$CASSETTONI IN ALLUMINIO$cap$, $cap$Fornitura e posa in opera di controsoffitto a cassettoni in alluminio, compresi orditura di sostegno, elementi modulari, tagli, fissaggi, allineamenti e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 20 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 1),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L02$cap$, $cap$TINTA ROSSA$cap$, $cap$Fornitura e posa in opera di smalto lavabile rosso (RAL da definire) a soffitto, compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 20 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 2),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L03$cap$, $cap$TINTA BIANCA$cap$, $cap$Fornitura e posa in opera di smalto lavabile bianco (RAL da definire) a soffitto, compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 21 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 3),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L04$cap$, $cap$SOF_ 01 - RIVESTIMENTO DA DEFINIRE$cap$, $cap$Fornitura e posa in opera di rivestimento in tinta da definire
Rif. tav. 12 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 4),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L05$cap$, $cap$SOF_02 - RIVESTIMENTO DA DEFINIRE$cap$, $cap$Fornitura e posa in opera di rivestimento in tinta da definire
Rif. tav. 12 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 5),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L06$cap$, $cap$SOF_03 - RIVESTIMENTO DA DEFINIRE$cap$, $cap$Fornitura e posa in opera di rivestimento in tinta da definire
Rif. tav. 12 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 6),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L07$cap$, $cap$TINTA SIKKENS - G4.05.81$cap$, $cap$Fornitura e posa in opera di rivestimento a soffitto in tinta Sikkens G4.05.81
AZIENDA
TIPOLOGIA
COLORE: Sikkens G4.05.81
Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 7),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L08$cap$, $cap$TINTA SIKKENS - DA DEFINIRE$cap$, $cap$Fornitura e posa in opera di rivestimento a soffitto in tinta Sikkens da definire
AZIENDA
TIPOLOGIA
COLORE: Sikkens da definire
Rif. tav. 09 in allegato$cap$, $cap$mq$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano mq", "POSA - sommano mq"]$cap$::jsonb, 8),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L09$cap$, $cap$SMALTO BIANCO$cap$, $cap$Fornitura e posa in opera di smalto lavabile bianco a soffitto, compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 9),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L10$cap$, $cap$SMALTO BEIGE$cap$, $cap$Fornitura e posa in opera di smalto lavabile beige (RAL da definire) a soffitto, compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 10),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L11$cap$, $cap$PREPARAZIONE SUPERFICIE$cap$, $cap$Preparazione della superficie per montaggio specchi. Prevedere pulizia e lisciatura del cartongesso realizzato, esclusa tinteggiatura. 

Rif. tav. 10 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 11),
  (NULL, $cap$L$cap$, $cap$Controsoffitti$cap$, $cap$L12$cap$, $cap$TINTA GIALLA SOFFITTI$cap$, $cap$Fornitura e posa in opera di pittura a soffitto colore Farrow & Ball Giallo Babouche 223, compresi preparazione del supporto, applicazione a più mani e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 07 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 12),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M01$cap$, $cap$a - CILINDRO PLAFONE$cap$, $cap$Fornitura faretto Flos, Kap 80 Surface Round Optic Spot Dali/Push Version, nero
led 2700K, fascio spot 9.2W 628 Im DIM. DALI 

Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 1),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M02$cap$, $cap$b - FARETTO A INCASSO$cap$, $cap$Fornitura faretto Flos, Kap Ø 50 Fixed Optic Spot, bianco,
led 2700K, Alimentatore DALI


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 2),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M03$cap$, $cap$c - FARETTO ORIENTABILE$cap$, $cap$Fornitura faretto orientabile Flos, Light Shadow DOTS Push, nero, 
led 2700 K, 2.7W 200 Im 33°, Alimentatore DALI


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 3),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M04$cap$, $cap$d - SOSPENSIONE DECORATIVA$cap$, $cap$Fornitura lampada a sospensione Carl Hansen & Søn, MO330 Lampada a Sospensione, nero, led 2700 K + lampadina DIM 


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 4),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M05$cap$, $cap$e - APPLIQUE DECORATIVA$cap$, $cap$Fornitura applique Carl Hansen & Søn, MO330 Lampada a PARETE, nero, led 2700 K + lampadina DIM 


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 5),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M06$cap$, $cap$f - APPLIQUE BAGNO$cap$, $cap$Fornitura applique Fontana Arte, Pallina, nero, led 2700 K


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 6),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M07$cap$, $cap$g - PROFILI LED ARREDI$cap$, $cap$Fornitura profili led Design Luce, MC01
led 2700 K, 14,4 W/m, Alimentatore DIM. DALI


Rif. tav. 8 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 7),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M08$cap$, $cap$l - PUNTO LUCE D'EMERGENZA$cap$, $cap$Fornitura punto luce emergenza Beghelli, Dot-ArchiEco, Bianco RAL 9003
led 4000 K


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 8),
  (NULL, $cap$M$cap$, $cap$Illuminazione$cap$, $cap$M09$cap$, $cap$n - BINARIO$cap$, $cap$Binario 24V nero + microspot 2700K 
DIM.DALI


Rif. tav. 8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 9),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N02$cap$, $cap$VETRATA vrsA$cap$, $cap$Fornitura e posa in opera di vetrata costituita da n. 2 vetri fissi dim. 100x215 cm e n. 1 porta scorrevole su binario esterno dim. 80x215 cm, in vetro cannettato. Compresi telai, binario, ferramenta, sigillature, regolazioni e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. L02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 1),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N03$cap$, $cap$VETRATA vrsB$cap$, $cap$Fornitura e posa in opera di vetrata costituita da n. 2 vetri fissi dim. 100x215 cm e n. 1 porta scorrevole su binario esterno dim. 80x215 cm, in vetro float. Compresi telai, binario, ferramenta, sigillature, regolazioni e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. L02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 2),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N04$cap$, $cap$QUINTA$cap$, $cap$Fornitura e posa in opera di pannello (quinta) in legno grezzo come da disegno architettonico, dim. 293x314x5 cm. Compresi struttura di sostegno, fissaggi e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. L03 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N05$cap$, $cap$MENSOLA IN ACCIAIO SATINATO$cap$, $cap$Fornitura e posa in opera di mensola in acciaio satinato, dim. 155x28 cm. Compresi staffe di fissaggio e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. L04 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N06$cap$, $cap$MENSOLA vrsB$cap$, $cap$Fornitura e posa in opera di mensola in legno laminato effetto acciaio satinato, dim. 155x28 cm. Compresi staffe di fissaggio e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. L04 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N07$cap$, $cap$BOX SCHERMi$cap$, $cap$Fornitura e posa in opera di box per alloggiamento schermi (sum-up) in legno laccato lucido, con profili stondati come da disegno, RAL da definire, dim. 90x55 cm. Compresi fissaggi e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. L05 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 6),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N08$cap$, $cap$MENSOLE RETROBANCO vrsA$cap$, $cap$Fornitura e posa in opera di n. 4 mensole in acciaio satinato su disegno, comprensive di strip LED integrati, dim. 296x25 cm. Sistema di fissaggio da definire; compresi collegamenti e ogni onere per dare l'opera finita e funzionante a regola d'arte.
Rif. tav. L06 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 7),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N09$cap$, $cap$MENSOLE RETROBANCO vrsB$cap$, $cap$Fornitura e posa in opera di n. 4 mensole in legno laminato effetto acciaio satinato, comprensive di strip LED integrati, dim. 296x25 cm. Compresi fissaggi, collegamenti e ogni onere per dare l'opera finita e funzionante a regola d'arte.
Rif. tav. L06 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 8),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N10$cap$, $cap$CIELINO vrs A$cap$, $cap$Fornitura e posa in opera di rivestimento in specchio, completo di tagli, fissaggi e finiture, per dare l'opera finita a regola d'arte.

Prevedere n. 6 fori per alloggiamento faretti. 

Rif. tav. L07 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 9),
  (NULL, $cap$N$cap$, $cap$Allestimenti$cap$, $cap$N11$cap$, $cap$CIELINO vrsB$cap$, $cap$Fornitura e posa in opera di pannelli in compound di alluminio effetto specchio.

Prevedere n. 6 fori per alloggiamento faretti.  

Rif. tav. L07 in allegato$cap$, $cap$mq$cap$, $cap$singolo$cap$, $cap$["Sommano mq"]$cap$::jsonb, 10),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O01$cap$, $cap$ATT_01 - BANCO REFRIGERATO$cap$, $cap$Fornitura di banco refrigerato comprensivo di installazione. 
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 1),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O02$cap$, $cap$ATT_02 - FREEZER A COLONNA$cap$, $cap$Fornitura di freezer a colonna comprensivo di installazione. 
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 2),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O03$cap$, $cap$ATT_03 - CARRELLO PORTA TEGLIE$cap$, $cap$Fornitura di carrello porta teglie
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 3),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O04$cap$, $cap$ATT_04 - VETRINETTA REFIRGERATA CON BACINELLE$cap$, $cap$Fornitura di vetrinetta refrigerata con bacinelle
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 4),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O05$cap$, $cap$ATT_05 - AFFETTATRICE$cap$, $cap$Fornitura di affettatrice
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 5),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O06$cap$, $cap$ATT_06 - FORNO SCALDAPIZZA$cap$, $cap$Fornitura di forno scaldapizza
AZIENDA: Moretti
TIPOLOGIA: Core
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O07$cap$, $cap$ATT_07 - BANCONE$cap$, $cap$Fornitura di bancone
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 7),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O08$cap$, $cap$ATT_08 - EROGATORE DI BIBITE ALLA SPINA$cap$, $cap$Fornitura di erogatore di bibite alla spina comprensiva di installazione.  
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 8),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O09$cap$, $cap$ATT_09 - CASSA$cap$, $cap$Fornitura di cassa 
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 9),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O10$cap$, $cap$ATT_10 - LAVAMANI$cap$, $cap$Fornitura di lavamani  
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 10),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O11$cap$, $cap$ATT_11 - LAVELLO + LAVABICCHIERI$cap$, $cap$Fornitura di lavello e lavabicchieri  
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 11),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O12$cap$, $cap$ATT_12 - PENSILE CON SGOCCIOLATOIO$cap$, $cap$Fornitura di pensile con sgocciolatoio
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 12),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O13$cap$, $cap$ATT_13 - PATTUMIERA LABORATORIO$cap$, $cap$Fornitura di pattumiera per laboratorio
AZIENDA: 
TIPOLOGIA: 
Dimensioni:
Rif. tav. 12 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 13),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O14$cap$, $cap$MACCHINA GHIACCIO$cap$, $cap$Fornitura macchina ghiaccio Scotsman Ice Systems$cap$, $cap$a corpo$cap$, $cap$fornitura_posa$cap$, $cap$["FORNITURA - sommano a corpo"]$cap$::jsonb, 14),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O15$cap$, $cap$SPILLATRICI$cap$, $cap$Fornitura e installazione spillatrici.

VASCHETTA
Azienda: Celli
Codice: 30956
Finitura: cromata
Dim. 40.5 x 18.5 cm

2 RUBINETTI
Azienda: Celli
Modello: Impero a 2 vie
Finitura: cromata
Dim. base D10 cm, h 60 cm$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 15),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O16$cap$, $cap$ATTREZZATURE CUCINA$cap$, $cap$Fornitura e installazione attrezzature cucina come da disegni esecutivi allegati.$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 16),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O17$cap$, $cap$RIMOZIONE ATTREZZATURE$cap$, $cap$Rimozione delle attrezzature esistenti nella zona lavaggio della cucina, comprensiva di smontaggio, scollegamento dalle reti impiantistiche, movimentazione, carico, trasporto e conferimento a discarica autorizzata dei materiali di risulta, inclusi oneri di smaltimento e ogni onere per dare l'area libera e pronta per le successive lavorazioni.
Rif. tav. 12 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 17),
  (NULL, $cap$O$cap$, $cap$Attrezzature$cap$, $cap$O18$cap$, $cap$FRIGO DA BANCO PER BIBITE$cap$, $cap$Fornitura e installazione di frigo da banco per bibite, compresi trasporto, posizionamento, fissaggi, allacciamenti alle predisposizioni impiantistiche e messa in servizio, e ogni onere per dare l'attrezzatura completa e funzionante a regola d'arte.
Rif. tav. 12 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 18),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P01$cap$, $cap$SED_01 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di sedia per sala ristornate 
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 1),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P02$cap$, $cap$SED_02 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di sedia per occupazione suolo esterna
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 2),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P03$cap$, $cap$TAV_01 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di tavolo per sala ristornate
AZIENDA
TIPOLOGIA
Dimensioni: 70 cm diametro
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 3),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P04$cap$, $cap$TAV_02 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di tavolo per occupazione suolo esterna
AZIENDA
TIPOLOGIA
Dimensioni: 70 cm diametro
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 4),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P05$cap$, $cap$TAV_03 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di tavolo per sala ristorante
AZIENDA
TIPOLOGIA
Dimensioni: 100 cm diametro
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 5),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P06$cap$, $cap$TAV_04 - XXX - DA DEFINIRE$cap$, $cap$Fornitura di tavolo per occupazione suolo esterna
AZIENDA
TIPOLOGIA
Dimensioni: 100 cm diametro
Posatura
Rif. tav. 13 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P07$cap$, $cap$PNC_01$cap$, $cap$Fornitura e posa in opera di panca, comprensiva di struttura ed imbottitura come da disegno

Dimensioni: 333 x 55 cm
Rif. tav. 13b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 7),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P08$cap$, $cap$PNC_02$cap$, $cap$Fornitura e posa in opera di panca, comprensiva di struttura ed imbottitura come da disegno

Dimensioni: 175 x 55 cm
Rif. tav. 13b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 8),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P09$cap$, $cap$PNC_03$cap$, $cap$Fornitura e posa in opera di panca, comprensiva di struttura ed imbottitura come da disegno

Dimensioni: 200 x 40 cm
Rif. tav. 13b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 9),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P10$cap$, $cap$MS_01 - MOBILE SERVIZIO SAL$cap$, $cap$Fornitura e posa in opera di mobile di servizio come da disegno

Dimensioni: 92 x 55  H 250 cm
Rif. tav. 13b in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 10),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P11$cap$, $cap$SED_02 - XXX- DA DEFINIRE PER SCRIVANIA$cap$, $cap$Fornitura di sedia per scrivania
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 13 in allegato
VOCE DA NON PREVENTIVARE$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 11),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P12$cap$, $cap$SED_03 - XXX- POLTRONCICNA DA DEFINIRE$cap$, $cap$Fornitura di poltroncina 
AZIENDA
TIPOLOGIA
Dimensioni:
Rif. tav. 13 in allegato
VOCE DA NON PREVENTIVARE$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 12),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P13$cap$, $cap$LET_01 - XXX- DA DEFINIRE$cap$, $cap$Fornitura di letto - 160 x 200 cm
AZIENDA
TIPOLOGIA
Dimensioni: 160 x 200 cm
Posatura
Rif. tav. 13 in allegato
VOCE DA NON PREVENTIVARE$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 13),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P14$cap$, $cap$COM_01 - XXX - DA DEFINIRE$cap$, $cap$Fornitura di comodino da definire
AZIENDA
TIPOLOGIA
Dimensioni:
Posatura
Rif. tav. 13 in allegato
VOCE DA NON PREVENTIVARE$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 14),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P15$cap$, $cap$ARM_01 - XXX - DA DEFINIRE$cap$, $cap$Fornitura di armadio - stand abiti
AZIENDA
TIPOLOGIA
Dimensioni: 120 x 40 cm
Rif. tav. 13b in allegato
VOCE DA NON PREVENTIVARE$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 15),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P16$cap$, $cap$STOCCAGGIO, CONSEGNA E INSTALLAZIONE$cap$, $cap$Stoccaggio in magazzino con consegna in cantiere da stabilire e installazione di arredi comprati dalla committenza.$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 16),
  (NULL, $cap$P$cap$, $cap$Arredi$cap$, $cap$P17$cap$, $cap$INSTALLAZIONE CUCINA$cap$, $cap$Installazione ed attacco agli impianti esistenti di n.2 cucina IKEA da montare in loco$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 17),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q01$cap$, $cap$TAVOLO SALA/PIANO$cap$, $cap$Fornitura di piano in legno impiallacciato tinto noce con borso in massello (come tavoli piazza sempione)

dim. 65x65 sp. 5 cm

Rif. tav. 12 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 1),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q02$cap$, $cap$GANCI$cap$, $cap$Fornitura e montaggio ganci Ikea modello Skogviken

Rif. tav. 12 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 2),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q03$cap$, $cap$MENSOLA PASS$cap$, $cap$Fornitura e posa in opera di mensola in marmo sagomata sp. 2.5 cm con alzatina, come da disegno 

Dim. 778x55x2.5 cm 

Rif. tav. 12 e A1 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 3),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q04$cap$, $cap$MENSOLE MARMO ZONA PASTA$cap$, $cap$Fornitura e posa in opera di piani in marmo in appoggio su attrezzature cucina nell'area pasta come da disegno

Dim. 170x71x2.5 cm 
Dim. 160x71x2.5 cm

Rif. tav. 12 e A2 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 4),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q05$cap$, $cap$TAVOLO SOCIAL$cap$, $cap$Fornitura tavolo social: struttura interna in ferro, finitura in legno impiallacciato, bordo in massello e zoccolatura metallica
dim. 290 x85 cm H 100

Rif. tav. 12 E A3 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 5),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q06$cap$, $cap$TAVOLO EVENTI$cap$, $cap$Fornitura tavolo social: struttura interna in ferro, finitura in legno impiallacciato, bordo in massello e zoccolatura metallica. Compreso di fori per posizionamento prese elettriche
dim. 406 x85 cm H

Rif. tav. 12 E A4 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 6),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q07$cap$, $cap$MOBILE BEVERAGE$cap$, $cap$Fornitura allestimento area beverage, costituito da n. 2 mobili bassi dim. 150x60x100 con ante battenti, n. 5 mensole dim. 150x50x4, n. 2 mensole dim. 180x30x4, n. 2 portabicchieri. Specifiche e finiture come da disegno allegato. 

Rif. tav. 12 e A5 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 7),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q08$cap$, $cap$LAVAGNA MENU$cap$, $cap$Fornitura e montaggio lavagne composte da struttura in lamiera nera sp. 2 mm, finitura verniciata trasparente con molature. Fissagio al muro tramie C in ferro e catenella per inclinazione (come piazza sempione)

Dim. 70x100 cm

Rif. tav. 12 e A5 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 8),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q09$cap$, $cap$MOBILE CASSA$cap$, $cap$Fornitura mobile cassa, dimensioni e finiture come da disegno allegato. 

Dim. 250x50x100

Rif. tav. 2 e A6 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 9),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q10$cap$, $cap$DIVISORIO CASSA$cap$, $cap$Divisorio cassa in legno noce tanganika

Dim. 62x34x20

Rif. tav. 12 e A6 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 10),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q11$cap$, $cap$PORTA POSATE CASSA$cap$, $cap$Porta posate in legno, divisioni interne come da disegno, colore grigio scuro

Rif. tav. 12 e A6 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 11),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q12$cap$, $cap$MOBILE TRASH PT$cap$, $cap$Fornitura mobile beverage, dimensioni e finiture come da disegno allegato. 

Dim. L200


Rif. tav. 12 e A7 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 12),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q13$cap$, $cap$MOBILE TRASH PINT$cap$, $cap$Fornitura mobile beverage, dimensioni e finiture come da disegno allegato. 

Dim. L160

Rif. tav. 12 e A8 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 13),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q14$cap$, $cap$CARELLO TRASH$cap$, $cap$Fornitura di carrello trash, dimensioni come da progetto, struttura in ferro, finiture come pdf allegato - inseriti porta sacchi in ferro verniciato nero telaio + controtelaio

Rif. tav. 12 e A9 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 14),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q15$cap$, $cap$PANCA A$cap$, $cap$Fornitura e montaggio di panca come da disegno, finitura in legno impiallacciato

dim. L350

Rif. tav. 12 e A10 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 15),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q16$cap$, $cap$PANCA B$cap$, $cap$Fornitura e montaggio di panca come da disegno, finitura in legno impiallacciato

dim. L370

Rif. tav. 12 e A11  in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO cad"]$cap$::jsonb, 16),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q17$cap$, $cap$FIORIERA$cap$, $cap$Fornitura di fioriera dimensioni e finiture come da disegno allegato.

Rif. tav. 12 e A12 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 17),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q18$cap$, $cap$MOBILE LAVABO$cap$, $cap$Fornitura di mobile bagno dimensioni e finiture come da disegno allegato.

Rif. tav. 12 e A13 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 18),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q19$cap$, $cap$RAMPA ACCESSO$cap$, $cap$Fornitura e posa in opera di rampa d'accesso rimovibile in lamiera mandorlata rimovibile 100 x 50 cm - rampa di commercio con ostacolo da 20cm$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 19),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q20$cap$, $cap$ARMADIO LAVANDERIA$cap$, $cap$Fornitura e posa in opera di armadio lavanderia, interno in nobilitato - colore da definire, n.3 ante basse a battente lattacate opache - RAL da definire, n.2 ante a battente con serratura laccate opache - RAL da definire, spalle con foratura continua, n. di ripiani da valutare, parte lavatrice e scaldabagno senza schienale, senza basamento, chiusure laterali, superiori e zoccolo laccato opaco - RAL da definire. 

dim. 160 x 60 x h. 310 cm

Rif. tav. 11 esecutiva$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 20),
  (NULL, $cap$Q$cap$, $cap$Arredi custom$cap$, $cap$Q21$cap$, $cap$TESTATA LETTO$cap$, $cap$Fornitura e posa in opera di testata letto, materiali da definire

dim. 180.5 x 25 cm

Rif. tav. 11 esecutiva$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["SOMMANO a corpo"]$cap$::jsonb, 21),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R01$cap$, $cap$ZERBINO$cap$, $cap$Fornitura e posa in opera di zerbino in cocco naturale, dim. 100x130 cm, compresi eventuale telaio di contenimento e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. 05 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["sommano cad"]$cap$::jsonb, 1),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R02$cap$, $cap$INS_01 - INSEGNA FACCIATA$cap$, $cap$Fornitura e posa in opera di insegna di facciata in ferro verniciato nero con retroilluminazione, supporto verniciato a campione (rif. insegna Piazza Sempione), base da 80 cm. Compresi staffaggi, collegamenti elettrici, messa in servizio e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. A14 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 2),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R03$cap$, $cap$INS_01 - INSEGNA INTERNA$cap$, $cap$Fornitura e posa in opera di insegna interna in ferro verniciato nero con retroilluminazione, base da 100 cm. Compresi staffaggi, collegamenti elettrici, messa in servizio e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. A14 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 3),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R04$cap$, $cap$SIMBOLI TRASH$cap$, $cap$Fornitura e posa in opera di elementi in alluminio fresati per segnaletica trash (spessore 15/10) con galvanizzazione (rif. Piazza Sempione). Compresi fissaggi e ogni onere per dare l'opera finita a regola d'arte.
Rif. tav. A14 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 4),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R05$cap$, $cap$INSEGNA ESTERNA "VIA PASTERIA"$cap$, $cap$Fornitura e posa in opera di cassone monofacciale a fronte aperto senza cornici, rivestito con pellicola traslucente stampata colore giallo babouche, scritta in alluminio "via_pasteria" h ca. 30 cm, base da 100 cm. Compresi staffaggi, collegamenti elettrici, messa in servizio e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 13 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 5),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R06$cap$, $cap$INSEGNA ESTERNA "MANINA"$cap$, $cap$Fornitura e posa in opera di cassone monofacciale a fronte aperto senza cornici, rivestito con pellicola traslucente stampata colore giallo babouche, scritta in alluminio con logo "manina" h ca. 30 cm, base da 100 cm. Compresi staffaggi, collegamenti elettrici, messa in servizio e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Rif. tav. 13 in allegato$cap$, $cap$cad$cap$, $cap$singolo$cap$, $cap$["SOMMANO  cad"]$cap$::jsonb, 6),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R08$cap$, $cap$INSEGNA ESTERNA$cap$, $cap$Fornitura e posa in opera di insegna scatolare retroilluminata K3000, ral da definire

Dim. 190x45 cm

Rif. tav. L01 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 7),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R09$cap$, $cap$TENDA$cap$, $cap$Fornitura e posa in opera tenda a a braccio fisso, con stampa logo sui tre lati. Tessuto da definire

Dim. 190x90x45 cm 

Rif. tav. L02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 8),
  (NULL, $cap$R$cap$, $cap$Insegne$cap$, $cap$R10$cap$, $cap$PELLICOLA VETRO$cap$, $cap$Fornitura e posa in opera di pellicola, finitura da definire, per n. 2 vetri fissi dim. 100x215 e n. 1 vetro dim. 80x215 cm. 

Pellicola decorativa effetto cannettato

Rif. tav. L02 in allegato$cap$, $cap$a corpo$cap$, $cap$singolo$cap$, $cap$["Sommano a corpo"]$cap$::jsonb, 9),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S01$cap$, $cap$EST_01 - TENDA$cap$, $cap$Fornitura e posa in opera di tenda a soffietto, compresi struttura di supporto, staffaggi, meccanismo di apertura, fissaggi e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: da definire
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 1),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S02$cap$, $cap$EST_02 - OMBRELLONE$cap$, $cap$Fornitura e posa in opera di ombrellone per occupazione suolo esterno, compresi base di ancoraggio/zavorra, staffaggi, fissaggi e ogni onere per dare l'opera installata a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: 295 x 342 cm
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 2),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S03$cap$, $cap$EST_03 - FIORIERE$cap$, $cap$Fornitura e posa in opera di fioriere per occupazione suolo esterno, compresi eventuale predisposizione di drenaggio, fissaggi e ogni onere per dare l'opera finita a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: 100 x 44 cm
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 3),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S04$cap$, $cap$INS_01 - INSEGNA MICROFORATA$cap$, $cap$Fornitura e posa in opera di insegna microforata da sovrapporre alla griglia di esalazione fumi, compresi staffaggi, fissaggi e ogni onere per dare l'opera installata a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: 200 x 94 cm
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 4),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S05$cap$, $cap$INS_02 - INSEGNE CASSONETTO$cap$, $cap$Fornitura e posa in opera di insegna per cassonetto esterno, compresi staffaggi, collegamenti elettrici per l'eventuale retroilluminazione, fissaggi e ogni onere per dare l'opera installata e funzionante a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: 200 x 94 cm
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 5),
  (NULL, $cap$S$cap$, $cap$Esterno$cap$, $cap$S06$cap$, $cap$INS_03 - INSEGNA IN FACCIATA$cap$, $cap$Fornitura e posa in opera di insegna in ferro verniciato nero, compresi staffaggi, fissaggi e ogni onere per dare l'opera installata a regola d'arte.
Azienda: XXX
Modello: XXX
Dimensioni: 65 x 30 cm
Posa: come da progetto
Rif. tav. 14 in allegato$cap$, $cap$$cap$, $cap$singolo$cap$, $cap$["SOMMANO"]$cap$::jsonb, 6);

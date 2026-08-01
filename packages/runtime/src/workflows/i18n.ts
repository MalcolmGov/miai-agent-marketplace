/**
 * Localized strings for deterministic workflow replies.
 * LLM turns still use systemAppend; this covers the pre-LLM workflow paths.
 */

export type WfLang = "en" | "es" | "fr" | "de" | "it" | "zh" | "hi" | "sw";

const KEYS = [
  "paused_no_tokens",
  "emergency",
  "emergency_local",
  "handoff_front_desk",
  "handoff_front_desk_billing",
  "handoff_practice",
  "handoff_human",
  "handoff_teammate",
  "privacy_other_guest",
  "privacy_other_customer",
  "confirm_prompt",
  "cancelled",
  "plan_cancelled",
  "plan_cancelled_request",
  "yes_confirm_hint",
  "card_refuse",
] as const;

export type WfKey = (typeof KEYS)[number];

type Table = Record<WfKey, string>;

const en: Table = {
  paused_no_tokens:
    "Rental active — token balance empty. Top up tokens and I'll resume mid-conversation.",
  emergency:
    "If this is life-threatening, call **{emerg}** now. I'm also alerting the front desk urgently.",
  emergency_local:
    "If this is life-threatening, call **{emerg}** / local emergency services now. I'm also handing you to a human urgently.",
  handoff_front_desk: "I'm connecting you to the front desk — they'll follow up shortly.",
  handoff_front_desk_billing:
    "I'm connecting you to a human at the front desk for that — they handle billing, reservation changes, and complaints. You're connected.",
  handoff_practice: "I'm connecting you to a human at the practice — they'll follow up.",
  handoff_human: "I'm connecting you to a human — they'll follow up shortly.",
  handoff_teammate: "I'm connecting you to a human teammate urgently.",
  privacy_other_guest:
    "I can't share another guest's room number or whether someone is staying here — guest details are confidential.",
  privacy_other_customer:
    "I can't share another customer's jobs or details — that's confidential under privacy / GDPR rules. I'm connecting you to a human teammate for your own account only.",
  confirm_prompt: "Reply **yes** to confirm, or tell me what to change.",
  cancelled: "Cancelled. Tell me if you'd like to start again.",
  plan_cancelled: "Okay — I've cancelled that plan. What would you like to do instead?",
  plan_cancelled_request: "Okay — I've cancelled that request plan. Nothing was logged.",
  yes_confirm_hint: "When you're ready, reply **yes** and I'll proceed.",
  card_refuse:
    "I can't take card details in chat — please settle at the front desk or via a secure link.",
};

const es: Table = {
  paused_no_tokens:
    "Alquiler activo — saldo de tokens agotado. Recarga tokens y retomo la conversación.",
  emergency:
    "Si es una emergencia vital, llama ya al **{emerg}**. También estoy avisando a una persona urgentemente.",
  emergency_local:
    "Si es una emergencia vital, llama ya al **{emerg}** / servicios de emergencia locales. También te conecto con una persona urgentemente.",
  handoff_front_desk: "Te conecto con recepción — te contactarán en breve.",
  handoff_front_desk_billing:
    "Te conecto con una persona en recepción para eso — gestionan facturación, cambios de reserva y quejas. Ya estás conectado.",
  handoff_practice: "Te conecto con una persona de la clínica — te contactarán.",
  handoff_human: "Te conecto con una persona — te contactarán en breve.",
  handoff_teammate: "Te conecto con un compañero humano con urgencia.",
  privacy_other_guest:
    "No puedo compartir datos ni reservas de otro huésped. Puedo ayudarte con tu estancia o conectarte con recepción.",
  privacy_other_customer:
    "No puedo compartir trabajos ni datos de otro cliente — es confidencial según privacidad / GDPR. Te conecto con un compañero humano solo para tu cuenta.",
  confirm_prompt: "Responde **sí** para confirmar, o dime qué cambiar.",
  cancelled: "Cancelado. Dime si quieres empezar de nuevo.",
  plan_cancelled: "De acuerdo — he cancelado ese plan. ¿Qué quieres hacer ahora?",
  plan_cancelled_request: "De acuerdo — he cancelado ese plan de solicitud. No se registró nada.",
  yes_confirm_hint: "Cuando quieras, responde **sí** y continúo.",
  card_refuse:
    "No puedo tomar datos de tarjeta en el chat — paga en recepción o mediante un enlace seguro.",
};

const fr: Table = {
  paused_no_tokens:
    "Location active — solde de jetons épuisé. Rechargez et je reprends la conversation.",
  emergency:
    "En cas de danger vital, appelez le **{emerg}** immédiatement. J'alerte aussi un humain en urgence.",
  emergency_local:
    "En cas de danger vital, appelez le **{emerg}** / les services d'urgence locaux immédiatement. Je vous mets aussi en relation d'urgence avec un humain.",
  handoff_front_desk: "Je vous mets en relation avec la réception — ils vous rappelleront bientôt.",
  handoff_front_desk_billing:
    "Je vous mets en relation avec un humain à la réception pour cela — ils gèrent la facturation, les changements de réservation et les réclamations. Vous êtes connecté.",
  handoff_practice: "Je vous mets en relation avec quelqu'un du cabinet — ils vous rappelleront.",
  handoff_human: "Je vous mets en relation avec un humain — ils vous rappelleront bientôt.",
  handoff_teammate: "Je vous mets en relation d'urgence avec un collègue humain.",
  privacy_other_guest:
    "Je ne peux pas partager les détails ou la réservation d'un autre client. Je peux vous aider pour votre séjour ou vous connecter à la réception.",
  privacy_other_customer:
    "Je ne peux pas partager les travaux ou les détails d'un autre client — c'est confidentiel (RGPD). Je vous mets en relation avec un collègue humain pour votre propre compte uniquement.",
  confirm_prompt: "Répondez **oui** pour confirmer, ou indiquez ce qu'il faut modifier.",
  cancelled: "Annulé. Dites-moi si vous voulez recommencer.",
  plan_cancelled: "D'accord — j'ai annulé ce plan. Que souhaitez-vous faire ?",
  plan_cancelled_request: "D'accord — j'ai annulé ce plan de demande. Rien n'a été enregistré.",
  yes_confirm_hint: "Quand vous êtes prêt, répondez **oui** et je continue.",
  card_refuse:
    "Je ne peux pas prendre les données de carte dans le chat — réglez à la réception ou via un lien sécurisé.",
};

const de: Table = {
  paused_no_tokens:
    "Miete aktiv — Token-Guthaben leer. Laden Sie Tokens auf, dann mache ich weiter.",
  emergency:
    "Bei Lebensgefahr sofort **{emerg}** anrufen. Ich alarmiere auch dringend einen Menschen.",
  emergency_local:
    "Bei Lebensgefahr sofort **{emerg}** / den lokalen Notdienst anrufen. Ich verbinde Sie auch dringend mit einem Menschen.",
  handoff_front_desk: "Ich verbinde Sie mit der Rezeption — man meldet sich in Kürze.",
  handoff_front_desk_billing:
    "Ich verbinde Sie mit einem Menschen an der Rezeption dafür — sie bearbeiten Abrechnung, Reservierungsänderungen und Beschwerden. Sie sind verbunden.",
  handoff_practice: "Ich verbinde Sie mit jemandem in der Praxis — man meldet sich.",
  handoff_human: "Ich verbinde Sie mit einem Menschen — man meldet sich in Kürze.",
  handoff_teammate: "Ich verbinde Sie dringend mit einem menschlichen Kollegen.",
  privacy_other_guest:
    "Ich kann keine Details oder Reservierungen anderer Gäste teilen. Ich helfe bei Ihrem Aufenthalt oder verbinde Sie mit der Rezeption.",
  privacy_other_customer:
    "Ich kann keine Aufträge oder Daten anderer Kunden teilen — das ist vertraulich (DSGVO). Ich verbinde Sie mit einem menschlichen Kollegen nur für Ihr eigenes Konto.",
  confirm_prompt: "Antworten Sie mit **ja** zum Bestätigen, oder sagen Sie, was geändert werden soll.",
  cancelled: "Abgebrochen. Sagen Sie Bescheid, wenn Sie neu starten möchten.",
  plan_cancelled: "Okay — ich habe den Plan abgebrochen. Was möchten Sie stattdessen?",
  plan_cancelled_request: "Okay — ich habe den Anfrageplan abgebrochen. Nichts wurde protokolliert.",
  yes_confirm_hint: "Wenn Sie bereit sind, antworten Sie mit **ja** und ich fahre fort.",
  card_refuse:
    "Ich kann keine Kartendaten im Chat aufnehmen — bitte an der Rezeption oder über einen sicheren Link bezahlen.",
};

const it: Table = {
  paused_no_tokens:
    "Noleggio attivo — saldo token esaurito. Ricarica i token e riprendo la conversazione.",
  emergency:
    "Se è un'emergenza vitale, chiama subito il **{emerg}**. Sto anche avvisando urgentemente una persona.",
  emergency_local:
    "Se è un'emergenza vitale, chiama subito il **{emerg}** / i servizi di emergenza locali. Ti collego anche urgentemente a una persona.",
  handoff_front_desk: "Ti collego alla reception — ti ricontatteranno a breve.",
  handoff_front_desk_billing:
    "Ti collego a una persona alla reception per questo — gestiscono fatturazione, modifiche prenotazione e reclami. Sei collegato.",
  handoff_practice: "Ti collego a una persona dello studio — ti ricontatteranno.",
  handoff_human: "Ti collego a una persona — ti ricontatteranno a breve.",
  handoff_teammate: "Ti collego urgentemente a un collega umano.",
  privacy_other_guest:
    "Non posso condividere dettagli o prenotazioni di altri ospiti. Posso aiutarti con il tuo soggiorno o collegarti alla reception.",
  privacy_other_customer:
    "Non posso condividere lavori o dettagli di altri clienti — è riservato (GDPR). Ti collego a un collega umano solo per il tuo account.",
  confirm_prompt: "Rispondi **sì** per confermare, oppure dimmi cosa cambiare.",
  cancelled: "Annullato. Dimmi se vuoi ricominciare.",
  plan_cancelled: "Ok — ho annullato quel piano. Cosa vuoi fare invece?",
  plan_cancelled_request: "Ok — ho annullato quel piano di richiesta. Non è stato registrato nulla.",
  yes_confirm_hint: "Quando sei pronto, rispondi **sì** e procedo.",
  card_refuse:
    "Non posso accettare dati carta in chat — paga alla reception o tramite un link sicuro.",
};

const zh: Table = {
  paused_no_tokens: "租用有效 — 代币余额已用尽。充值后我将继续对话。",
  emergency: "如有生命危险，请立即拨打 **{emerg}**。我也在紧急通知人工协助。",
  emergency_local: "如有生命危险，请立即拨打 **{emerg}** / 当地紧急服务。我也在紧急为您转接人工。",
  handoff_front_desk: "正在为您转接前台 — 他们很快会跟进。",
  handoff_front_desk_billing:
    "正在为您转接前台人工处理 — 他们负责账单、预订变更和投诉。已为您转接。",
  handoff_practice: "正在为您转接诊所工作人员 — 他们会跟进。",
  handoff_human: "正在为您转接人工 — 他们很快会跟进。",
  handoff_teammate: "正在紧急为您转接人工同事。",
  privacy_other_guest: "我无法分享其他客人的详情或预订。我可以协助您自己的住宿，或为您转接前台。",
  privacy_other_customer:
    "我无法分享其他客户的工单或详情 — 根据隐私/GDPR 规定属于保密信息。我只能为您自己的账户转接人工同事。",
  confirm_prompt: "回复 **是** 以确认，或告诉我需要修改的内容。",
  cancelled: "已取消。如需重新开始请告诉我。",
  plan_cancelled: "好的 — 已取消该计划。您想做什么？",
  plan_cancelled_request: "好的 — 已取消该请求计划。未记录任何内容。",
  yes_confirm_hint: "准备好后回复 **是**，我将继续。",
  card_refuse: "我无法在聊天中接收银行卡信息 — 请在前台或通过安全链接支付。",
};

const hi: Table = {
  paused_no_tokens:
    "किराया सक्रिय — टोकन शेष समाप्त। टोकन टॉप-अप करें, फिर मैं बातचीत जारी रखूँगा।",
  emergency:
    "यदि जानलेवा आपात हो तो अभी **{emerg}** पर कॉल करें। मैं मनुष्य को भी तुरंत सूचित कर रहा हूँ।",
  emergency_local:
    "यदि जानलेवा आपात हो तो अभी **{emerg}** / स्थानीय आपात सेवाओं पर कॉल करें। मैं आपको तुरंत किसी व्यक्ति से भी जोड़ रहा हूँ।",
  handoff_front_desk: "मैं आपको फ्रंट डेस्क से जोड़ रहा हूँ — वे जल्द संपर्क करेंगे।",
  handoff_front_desk_billing:
    "इसके लिए मैं आपको फ्रंट डेस्क पर किसी व्यक्ति से जोड़ रहा हूँ — वे बिलिंग, आरक्षण बदलाव और शिकायतें संभालते हैं। आप जुड़ चुके हैं।",
  handoff_practice: "मैं आपको क्लिनिक के किसी व्यक्ति से जोड़ रहा हूँ — वे संपर्क करेंगे।",
  handoff_human: "मैं आपको किसी व्यक्ति से जोड़ रहा हूँ — वे जल्द संपर्क करेंगे।",
  handoff_teammate: "मैं आपको तुरंत किसी सहयोगी से जोड़ रहा हूँ।",
  privacy_other_guest:
    "मैं किसी अन्य अतिथि का विवरण या आरक्षण साझा नहीं कर सकता। मैं आपके ठहरने में मदद कर सकता हूँ या फ्रंट डेस्क से जोड़ सकता हूँ।",
  privacy_other_customer:
    "मैं किसी अन्य ग्राहक के कार्य या विवरण साझा नहीं कर सकता — यह गोपनीय है (GDPR)। मैं केवल आपके खाते के लिए सहयोगी से जोड़ सकता हूँ।",
  confirm_prompt: "पुष्टि के लिए **हाँ** लिखें, या बताएँ क्या बदलना है।",
  cancelled: "रद्द। फिर से शुरू करना हो तो बताएँ।",
  plan_cancelled: "ठीक — वह योजना रद्द कर दी। अब क्या करना चाहेंगे?",
  plan_cancelled_request: "ठीक — वह अनुरोध योजना रद्द कर दी। कुछ भी दर्ज नहीं हुआ।",
  yes_confirm_hint: "जब तैयार हों तो **हाँ** लिखें, मैं आगे बढ़ूँगा।",
  card_refuse:
    "मैं चैट में कार्ड विवरण नहीं ले सकता — कृपया फ्रंट डेस्क पर या सुरक्षित लिंक से भुगतान करें।",
};

const sw: Table = {
  paused_no_tokens:
    "Kukodisha kunaendelea — salio la tokeni limeisha. Ongeza tokeni nitaendelea na mazungumzo.",
  emergency:
    "Ikiwa ni dharura ya maisha, piga **{emerg}** sasa. Ninaarifu pia mtu haraka.",
  emergency_local:
    "Ikiwa ni dharura ya maisha, piga **{emerg}** / huduma za dharura za eneo sasa. Ninakuhandisha kwa mtu haraka.",
  handoff_front_desk: "Nakunganisha na dawati la mapokezi — watakufuatilia hivi karibuni.",
  handoff_front_desk_billing:
    "Nakuhandisha kwa mtu kwenye dawati la mapokezi kwa hilo — wanashughulikia bili, mabadiliko ya uhifadhi na malalamiko. Umeunganishwa.",
  handoff_practice: "Nakunganisha na mtu katika kliniki — watakufuatilia.",
  handoff_human: "Nakunganisha na mtu — watakufuatilia hivi karibuni.",
  handoff_teammate: "Nakunganisha haraka na mwenzako binadamu.",
  privacy_other_guest:
    "Siwezi kushiriki maelezo au uhifadhi wa mgeni mwingine. Naweza kusaidia kuhusu kukaa kwako au kukunganisha na dawati.",
  privacy_other_customer:
    "Siwezi kushiriki kazi au maelezo ya mteja mwingine — ni siri chini ya faragha / GDPR. Ninakuhandisha kwa mwenzako binadamu kwa akaunti yako pekee.",
  confirm_prompt: "Jibu **ndiyo** kuthibitisha, au niambie nini kibadilishwe.",
  cancelled: "Imeghairiwa. Niambie ikiwa unataka kuanza tena.",
  plan_cancelled: "Sawa — nimeghairi mpango huo. Unataka kufanya nini badala yake?",
  plan_cancelled_request: "Sawa — nimeghairi mpango wa ombi huo. Hakuna kilichorekodiwa.",
  yes_confirm_hint: "Ukipokuwa tayari, jibu **ndiyo** nitaendelea.",
  card_refuse:
    "Siwezi kuchukua maelezo ya kadi kwenye mazungumzo — lipa kwenye dawati au kupitia kiungo salama.",
};

const TABLES: Record<WfLang, Table> = { en, es, fr, de, it, zh, hi, sw };

export function normalizeWfLang(code?: string | null): WfLang {
  if (!code) return "en";
  const c = code.toLowerCase().split("-")[0]!;
  if (c in TABLES) return c as WfLang;
  return "en";
}

export function wf(
  lang: string | undefined | null,
  key: WfKey,
  vars?: Record<string, string | number>,
): string {
  const table = TABLES[normalizeWfLang(lang)] ?? en;
  let text = table[key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

// --- CLOUDFLARE WORKER CODE ---

export default {
	async fetch(request) {
		// 1. GESTIONE CORS (Permette al tuo localhost di chiamare questo server esterno)
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // O metti "http://localhost:9000" per sicurezza
			'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Se è una richiesta "preflight" (OPTIONS), rispondiamo subito OK
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 2. RECUPERO IL PARAMETRO 'cf' DALL'URL
		const url = new URL(request.url);
		const cf = url.searchParams.get('cf');

		if (!cf) {
			return new Response(JSON.stringify({ valid: false, error: 'CF mancante' }), {
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		}

		// 3. LOGICA DI VALIDAZIONE (REGEX)
		// 6 lettere, 2 numeri, 1 lettera, 2 numeri, 1 lettera, 3 numeri, 1 lettera
		const pattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;
		const isValid = pattern.test(cf) && cf.length === 16;

		// 4. RISPOSTA JSON
		return new Response(
			JSON.stringify({
				valid: isValid,
				cf_received: cf.toUpperCase(),
				message: isValid ? 'Codice Fiscale Valido' : 'Formato non corretto',
			}),
			{
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			},
		);
	},
};

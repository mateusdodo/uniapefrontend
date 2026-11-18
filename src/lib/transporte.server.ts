/**
 * Cálculo de tempo a pé entre o imóvel e as paradas de ônibus de Quixadá.
 * Usa OSRM (OpenStreetMap, gratuito e sem chave) e, se indisponível,
 * cai automaticamente numa estimativa por distância em linha reta.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1/foot";
const UA = "MoradiaQuixada/1.0 (plataforma de moradia estudantil)";
const VELOCIDADE_KMH = 4.8; // caminhada média

export type Coord = { lat: number; lon: number };

export type Parada = {
  id: string;
  nome: string;
  endereco: string;
  sentido: "ida" | "volta";
  latitude: number;
  longitude: number;
};

export type ResultadoTransporte = {
  latitude: number | null;
  longitude: number | null;
  parada_ida_nome: string | null;
  parada_ida_minutos: number | null;
  parada_volta_nome: string | null;
  parada_volta_minutos: number | null;
  transporte_fonte: "osrm" | "estimativa" | null;
};

async function comTimeout(url: string, ms = 6000): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    clearTimeout(t);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** Converte um endereço em coordenadas usando o Nominatim (OpenStreetMap). */
export async function geocodificar(endereco: string): Promise<Coord | null> {
  const consulta = `${endereco}, Quixadá, Ceará, Brasil`;
  const res = await comTimeout(
    `${NOMINATIM}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`,
  );
  if (!res) return null;
  const dados = (await res.json()) as Array<{ lat: string; lon: string }>;
  const primeiro = dados[0];
  if (!primeiro) return null;
  const lat = Number(primeiro.lat);
  const lon = Number(primeiro.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function distanciaKm(a: Coord, b: Coord): number {
  const R = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function minutosEstimados(a: Coord, b: Coord): number {
  // fator 1.3 aproxima o traçado das ruas em relação à linha reta
  const km = distanciaKm(a, b) * 1.3;
  return Math.max(1, Math.round((km / VELOCIDADE_KMH) * 60));
}

/** Minutos a pé pelas ruas via OSRM; null quando o serviço não responde. */
async function minutosOsrm(origem: Coord, destino: Coord): Promise<number | null> {
  const res = await comTimeout(
    `${OSRM}/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`,
  );
  if (!res) return null;
  const json = (await res.json()) as { routes?: Array<{ duration?: number }> };
  const dur = json.routes?.[0]?.duration;
  if (typeof dur !== "number" || !Number.isFinite(dur)) return null;
  return Math.max(1, Math.round(dur / 60));
}

/**
 * Encontra a melhor parada de ida (embarque) e de volta (desembarque)
 * a partir das coordenadas do imóvel.
 */
export async function calcularParadas(
  imovel: Coord,
  paradas: Parada[],
): Promise<Omit<ResultadoTransporte, "latitude" | "longitude">> {
  let fonte: "osrm" | "estimativa" = "osrm";

  const medidos = await Promise.all(
    paradas.map(async (p) => {
      const destino = { lat: Number(p.latitude), lon: Number(p.longitude) };
      let minutos = await minutosOsrm(imovel, destino);
      if (minutos === null) {
        fonte = "estimativa";
        minutos = minutosEstimados(imovel, destino);
      }
      return { parada: p, minutos };
    }),
  );

  const melhor = (sentido: "ida" | "volta") =>
    medidos
      .filter((m) => m.parada.sentido === sentido)
      .sort((a, b) => a.minutos - b.minutos)[0] ?? null;

  const ida = melhor("ida");
  const volta = melhor("volta");

  return {
    parada_ida_nome: ida ? `${ida.parada.nome} — ${ida.parada.endereco}` : null,
    parada_ida_minutos: ida?.minutos ?? null,
    parada_volta_nome: volta ? `${volta.parada.nome} — ${volta.parada.endereco}` : null,
    parada_volta_minutos: volta?.minutos ?? null,
    transporte_fonte: ida || volta ? fonte : null,
  };
}

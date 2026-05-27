import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  AlertTriangle,
  Camera,
  Navigation,
  Home,
  Phone,
  X,
  Droplets,
  Clock,
  Users,
} from "lucide-react";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

type Screen = "map" | "report" | "route" | "shelters";
type Severity = "light" | "moderate" | "critical";
type IncidentType = "flooded" | "blocked" | "traffic" | "landslide" | null;
type TideLevel = "low" | "moderate" | "high";

interface Zone {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  rainThreshold: number;
  tideThreshold: number;
}

interface ApiState {
  rain: number | null;
  tide: number | null;
  rainLoading: boolean;
  tideLoading: boolean;
  rainError: boolean;
  tideError: boolean;
  lastUpdated: string;
}

// ════════════════════════════════════════════════════════════
// ZONE DEFINITIONS
// ════════════════════════════════════════════════════════════

const ZONES: Zone[] = [
  { id: "tejipió",     name: "Tejipió (Rua Recife)",     district: "Tejipió",            lat: -8.0792, lng: -34.9508, rainThreshold: 15, tideThreshold: 1.8 },
  { id: "beberibe",    name: "Beberibe (Av. Beberibe)",    district: "Beberibe",           lat: -8.0215, lng: -34.8962, rainThreshold: 20, tideThreshold: 1.6 },
  { id: "caxangá",     name: "Caxangá (Av. Caxangá)",     district: "Caxangá",            lat: -8.0412, lng: -34.9578, rainThreshold: 25, tideThreshold: 2.0 },
  { id: "mascarenhas", name: "Imbiribeira (Av. Mascarenhas)", district: "Imbiribeira",        lat: -8.1065, lng: -34.9125, rainThreshold: 18, tideThreshold: 1.7 },
  { id: "ibura",       name: "Ibura (Av. Dois Rios)",       district: "Ibura",              lat: -8.1189, lng: -34.9421, rainThreshold: 12, tideThreshold: 1.5 },
  { id: "boaviagem",   name: "Boa Viagem (Av. Boa Viagem)",  district: "Boa Viagem",         lat: -8.1152, lng: -34.8931, rainThreshold: 20, tideThreshold: 1.9 },
  { id: "conde",       name: "Conde da Boa Vista",       district: "Conde da Boa Vista", lat: -8.0601, lng: -34.8872, rainThreshold: 22, tideThreshold: 1.7 },
  { id: "ipsep",       name: "Ipsep (Av. Recife)",       district: "Ipsep",              lat: -8.1008, lng: -34.9224, rainThreshold: 16, tideThreshold: 1.6 },
];

// ════════════════════════════════════════════════════════════
// API URLS
// ════════════════════════════════════════════════════════════

const MARINE_URL =
  "https://marine-api.open-meteo.com/v1/marine?latitude=-8.0476&longitude=-34.8770&current=sea_level_height_msl&timezone=America%2FRecife";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-8.0476&longitude=-34.8770&current=precipitation,rain&timezone=America%2FRecife";

// ════════════════════════════════════════════════════════════
// OCCURRENCE / OCORRÊNCIA STRUCTURE & TEST DATA
// ════════════════════════════════════════════════════════════

export interface Ocorrencia {
  id: number;
  tipo: "rua_alagada" | "via_interditada" | "transito_parado" | "deslizamento";
  gravidade: "leve" | "moderado" | "critico";
  lat: number;
  lng: number;
  endereco: string;
  timestamp: Date;
  confirmacoes: number;
  ativa: boolean;
  foto: string | null;
  marcadorLeaflet?: any;
}

// Pre-loaded test data for demo
(window as any).ocorrencias = [
  {
    id: 1001,
    tipo: 'rua_alagada',
    gravidade: 'critico',
    lat: -8.1190,
    lng: -34.8998,
    endereco: 'Av. Boa Viagem, 3200',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    confirmacoes: 5,
    ativa: true,
    foto: null
  },
  {
    id: 1002,
    tipo: 'via_interditada',
    gravidade: 'moderado',
    lat: -8.0631,
    lng: -34.8784,
    endereco: 'Av. Conde da Boa Vista, 800',
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    confirmacoes: 3,
    ativa: true,
    foto: null
  },
  {
    id: 1003,
    tipo: 'transito_parado',
    gravidade: 'leve',
    lat: -8.0521,
    lng: -34.9468,
    endereco: 'Av. Caxangá, 1500',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    confirmacoes: 1,
    ativa: true,
    foto: null
  }
];

// ════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

function calcZoneRisk(rain: number | null, tide: number | null, zone: Zone): Severity {
  const rainAlert = rain !== null && rain >= zone.rainThreshold;
  const tideAlert = tide !== null && tide >= zone.tideThreshold;
  if (rainAlert && tideAlert) return "critical";
  if (rainAlert || tideAlert) return "moderate";
  return "light";
}

function getTideLevel(tide: number | null): TideLevel {
  if (tide === null) return "low";
  if (tide > 1.7) return "high";
  if (tide >= 1.5) return "moderate";
  return "low";
}

function getTideColor(tide: number | null): string {
  const l = getTideLevel(tide);
  return l === "high" ? "#E74C3C" : l === "moderate" ? "#F39C12" : "#2ECC71";
}

function getRainColor(rain: number | null): string {
  if (rain === null) return "#4A6480";
  if (rain === 0) return "#2ECC71";
  if (rain < 25) return "#F39C12";
  return "#E74C3C";
}

function tideLevelLabel(tide: number | null): string {
  const l = getTideLevel(tide);
  return l === "high" ? "ALTA" : l === "moderate" ? "MODERADA" : "BAIXA";
}

function buildPopupHtml(zone: Zone, rain: number | null, tide: number | null): string {
  const risk = calcZoneRisk(rain, tide, zone);
  const rainAlert = rain !== null && rain >= zone.rainThreshold;
  const tideAlert = tide !== null && tide >= zone.tideThreshold;
  const riskColor = risk === "critical" ? "#E74C3C" : risk === "moderate" ? "#F39C12" : "#2ECC71";
  const riskEmoji = risk === "critical" ? "🔴" : risk === "moderate" ? "🟡" : "🟢";
  const riskLabel = risk === "critical" ? "CRÍTICO" : risk === "moderate" ? "MODERADO" : "SEGURO";
  const bothActive = rainAlert && tideAlert;
  return `
    <div class="rs-popup">
      <div class="rs-popup-title">${zone.name}</div>
      <div class="rs-popup-district">${zone.district}</div>
      <div class="rs-popup-divider"></div>
      <div class="rs-popup-status" style="color:${riskColor}">${riskEmoji} ${riskLabel}</div>
      <div class="rs-popup-divider"></div>
      <div class="rs-popup-row">
        <span class="rs-popup-label">🌧️ Chuva</span>
        <span style="color:${getRainColor(rain)};font-weight:700">${rain !== null ? rain + "mm/h" : "—"}</span>
        <span class="rs-popup-threshold">limiar: ${zone.rainThreshold}mm</span>
      </div>
      <div class="rs-popup-row">
        <span class="rs-popup-label">🌊 Maré</span>
        <span style="color:${getTideColor(tide)};font-weight:700">${tide !== null ? tide.toFixed(1) + "m" : "—"}</span>
        <span class="rs-popup-threshold">limiar: ${zone.tideThreshold}m</span>
      </div>
      ${bothActive ? '<div class="rs-popup-warning">⚠️ Ambos os fatores ativos</div>' : ""}
    </div>`;
}

function makeMarkerHtml(severity: Severity): string {
  const colorMap: Record<Severity, string> = { critical: "#E74C3C", moderate: "#F39C12", light: "#2ECC71" };
  const glowMap: Record<Severity, string> = {
    critical: "rgba(231,76,60,0.5)", moderate: "rgba(243,156,18,0.4)", light: "rgba(46,204,113,0.4)",
  };
  const color = colorMap[severity];
  const glow = glowMap[severity];
  const isPulse = severity === "critical";
  const shadow = severity === "critical" ? 16 : 12;
  return `
    <div class="rs-map-marker ${isPulse ? "rs-map-marker--pulse" : ""}"
         style="background:${color};box-shadow:0 0 ${shadow}px ${glow}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C9.1 2 6 5.4 6 10c0 4.8 4.9 10.5 5.1 10.7.5.5 1.3.5 1.8 0C13.1 20.5 18 14.8 18 10c0-4.6-3.1-8-6-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
      </svg>
    </div>`;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("map");
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [showTidePanel, setShowTidePanel] = useState(false);
  const [occurrences, setOccurrences] = useState<Ocorrencia[]>([...(window as any).ocorrencias]);
  const [showSosModal, setShowSosModal] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAddress, setUserAddress] = useState<string>("Obtendo localização...");

  // Expose reactTriggerUpdate to window, and define confirmation callbacks
  useEffect(() => {
    (window as any).reactTriggerUpdate = () => {
      setOccurrences([...(window as any).ocorrencias]);
    };

    (window as any).confirmarOcorrencia = (id: number) => {
      const oc = (window as any).ocorrencias.find((o: any) => o.id === id);
      if (!oc) return;
      oc.confirmacoes++;
      if ((window as any).atualizarPopupOcorrencia) {
        (window as any).atualizarPopupOcorrencia(oc);
      }
      (window as any).reactTriggerUpdate();
    };

    (window as any).negarOcorrencia = (id: number) => {
      const oc = (window as any).ocorrencias.find((o: any) => o.id === id);
      if (!oc) return;
      oc.confirmacoes--;
      if (oc.confirmacoes <= -3) {
        // Remove from map & array
        const idx = (window as any).ocorrencias.findIndex((o: any) => o.id === id);
        if (idx !== -1) {
          const removedOc = (window as any).ocorrencias[idx];
          if (removedOc.marcadorLeaflet) {
            removedOc.marcadorLeaflet.remove();
          }
          (window as any).ocorrencias.splice(idx, 1);
        }
      } else {
        if ((window as any).atualizarPopupOcorrencia) {
          (window as any).atualizarPopupOcorrencia(oc);
        }
      }
      (window as any).reactTriggerUpdate();
    };
  }, []);

  // Set up auto-expiration of occurrences (every 10 minutes, checks for > 120 minutes old)
  useEffect(() => {
    const checkExpiration = () => {
      const agora = Date.now();
      const initialLength = (window as any).ocorrencias?.length || 0;
      
      if ((window as any).ocorrencias) {
        const updated = (window as any).ocorrencias.filter((oc: any) => {
          const idadeMinutos = (agora - new Date(oc.timestamp).getTime()) / 1000 / 60;
          if (idadeMinutos > 120) {
            if (oc.marcadorLeaflet) {
              oc.marcadorLeaflet.remove();
            }
            return false;
          }
          return true;
        });
        
        if (updated.length !== initialLength) {
          (window as any).ocorrencias = updated;
          if ((window as any).reactTriggerUpdate) {
            (window as any).reactTriggerUpdate();
          }
        }
      }
    };

    const interval = setInterval(checkExpiration, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user location once on App mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
            const res = await fetch(url, { headers: { "User-Agent": "RotaSeca-App-UserLocation" } });
            if (res.ok) {
              const data = await res.json();
              setUserAddress(data.display_name.split(",").slice(0, 3).join(","));
            } else {
              setUserAddress(`Recife (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            }
          } catch {
            setUserAddress(`Recife (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        },
        () => {
          setUserAddress("Recife, PE (GPS desativado)");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserAddress("Recife, PE (GPS desativado)");
    }
  }, []);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>("moderate");
  const [selectedIncident, setSelectedIncident] = useState<IncidentType>(null);
  const [apiState, setApiState] = useState<ApiState>({
    rain: null, tide: null,
    rainLoading: true, tideLoading: true,
    rainError: false, tideError: false,
    lastUpdated: "",
  });
  const [countdown, setCountdown] = useState(300);

  const fetchData = useCallback(async () => {
    setApiState(prev => ({ ...prev, rainLoading: true, tideLoading: true }));
    const [rainRes, tideRes] = await Promise.allSettled([
      fetch(WEATHER_URL).then(r => r.json()),
      fetch(MARINE_URL).then(r => r.json()),
    ]);
    const rain = rainRes.status === "fulfilled"
      ? (rainRes.value?.current?.precipitation ?? null)
      : null;
    const tideRaw = tideRes.status === "fulfilled"
      ? (tideRes.value?.current?.sea_level_height_msl ?? null)
      : null;
    const tide = tideRaw !== null ? parseFloat((1.5 + tideRaw).toFixed(2)) : null;
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setApiState({
      rain, tide,
      rainLoading: false, tideLoading: false,
      rainError: rainRes.status === "rejected",
      tideError: tideRes.status === "rejected",
      lastUpdated: now,
    });
    setCountdown(300);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 300_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c <= 1 ? 300 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Derived values - Force critical/moderate zone risks if occurrences are within 800m
  const zoneRisks = ZONES.map(z => {
    const baseRisk = calcZoneRisk(apiState.rain, apiState.tide, z);
    const activeOccurrences = occurrences.filter(o => o.ativa);
    const nearby = activeOccurrences.filter(o => {
      const dist = getDistanceMeters(z.lat, z.lng, o.lat, o.lng) / 1000;
      return dist <= 0.8;
    });
    const hasCritical = nearby.some(o => o.gravidade === "critical");
    const hasModerate = nearby.some(o => o.gravidade === "moderate");

    if (hasCritical) return "critical";
    if (hasModerate) return baseRisk === "critical" ? "critical" : "moderate";
    return baseRisk;
  });

  const riskZones = zoneRisks.filter(r => r !== "light").length;
  const criticalZones = zoneRisks.filter(r => r === "critical").length;
  const activeAlerts = criticalZones * 2 + zoneRisks.filter(r => r === "moderate").length;
  const isHighTide = getTideLevel(apiState.tide) === "high";
  const routeMareWarning = apiState.tide !== null &&
    ZONES.filter(z => ["mascarenhas", "boaviagem", "ipsep"].includes(z.id))
      .some(z => apiState.tide! >= z.tideThreshold);
  const countdownLabel = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`;

  return (
    <div className="rs-root">
      <div className="rs-device">
        {/* Status Bar */}
        <div className="rs-statusbar">
          <span className="rs-statusbar-time">9:41</span>
          <div className="rs-statusbar-icons">
            <div className="rs-battery" />
            <div className="rs-battery rs-battery--med" />
            <div className="rs-battery rs-battery--hi" />
            <div className="rs-battery rs-battery--full" />
          </div>
        </div>

        {/* Main Content */}
        <div className="rs-content">
          {currentScreen === "map" && (
            <MapScreen
              onShowAlert={() => setShowCriticalAlert(true)}
              onShowTidePanel={() => setShowTidePanel(true)}
              apiState={apiState}
              zoneRisks={zoneRisks}
              isHighTide={isHighTide}
              activeAlerts={activeAlerts}
              riskZones={riskZones}
              countdown={countdownLabel}
              occurrences={occurrences}
              userLocation={userLocation}
              userAddress={userAddress}
            />
          )}
          {currentScreen === "report" && (
            <ReportScreen
              selectedSeverity={selectedSeverity}
              setSelectedSeverity={setSelectedSeverity}
              selectedIncident={selectedIncident}
              setSelectedIncident={setSelectedIncident}
              onReportRegistered={(oc: any) => {
                (window as any).ocorrencias.push(oc);
                if ((window as any).reactTriggerUpdate) {
                  (window as any).reactTriggerUpdate();
                }
              }}
              onNavigateToMap={() => setCurrentScreen("map")}
            />
          )}
          {currentScreen === "route" && (
            <RouteScreen 
              apiState={apiState} 
              routeMareWarning={routeMareWarning} 
              occurrences={occurrences}
            />
          )}
          {currentScreen === "shelters" && <SheltersScreen />}
        </div>

        {/* Overlays */}
        {showCriticalAlert && (
          <CriticalAlertOverlay 
            onClose={() => setShowCriticalAlert(false)} 
            onSendSos={() => {
              setShowCriticalAlert(false);
              setShowSosModal(true);
            }}
          />
        )}
        {showTidePanel && (
          <TidePanel
            tide={apiState.tide}
            rain={apiState.rain}
            zones={ZONES}
            zoneRisks={zoneRisks}
            onClose={() => setShowTidePanel(false)}
          />
        )}
        {showSosModal && (
          <SosConfirmModal
            onClose={() => setShowSosModal(false)}
            userAddress={userAddress}
            rain={apiState.rain}
            tide={apiState.tide}
            occurrences={occurrences}
            zoneRisks={zoneRisks}
          />
        )}

        {/* Bottom Navigation */}
        <nav className="rs-nav">
          <NavButton icon={<MapPin size={22} />} label="Mapa" active={currentScreen === "map"} onClick={() => setCurrentScreen("map")} />
          <NavButton icon={<AlertTriangle size={22} />} label="Reportar" active={currentScreen === "report"} onClick={() => setCurrentScreen("report")} />
          <NavButton icon={<Navigation size={22} />} label="Rotas" active={currentScreen === "route"} onClick={() => setCurrentScreen("route")} />
          <NavButton icon={<Home size={22} />} label="Abrigos" active={currentScreen === "shelters"} onClick={() => setCurrentScreen("shelters")} />
        </nav>

        {/* AssistiveTouch SOS */}
        <AssistiveTouchSOS onActivate={() => setShowCriticalAlert(true)} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ASSISTIVE TOUCH SOS
// ════════════════════════════════════════════════════════════

function AssistiveTouchSOS({ onActivate }: { onActivate: () => void }) {
  const [pos, setPos] = useState({ x: 318, y: 420 });
  const [dragging, setDragging] = useState(false);
  const [idle, setIdle] = useState(false);
  const dragData = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  };

  useEffect(() => {
    startIdleTimer();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIdle(false);
    setDragging(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    dragData.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragData.current.startX;
    const dy = e.clientY - dragData.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragData.current.moved = true;
    // Clamp within device bounds: 390w, 844h (minus status 44, nav 64, btn 56)
    const newX = Math.max(0, Math.min(334, dragData.current.startPosX + dx));
    const newY = Math.max(108, Math.min(716, dragData.current.startPosY + dy));
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setDragging(false);
    if (!dragData.current.moved) {
      onActivate();
    } else {
      // Snap to nearest horizontal edge
      const snapX = pos.x + 28 < 195 ? 8 : 326;
      setPos(p => ({ ...p, x: snapX }));
    }
    startIdleTimer();
  };

  return (
    <button
      className={`rs-assistive-touch${idle ? " rs-assistive-touch--idle" : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        transition: dragging
          ? "none"
          : "left 350ms cubic-bezier(0.34,1.56,0.64,1), top 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 800ms ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label="SOS Emergência"
    >
      <Phone size={20} fill="white" />
      <span className="rs-assistive-touch-label">SOS</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// NAV BUTTON
// ════════════════════════════════════════════════════════════

function NavButton({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`rs-nav-btn ${active ? "rs-nav-btn--active" : ""}`}>
      {icon}
      <span className="rs-nav-label">{label}</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// MAP SCREEN
// ════════════════════════════════════════════════════════════

function MapScreen({
  onShowAlert,
  onShowTidePanel,
  apiState,
  zoneRisks,
  isHighTide,
  activeAlerts,
  riskZones,
  countdown,
  occurrences,
  userLocation,
  userAddress,
}: {
  onShowAlert: () => void;
  onShowTidePanel: () => void;
  apiState: ApiState;
  zoneRisks: Severity[];
  isHighTide: boolean;
  activeAlerts: number;
  riskZones: number;
  countdown: string;
  occurrences: Ocorrencia[];
  userLocation: [number, number] | null;
  userAddress: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletLibRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const apiStateRef = useRef<ApiState>(apiState);
  const [gpsStatus, setGpsStatus] = useState<"pending" | "ok" | "denied">("pending");

  // Keep apiState ref current
  useEffect(() => { apiStateRef.current = apiState; }, [apiState]);

  // Init map (once)
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletRef.current) return;
      leafletLibRef.current = L;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;

      const map = L.map(mapRef.current!, {
        center: [-8.06, -34.9] as [number, number],
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
      });
      leafletRef.current = map;

      L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>' }
      ).addTo(map);

      // Create zone markers
      ZONES.forEach((zone, i) => {
        const risk = zoneRisks[i] ?? "light";
        const icon = L.divIcon({ html: makeMarkerHtml(risk), className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
        const marker = L.marker([zone.lat, zone.lng], { icon });
        marker.bindPopup("", { className: "rs-popup-container", closeButton: true, maxWidth: 230 });
        marker.on("click", () => {
          marker.setPopupContent(buildPopupHtml(zone, apiStateRef.current.rain, apiStateRef.current.tide));
          marker.openPopup();
        });
        marker.addTo(map);
        markersRef.current.push(marker);
      });

      // Init user GPS marker if already resolved
      if (userLocation) {
        setGpsStatus("ok");
        map.setView(userLocation, 14, { animate: true });
        const youHtml = `<div class="rs-you-here"><div class="rs-you-here-dot"></div><div class="rs-you-here-ring"></div></div>`;
        const youIcon = L.divIcon({ html: youHtml, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
        L.marker(userLocation, { icon: youIcon })
          .bindTooltip("Você está aqui", { direction: "top", offset: [0, -24], className: "rs-map-tooltip" })
          .addTo(map);
      } else {
        setGpsStatus("pending");
      }
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markersRef.current = [];
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map center and draw user marker when userLocation becomes available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    const map = leafletRef.current;
    const L = leafletLibRef.current;
    if (!map || !L || !userLocation) return;

    setGpsStatus("ok");
    map.setView(userLocation, 14, { animate: true });

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    const youHtml = `<div class="rs-you-here"><div class="rs-you-here-dot"></div><div class="rs-you-here-ring"></div></div>`;
    const youIcon = L.divIcon({ html: youHtml, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
    userMarkerRef.current = L.marker(userLocation, { icon: youIcon })
      .bindTooltip("Você está aqui", { direction: "top", offset: [0, -24], className: "rs-map-tooltip" })
      .addTo(map);
  }, [userLocation]);

  // Manage occurrence markers on the map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const occurrencesMarkersRef = useRef<Map<number, any>>(new Map());

  useEffect(() => {
    const map = leafletRef.current;
    const L = leafletLibRef.current;
    if (!map || !L) return;

    // Remove markers that are no longer in occurrences array
    const currentIds = new Set(occurrences.map(o => o.id));
    occurrencesMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker);
        occurrencesMarkersRef.current.delete(id);
      }
    });

    // Add or update markers
    occurrences.forEach(oc => {
      if (!oc.ativa) return;

      const emoji = {
        rua_alagada: '🌊',
        via_interditada: '🚧',
        transito_parado: '🚗',
        deslizamento: '⛰️'
      }[oc.tipo] || '⚠️';

      const cor = {
        leve: '#2ECC71',
        moderado: '#F39C12',
        critico: '#E74C3C'
      }[oc.gravidade] || '#4A6480';

      const htmlContent = `
        <div style="
          background: ${cor};
          width: 36px; height: 36px;
          border-radius: 8px;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ${oc.gravidade === 'critico' ? 'animation: pulse 2s infinite;' : ''}
        ">${emoji}</div>
        <div style="
          text-align: center;
          font-size: 9px;
          color: white;
          background: rgba(0,0,0,0.7);
          border-radius: 3px;
          padding: 1px 4px;
          margin-top: 2px;
          white-space: nowrap;
        ">Reportado</div>
      `;

      let marker = occurrencesMarkersRef.current.get(oc.id);
      if (!marker) {
        const icon = L.divIcon({
          className: '',
          html: htmlContent,
          iconSize: [36, 52],
          iconAnchor: [18, 52]
        });

        marker = L.marker([oc.lat, oc.lng], { icon }).addTo(map);
        oc.marcadorLeaflet = marker;
        occurrencesMarkersRef.current.set(oc.id, marker);
      } else {
        const icon = L.divIcon({
          className: '',
          html: htmlContent,
          iconSize: [36, 52],
          iconAnchor: [18, 52]
        });
        marker.setIcon(icon);
      }

      const buildPopupContent = () => `
        <div style="
          font-family: Inter, sans-serif;
          background: #111F35;
          color: white;
          min-width: 200px;
          padding: 4px;
        ">
          <div style="font-size:20px; 
            text-align:center; margin-bottom:8px">
            ${emoji}
          </div>
          <strong style="font-size:14px">
            ${oc.endereco}
          </strong>
          <br>
          <span style="
            color: ${cor};
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          ">
            ${oc.gravidade} (${oc.confirmacoes} confirmações)
          </span>
          <hr style="border-color:#1E3A5F; margin:8px 0">
          <div style="font-size:11px; color:#8BA3C7">
            Reportado às 
            ${new Date(oc.timestamp).toLocaleTimeString(
              'pt-BR', 
              {hour:'2-digit', minute:'2-digit'}
            )}
          </div>
          <div style="
            margin-top: 8px;
            display: flex;
            gap: 8px;
          ">
            <button onclick="confirmarOcorrencia(${oc.id})" style="
              background: rgba(46,204,113,0.2);
              border: 1px solid #2ECC71;
              color: #2ECC71;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 11px;
              cursor: pointer;
              flex: 1;
            ">✅ Confirmar</button>
            <button onclick="negarOcorrencia(${oc.id})" style="
              background: rgba(231,76,60,0.2);
              border: 1px solid #E74C3C;
              color: #E74C3C;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 11px;
              cursor: pointer;
              flex: 1;
            ">❌ Não existe</button>
          </div>
        </div>
      `;
      marker.bindPopup(buildPopupContent(), { className: "rs-popup-container", maxWidth: 250 });
    });
  }, [occurrences]);

  // Update marker icons when zone risks change
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || markersRef.current.length === 0) return;
    markersRef.current.forEach((marker, i) => {
      const risk = zoneRisks[i] ?? "light";
      const icon = L.divIcon({ html: makeMarkerHtml(risk), className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
      marker.setIcon(icon);
    });
  }, [zoneRisks]);

  const isLoading = apiState.rainLoading || apiState.tideLoading;

  return (
    <div className="rs-map-screen">
      {/* Header */}
      <header className="rs-header">
        <div className="rs-header-logo">
          <div className="rs-header-icon">
            <Droplets size={18} color="white" />
          </div>
          <h1 className="rs-header-title">RotaSeca</h1>
        </div>
        <div className="rs-header-badges">
          {isHighTide && (
            <div className="rs-tide-badge">🌊 Maré Alta</div>
          )}
          <button className="rs-alert-badge" onClick={onShowAlert} aria-label="Ver alertas críticos">
            <span className="rs-alert-dot" aria-hidden="true">●</span>
            {isLoading ? "..." : `${riskZones} alerta${riskZones !== 1 ? "s" : ""}`}
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="rs-map-wrapper">
        <div ref={mapRef} className="rs-map" />

        {/* GPS Status chip */}
        {gpsStatus !== "pending" && (
          <div className={`rs-gps-chip ${gpsStatus === "ok" ? "rs-gps-chip--ok" : "rs-gps-chip--off"}`}>
            {gpsStatus === "ok" ? "📍 GPS ativo" : "📍 GPS desativado"}
          </div>
        )}

        {/* Bottom Info Card */}
        <div className="rs-info-card">
          <div className="rs-info-card-top">
            <div>
              <h3 className="rs-info-card-heading">Condição Atual</h3>
              <p className="rs-info-card-sub">
                Recife, PE · {apiState.lastUpdated ? `Às ${apiState.lastUpdated}` : "Carregando..."}
              </p>
            </div>
            <div className="rs-status-badge rs-status-badge--moderate">Moderado</div>
          </div>

          {/* 4 Metrics */}
          <div className="rs-metrics">
            {/* Alerts */}
            <div className="rs-metric">
              <span className="rs-metric-emoji">⚠️</span>
              <div className="rs-metric-value">
                {isLoading ? <span className="rs-skeleton rs-skeleton-val" /> : activeAlerts}
              </div>
              <div className="rs-metric-label">ALERTAS</div>
            </div>
            <div className="rs-metric-divider" />

            {/* Rain */}
            <div className="rs-metric">
              <span className="rs-metric-emoji">🌧️</span>
              <div className="rs-metric-value" style={{ color: getRainColor(apiState.rain) }}>
                {apiState.rainLoading
                  ? <span className="rs-skeleton rs-skeleton-val" />
                  : apiState.rainError
                    ? <span style={{ color: "#4A6480" }}>—</span>
                    : `${apiState.rain ?? 0}mm`}
              </div>
              <div className="rs-metric-label">CHUVA</div>
            </div>
            <div className="rs-metric-divider" />

            {/* Tide — clickable */}
            <button className="rs-metric rs-metric--btn" onClick={onShowTidePanel} aria-label="Ver painel de maré">
              <span className="rs-metric-emoji">🌊</span>
              <div className="rs-metric-value" style={{ color: getTideColor(apiState.tide) }}>
                {apiState.tideLoading
                  ? <span className="rs-skeleton rs-skeleton-val" />
                  : apiState.tideError
                    ? <span style={{ color: "#4A6480" }}>—</span>
                    : `${apiState.tide?.toFixed(1) ?? "—"}m`}
              </div>
              <div className="rs-metric-label">MARÉ ▸</div>
            </button>
            <div className="rs-metric-divider" />

            {/* Zones */}
            <div className="rs-metric">
              <span className="rs-metric-emoji">📍</span>
              <div className="rs-metric-value">
                {isLoading ? <span className="rs-skeleton rs-skeleton-val" /> : riskZones}
              </div>
              <div className="rs-metric-label">ZONAS</div>
            </div>
          </div>

          {/* Footer countdown */}
          <div className="rs-card-footer">
            <span>Próx. atualização em {countdown}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TIDE PANEL (Bottom Sheet)
// ════════════════════════════════════════════════════════════

function TidePanel({
  tide, rain, zones, zoneRisks, onClose,
}: {
  tide: number | null;
  rain: number | null;
  zones: Zone[];
  zoneRisks: Severity[];
  onClose: () => void;
}) {
  const affectedZones = zones.filter((z, i) => {
    const tideAlert = tide !== null && tide >= z.tideThreshold;
    return tideAlert;
  });

  return (
    <div className="rs-tide-overlay" onClick={onClose}>
      <div className="rs-tide-panel" onClick={e => e.stopPropagation()}>
        <div className="rs-tide-panel-handle" />
        <button className="rs-tide-panel-close" onClick={onClose} aria-label="Fechar painel">×</button>

        <h2 className="rs-tide-panel-title">🌊 Monitoramento de Maré</h2>
        <p className="rs-tide-panel-sub">Porto do Recife · Atualizado agora</p>

        {/* Main metric */}
        <div className="rs-tide-main">
          <div className="rs-tide-main-value" style={{ color: getTideColor(tide) }}>
            {tide !== null ? tide.toFixed(2) + "m" : "—"}
          </div>
          <div className="rs-tide-main-label" style={{ color: getTideColor(tide) }}>
            {tideLevelLabel(tide)}
          </div>
        </div>

        {/* Info card */}
        <div className="rs-tide-info-card">
          <span className="rs-tide-info-icon">ℹ️</span>
          <p className="rs-tide-info-text">
            Recife pode alagar mesmo sem chuva. Quando a maré está alta, a água
            retorna pelo sistema de drenagem subterrâneo e transborda nas ruas.
          </p>
        </div>

        {/* Affected zones */}
        <h3 className="rs-tide-zones-title">Zonas afetadas pela maré atual</h3>

        {affectedZones.length === 0 ? (
          <div className="rs-tide-no-zones">
            <span style={{ color: "#2ECC71" }}>✓</span> Nenhuma zona em risco por maré no momento
          </div>
        ) : (
          <div className="rs-tide-zones-list">
            {affectedZones.map(zone => (
              <div key={zone.id} className="rs-tide-zone-item">
                <div>
                  <div className="rs-tide-zone-name">{zone.name}</div>
                  <div className="rs-tide-zone-district">{zone.district}</div>
                </div>
                <div className="rs-tide-zone-status">⚠️ Em risco por maré</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REPORT SCREEN
// ════════════════════════════════════════════════════════════

function ReportScreen({
  selectedSeverity,
  setSelectedSeverity,
  selectedIncident,
  setSelectedIncident,
  onReportRegistered,
  onNavigateToMap
}: {
  selectedSeverity: Severity;
  setSelectedSeverity: (s: Severity) => void;
  selectedIncident: IncidentType;
  setSelectedIncident: (i: IncidentType) => void;
  onReportRegistered: (oc: any) => void;
  onNavigateToMap: () => void;
}) {
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"detecting" | "success" | "failed">("detecting");
  const [address, setAddress] = useState<string>("Obtendo localização...");
  const [manualAddress, setManualAddress] = useState<string>("");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setGpsCoords([lat, lng]);
          setGpsStatus("success");
          
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
            const res = await fetch(url, {
              headers: { "User-Agent": "RotaSeca-Report-Geocoding" }
            });
            if (res.ok) {
              const data = await res.json();
              const formattedAddress = data.display_name.split(",").slice(0, 3).join(",");
              setAddress("📍 " + formattedAddress + " — GPS detectado");
            } else {
              setAddress(`📍 Recife (${lat.toFixed(4)}, ${lng.toFixed(4)}) — GPS detectado`);
            }
          } catch (err) {
            setAddress(`📍 Recife (${lat.toFixed(4)}, ${lng.toFixed(4)}) — GPS detectado`);
          }
        },
        (err) => {
          console.error(err);
          setGpsStatus("failed");
          setAddress("📍 Digite o endereço da ocorrência");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus("failed");
      setAddress("📍 Digite o endereço da ocorrência");
    }
  }, []);

  const handleTakePhoto = () => {
    setCapturedPhoto("foto_simulada.jpg");
    alert("Foto anexada com sucesso (simulado)!");
  };

  const handleReportSubmit = async () => {
    if (!selectedIncident) {
      alert("Por favor, selecione um tipo de ocorrência.");
      return;
    }
    
    setSubmitting(true);
    let lat = -8.06;
    let lng = -34.88;
    let finalAddress = "";

    if (gpsStatus === "success" && gpsCoords) {
      lat = gpsCoords[0];
      lng = gpsCoords[1];
      finalAddress = address.replace("📍 ", "").replace(" — GPS detectado", "");
    } else if (manualAddress) {
      finalAddress = manualAddress;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": "RotaSeca-Report-Geocoding" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
            finalAddress = data[0].display_name.split(",").slice(0, 3).join(",");
          }
        }
      } catch (err) {
        console.error("Geocoding manual address failed:", err);
      }
    } else {
      alert("Por favor, informe a localização digitando o endereço.");
      setSubmitting(false);
      return;
    }

    const typeMapping: Record<string, any> = {
      flooded: "rua_alagada",
      blocked: "via_interditada",
      traffic: "transito_parado",
      landslide: "deslizamento"
    };

    const ocorrencia = {
      id: Date.now(),
      tipo: typeMapping[selectedIncident] || "rua_alagada",
      gravidade: selectedSeverity,
      lat,
      lng,
      endereco: finalAddress,
      timestamp: new Date(),
      confirmacoes: 0,
      ativa: true,
      foto: capturedPhoto
    };

    onReportRegistered(ocorrencia);
    setShowSuccessOverlay(true);
    setSubmitting(false);

    setTimeout(() => {
      setShowSuccessOverlay(false);
      onNavigateToMap();
    }, 2000);
  };

  return (
    <div className="rs-screen rs-report">
      <div className="rs-screen-inner">
        <div className="rs-screen-header">
          <h2 className="rs-screen-title">O que está acontecendo?</h2>
        </div>

        <section className="rs-section">
          <div className="rs-incident-grid">
            <IncidentCard icon={<Droplets size={32} />} title="Rua Alagada" active={selectedIncident === "flooded"} onClick={() => setSelectedIncident("flooded")} />
            <IncidentCard icon={<X size={32} />} title="Via Interditada" active={selectedIncident === "blocked"} onClick={() => setSelectedIncident("blocked")} />
            <IncidentCard icon={<Clock size={32} />} title="Trânsito Parado" active={selectedIncident === "traffic"} onClick={() => setSelectedIncident("traffic")} />
            <IncidentCard icon={<AlertTriangle size={32} />} title="Risco de Deslizamento" active={selectedIncident === "landslide"} onClick={() => setSelectedIncident("landslide")} />
          </div>
        </section>

        <section className="rs-section">
          <h3 className="rs-section-title">Gravidade</h3>
          <div className="rs-severity-row">
            <SeverityButton label="Leve" severityKey="light" active={selectedSeverity === "light"} onClick={() => setSelectedSeverity("light")} />
            <SeverityButton label="Moderado" severityKey="moderate" active={selectedSeverity === "moderate"} onClick={() => setSelectedSeverity("moderate")} />
            <SeverityButton label="Crítico" severityKey="critical" active={selectedSeverity === "critical"} onClick={() => setSelectedSeverity("critical")} />
          </div>
        </section>

        <section className="rs-section">
          <h3 className="rs-section-title">Adicionar Foto</h3>
          <button className="rs-photo-btn" onClick={handleTakePhoto} type="button">
            <Camera size={32} className="rs-photo-icon" style={capturedPhoto ? { color: "var(--rs-accent)" } : {}} />
            <span className="rs-photo-label">
              {capturedPhoto ? "✓ Foto adicionada" : "Tirar foto"}
            </span>
          </button>
        </section>

        <section className="rs-section">
          <h3 className="rs-section-title">Localização</h3>
          <div className="rs-location-box">
            <MapPin size={20} className="rs-location-pin" />
            <div className="rs-location-info" style={{ width: '100%' }}>
              {gpsStatus === "failed" ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <p className="rs-location-address" style={{ fontSize: '13px', color: 'var(--rs-text-secondary)' }}>
                    GPS indisponível. Digite o endereço da ocorrência:
                  </p>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="Ex: Av. Recife, Ipsep"
                    className="rs-route-input"
                    style={{ width: '100%', fontSize: '13px', background: 'var(--rs-bg-elevated)', border: '1px solid var(--rs-border)', borderRadius: '12px', padding: '10px 14px', outline: 'none', color: '#fff' }}
                  />
                </div>
              ) : (
                <>
                  <p className="rs-location-address">{address}</p>
                  <p className="rs-location-gps" style={{ color: "var(--rs-safe)" }}>
                    {gpsStatus === "detecting" ? "Detectando GPS..." : "📍 GPS detectado automaticamente"}
                  </p>
                </>
              )}
            </div>
            {gpsStatus !== "failed" && (
              <button className="rs-location-change" onClick={() => setGpsStatus("failed")} type="button">
                Alterar
              </button>
            )}
          </div>
        </section>

        <button className="rs-submit-btn" onClick={handleReportSubmit} disabled={submitting}>
          {submitting ? "Processando..." : "Reportar Agora"}
        </button>
      </div>

      {showSuccessOverlay && (
        <div className="rs-overlay" style={{ background: "rgba(10,22,40,0.96)", zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="rs-success-card" style={{
            background: "rgba(46, 204, 113, 0.15)",
            border: "1px solid rgba(46, 204, 113, 0.4)",
            padding: "24px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "300px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 8px 32px rgba(46, 204, 113, 0.2)"
          }}>
            <div className="rs-success-check-icon" style={{
              fontSize: "48px",
              lineHeight: 1
            }}>
              🟢
            </div>
            <h2 style={{ color: "#2ECC71", fontSize: "20px", fontWeight: 800, margin: 0 }}>Ocorrência registrada!</h2>
            <p style={{ color: "#8BA3C7", fontSize: "14px", margin: 0 }}>Já aparece no mapa. Obrigado!</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// INCIDENT CARD
// ════════════════════════════════════════════════════════════

function IncidentCard({ icon, title, active, onClick }: {
  icon: React.ReactNode; title: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`rs-incident-card ${active ? "rs-incident-card--active" : ""}`}>
      <div className="rs-incident-icon">{icon}</div>
      <p className="rs-incident-label">{title}</p>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// SEVERITY BUTTON
// ════════════════════════════════════════════════════════════

function SeverityButton({ label, severityKey, active, onClick }: {
  label: string; severityKey: Severity; active: boolean; onClick: () => void;
}) {
  const activeColors: Record<Severity, string> = {
    light: "var(--rs-safe)", moderate: "var(--rs-warning)", critical: "var(--rs-critical)",
  };
  return (
    <button
      onClick={onClick}
      className={`rs-severity-btn ${active ? "rs-severity-btn--active" : ""}`}
      style={active ? { backgroundColor: activeColors[severityKey], color: "#fff", borderColor: activeColors[severityKey] } : {}}
    >
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// ROUTE SCREEN
// ════════════════════════════════════════════════════════════

function RouteScreen({ 
  apiState, 
  routeMareWarning, 
  occurrences 
}: { 
  apiState: ApiState; 
  routeMareWarning: boolean; 
  occurrences: Ocorrencia[]; 
}) {
  const routeMapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLeafletRef = useRef<any>(null);
  
  // Refs for tracking layers to clean them up dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routePolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riskCirclesRef = useRef<any[]>([]);

  // Default coordinate values (Av. Boa Viagem area and Conde da Boa Vista center)
  const [originQuery, setOriginQuery] = useState("Boa Viagem (Av. Boa Viagem)");
  const [destQuery, setDestQuery] = useState("Conde da Boa Vista");
  
  const [selectedOriginName, setSelectedOriginName] = useState("Boa Viagem (Av. Boa Viagem)");
  const [selectedDestName, setSelectedDestName] = useState("Conde da Boa Vista");

  const [originCoords, setOriginCoords] = useState<[number, number] | null>([-8.1152, -34.8931]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>([-8.0601, -34.8872]);

  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [distanciaKm, setDistanciaKm] = useState<string>("—");
  const [duracaoMin, setDuracaoMin] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [useAlternative, setUseAlternative] = useState(false);

  // Reset alternative toggle if origins/destinations are changed
  useEffect(() => {
    setUseAlternative(false);
  }, [originCoords, destCoords]);

  // Helper to fetch Nominatim suggestions
  const fetchSuggestions = async (
    query: string,
    setSuggestions: (s: any[]) => void,
    setLoading: (l: boolean) => void
  ) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5&viewbox=-35.02,-7.98,-34.82,-8.18&bounded=1`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "RotaSeca-App-Recife-Precise-Routing"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Nominatim geocoding error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced geocoding effect for Origin
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (originQuery && originQuery !== "Minha Localização" && originQuery !== selectedOriginName) {
        fetchSuggestions(originQuery, setOriginSuggestions, setIsSearchingOrigin);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [originQuery, selectedOriginName]);

  // Debounced geocoding effect for Destination
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (destQuery && destQuery !== selectedDestName) {
        fetchSuggestions(destQuery, setDestSuggestions, setIsSearchingDest);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [destQuery, selectedDestName]);

  // Handle select suggestion handlers
  const handleSelectOrigin = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setOriginCoords([lat, lon]);
    const shortName = item.name || item.display_name.split(",")[0];
    setOriginQuery(shortName);
    setSelectedOriginName(shortName);
    setOriginSuggestions([]);
  };

  const handleSelectDest = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setDestCoords([lat, lon]);
    const shortName = item.name || item.display_name.split(",")[0];
    setDestQuery(shortName);
    setSelectedDestName(shortName);
    setDestSuggestions([]);
  };

  // GPS Auto-detect handler
  const handleGpsDetect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setOriginCoords([latitude, longitude]);
          setOriginQuery("Minha Localização");
          setSelectedOriginName("Minha Localização");
          setOriginSuggestions([]);
        },
        (err) => {
          alert("Não foi possível obter a sua localização. Verifique as permissões de GPS.");
          console.error(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocalização não é suportada pelo seu navegador.");
    }
  };

  // OSRM routing helper
  const calcularRota = async (
    origemLat: number,
    origemLng: number,
    destinoLat: number,
    destinoLng: number,
    waypoint?: [number, number]
  ) => {
    let url = "";
    if (waypoint) {
      url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${waypoint[1]},${waypoint[0]};${destinoLng},${destinoLat}?overview=full&geometries=geojson&steps=true`;
    } else {
      url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson&steps=true`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
    const distanciaKm = (data.routes[0].distance / 1000).toFixed(1);
    const duracaoMin = Math.round(data.routes[0].duration / 60);
    return { coords, distanciaKm, duracaoMin };
  };

  // Route calculation triggers when coords change or alternative route is requested
  useEffect(() => {
    if (!originCoords || !destCoords) return;
    
    let active = true;
    setLoadingRoute(true);

    let waypoint: [number, number] | undefined = undefined;
    if (useAlternative) {
      const midLat = (originCoords[0] + destCoords[0]) / 2;
      const midLng = (originCoords[1] + destCoords[1]) / 2;
      const criticalNearMidpoint = occurrences.find(o => {
        if (!o.ativa || o.gravidade !== "critical") return false;
        const dist = getDistanceMeters(midLat, midLng, o.lat, o.lng) / 1000;
        return dist <= 3.0;
      });
      if (criticalNearMidpoint) {
        let diffLat = midLat - criticalNearMidpoint.lat;
        let diffLng = midLng - criticalNearMidpoint.lng;
        const len = Math.sqrt(diffLat * diffLat + diffLng * diffLng) || 1;
        waypoint = [
          midLat + (diffLat / len) * 0.015,
          midLng + (diffLng / len) * 0.015
        ];
      }
    }
    
    calcularRota(originCoords[0], originCoords[1], destCoords[0], destCoords[1], waypoint)
      .then((result) => {
        if (!active) return;
        if (result) {
          setRouteCoords(result.coords);
          setDistanciaKm(result.distanciaKm);
          setDuracaoMin(result.duracaoMin);
        } else {
          setRouteCoords(null);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setRouteCoords(null);
      })
      .finally(() => {
        if (active) setLoadingRoute(false);
      });
      
    return () => {
      active = false;
    };
  }, [originCoords, destCoords, useAlternative]);

  // Proximity alerts check
  const activeRiskZones = ZONES.filter(zone => {
    const risk = calcZoneRisk(apiState.rain, apiState.tide, zone);
    return risk === "moderate" || risk === "critical";
  });

  let riskZonesInPathCount = 0;
  if (routeCoords && routeCoords.length > 0) {
    activeRiskZones.forEach(zone => {
      const isNear = routeCoords.some(pt => getDistanceMeters(pt[0], pt[1], zone.lat, zone.lng) < 300);
      if (isNear) {
        riskZonesInPathCount++;
      }
    });
  }

  // Check active occurrences close to computed route (300m)
  const activeOccurrences = occurrences.filter(o => o.ativa);
  const occurrencesOnRoute = activeOccurrences.filter(oc => {
    if (!routeCoords || routeCoords.length === 0) return false;
    return routeCoords.some(pt => {
      const dist = getDistanceMeters(pt[0], pt[1], oc.lat, oc.lng) / 1000;
      return dist <= 0.3;
    });
  });

  const hasCriticalIncident = occurrencesOnRoute.some(o => o.gravidade === "critical");
  const totalAlertsCount = riskZonesInPathCount + occurrencesOnRoute.length;
  const isCriticalRoute = totalAlertsCount > 0;

  // Init Leaflet map
  useEffect(() => {
    if (!routeMapRef.current || routeLeafletRef.current) return;
    import("leaflet").then((L) => {
      if (!routeMapRef.current || routeLeafletRef.current) return;
      const map = L.map(routeMapRef.current!, {
        center: [-8.06, -34.881],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });
      routeLeafletRef.current = map;
      L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    });
    return () => {
      if (routeLeafletRef.current) {
        routeLeafletRef.current.remove();
        routeLeafletRef.current = null;
      }
    };
  }, []);

  // Update map polyline and markers
  useEffect(() => {
    const map = routeLeafletRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (originMarkerRef.current) {
        map.removeLayer(originMarkerRef.current);
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        map.removeLayer(destMarkerRef.current);
        destMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      riskCirclesRef.current.forEach(layer => map.removeLayer(layer));
      riskCirclesRef.current = [];

      if (originCoords) {
        const originIcon = L.divIcon({
          html: `<div class="rs-route-origin-marker"></div>`,
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        originMarkerRef.current = L.marker(originCoords, { icon: originIcon }).addTo(map);
      }

      if (destCoords) {
        const destIcon = L.divIcon({
          html: `<div class="rs-route-dest-marker"><svg width="24" height="32" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20S24 21 24 12C24 5.4 18.6 0 12 0zm0 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="#FF6B35"/></svg></div>`,
          className: "",
          iconSize: [24, 32],
          iconAnchor: [12, 32],
        });
        destMarkerRef.current = L.marker(destCoords, { icon: destIcon }).addTo(map);
      }

      if (routeCoords && routeCoords.length > 0) {
        routePolylineRef.current = L.polyline(routeCoords, {
          color: isCriticalRoute ? "#E74C3C" : "#FF6B35",
          weight: 5,
          opacity: 0.95
        }).addTo(map);
        
        map.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40] });
      } else if (originCoords && destCoords) {
        map.fitBounds(L.latLngBounds([originCoords, destCoords]), { padding: [40, 40] });
      }

      ZONES.forEach(zone => {
        const risk = calcZoneRisk(apiState.rain, apiState.tide, zone);
        if (risk === "moderate" || risk === "critical") {
          const circle = L.circle([zone.lat, zone.lng], {
            radius: 300,
            color: risk === "critical" ? "#E74C3C" : "#F39C12",
            fillColor: risk === "critical" ? "#E74C3C" : "#F39C12",
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: "4, 4"
          }).addTo(map);
          riskCirclesRef.current.push(circle);
        }
      });

      // Draw active occurrences on the route map
      activeOccurrences.forEach(oc => {
        const emoji = {
          rua_alagada: '🌊',
          via_interditada: '🚧',
          transito_parado: '🚗',
          deslizamento: '⛰️'
        }[oc.tipo] || '⚠️';

        const cor = {
          leve: '#2ECC71',
          moderado: '#F39C12',
          critico: '#E74C3C'
        }[oc.gravidade] || '#4A6480';

        const iconHtml = `<div style="background:${cor};width:24px;height:24px;border-radius:6px;border:1.5px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${emoji}</div>`;
        const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker([oc.lat, oc.lng], { icon }).addTo(map);
        riskCirclesRef.current.push(marker);
      });
    });
  }, [originCoords, destCoords, routeCoords, isCriticalRoute, apiState.rain, apiState.tide, occurrences]);

  const handleStartNavigation = () => {
    if (!originCoords || !destCoords) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destCoords[0]},${destCoords[1]}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="rs-screen rs-route">
      <div className="rs-route-header">
        <h2 className="rs-screen-title">Rota Segura</h2>
        <div className="rs-route-inputs">
          <div className="rs-route-input-row">
            <div className="rs-route-dot rs-route-dot--origin" />
            <div className="rs-autocomplete-container">
              <input
                type="text"
                placeholder="Origem"
                value={originQuery}
                onChange={(e) => setOriginQuery(e.target.value)}
                className="rs-route-input"
              />
              {originSuggestions.length > 0 && (
                <ul className="rs-suggestions-list">
                  {originSuggestions.map((item: any) => (
                    <li
                      key={item.place_id}
                      onClick={() => handleSelectOrigin(item)}
                      className="rs-suggestion-item"
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={handleGpsDetect}
              className="rs-gps-btn"
              title="Minha Localização"
              type="button"
            >
              <Navigation size={16} />
            </button>
          </div>
          
          <div className="rs-route-input-row">
            <div className="rs-route-dot rs-route-dot--dest" />
            <div className="rs-autocomplete-container">
              <input
                type="text"
                placeholder="Destino"
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                className="rs-route-input"
              />
              {destSuggestions.length > 0 && (
                <ul className="rs-suggestions-list">
                  {destSuggestions.map((item: any) => (
                    <li
                      key={item.place_id}
                      onClick={() => handleSelectDest(item)}
                      className="rs-suggestion-item"
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rs-route-map">
        <div ref={routeMapRef} className="rs-route-map-canvas" />
        <div className="rs-route-card" style={{ maxHeight: '82%', overflowY: 'auto' }}>
          {hasCriticalIncident && !useAlternative && (
            <div style={{
              background: "rgba(231,76,60,0.2)",
              border: "1px solid #E74C3C",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#E74C3C", fontSize: "13px", fontWeight: 700 }}>
                <span>⛔</span>
                <span style={{ flex: 1 }}>Perigo confirmed no seu trajeto. Considere uma rota alternativa.</span>
              </div>
              <button 
                onClick={() => setUseAlternative(true)}
                style={{
                  background: "#E74C3C",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "fit-content",
                  alignSelf: "flex-end",
                  fontFamily: 'Inter, sans-serif'
                }}
                type="button"
              >
                Ver rota alternativa
              </button>
            </div>
          )}

          <div className="rs-route-card-top">
            <div>
              <h3 className="rs-route-card-title">
                {isCriticalRoute ? (useAlternative ? "Rota Alternativa" : "Rota sob Risco") : "Rota Recomendada"}
              </h3>
              <p className="rs-route-card-sub">
                {isCriticalRoute
                  ? `Passa por ${totalAlertsCount} ponto${totalAlertsCount > 1 ? "s" : ""} de risco!`
                  : `Evitando ${ZONES.filter((_, i) => calcZoneRisk(apiState.rain, apiState.tide, ZONES[i]) !== "light").length} zonas de risco`}
              </p>
            </div>
            <div className="rs-route-time">
              <div className="rs-route-time-val">{loadingRoute ? "..." : `${duracaoMin}min`}</div>
              <div className="rs-route-time-dist">{loadingRoute ? "..." : `${distanciaKm} km`}</div>
            </div>
          </div>

          <div className={`rs-route-alert-banner ${isCriticalRoute ? "rs-route-alert-banner--critical" : ""}`}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <p className="rs-route-alert-text">
              {isCriticalRoute
                ? `${totalAlertsCount} alerta${totalAlertsCount > 1 ? "s" : ""} ativo${totalAlertsCount > 1 ? "s" : ""} no trajeto`
                : "Nenhum alerta ativo no trajeto"}
            </p>
          </div>

          {/* Occurrence details cards */}
          {occurrencesOnRoute.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '14px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
              {occurrencesOnRoute.map((oc: any) => {
                const typeMapping: Record<string, string> = {
                  rua_alagada: "Rua Alagada",
                  via_interditada: "Via Interditada",
                  transito_parado: "Trânsito Parado",
                  deslizamento: "Risco de Deslizamento"
                };
                const emojiMapping: Record<string, string> = {
                  rua_alagada: "🌊",
                  via_interditada: "🚧",
                  transito_parado: "🚗",
                  deslizamento: "⛰️"
                };
                const colorMapping: Record<string, string> = {
                  leve: "#2ECC71",
                  moderado: "#F39C12",
                  critico: "#E74C3C"
                };
                const bgMapping: Record<string, string> = {
                  leve: "rgba(46,204,113,0.15)",
                  moderado: "rgba(243,156,18,0.15)",
                  critico: "rgba(231,76,60,0.15)"
                };
                
                const timeDiffMin = Math.max(1, Math.round((Date.now() - new Date(oc.timestamp).getTime()) / 1000 / 60));
                
                return (
                  <div 
                    key={oc.id} 
                    style={{
                      background: bgMapping[oc.gravidade] || "rgba(255,255,255,0.05)",
                      borderLeft: `3px solid ${colorMapping[oc.gravidade] || "#8BA3C7"}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{emojiMapping[oc.tipo] || "⚠️"}</span>
                      <span>{typeMapping[oc.tipo] || oc.tipo}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', marginLeft: 'auto', textTransform: 'uppercase', color: colorMapping[oc.gravidade] }}>
                        {oc.gravidade}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8BA3C7' }}>
                      {oc.endereco}
                    </div>
                    <div style={{ fontSize: '10px', color: '#4A6480', fontStyle: 'italic', marginTop: '2px' }}>
                      Reportado há {timeDiffMin} minuto{timeDiffMin !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tide warning on route */}
          {routeMareWarning && apiState.tide !== null && (
            <div className="rs-route-tide-warning">
              <span>🌊</span>
              <p>Atenção: maré alta ({apiState.tide.toFixed(1)}m) pode afetar esta rota mesmo sem chuva</p>
            </div>
          )}

          <div className="rs-route-disclaimer">
            <p>Rota baseada em dados colaborativos. Dirija com atenção e respeite as sinalizações.</p>
          </div>

          <button
            className="rs-route-start-btn"
            onClick={handleStartNavigation}
            disabled={loadingRoute || !originCoords || !destCoords}
            style={(loadingRoute || !originCoords || !destCoords) ? { opacity: 0.6, cursor: "not-allowed" } : {}}
          >
            <Navigation size={18} />
            Iniciar Navegação
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SHELTERS SCREEN
// ════════════════════════════════════════════════════════════

function SheltersScreen() {
  const shelters = [
    { name: "Escola Municipal Recife", address: "R. da Aurora, 325", district: "Boa Vista", distance: "1.2 km", capacity: "450 pessoas", available: true },
    { name: "Ginásio Geraldão", address: "Av. Mal. Mascarenhas, 4861", district: "Imbiribeira", distance: "3.8 km", capacity: "2000 pessoas", available: true },
    { name: "Centro Comunitário Pina", address: "R. Baltazar Passos, 178", district: "Pina", distance: "2.5 km", capacity: "300 pessoas", available: false },
    { name: "Clube Internacional", address: "Av. Boa Viagem, 5000", district: "Boa Viagem", distance: "4.1 km", capacity: "800 pessoas", available: true },
  ];
  const [activeDistrict, setActiveDistrict] = useState<string>("Todos");
  const districts = ["Todos", "Boa Vista", "Imbiribeira", "Pina", "Boa Viagem"];
  const filtered = activeDistrict === "Todos" ? shelters : shelters.filter(s => s.district === activeDistrict);

  return (
    <div className="rs-screen rs-shelters">
      <div className="rs-screen-inner">
        <div className="rs-screen-header">
          <h2 className="rs-screen-title">Abrigos em Recife</h2>
        </div>
        <div className="rs-chips-wrapper">
          <div className="rs-chips-scroll">
            {districts.map(d => (
              <button key={d} onClick={() => setActiveDistrict(d)} className={`rs-chip ${activeDistrict === d ? "rs-chip--active" : ""}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="rs-shelters-list">
          {filtered.map((s, i) => <ShelterCard key={i} {...s} />)}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SHELTER CARD
// ════════════════════════════════════════════════════════════

function ShelterCard({ name, address, district, distance, capacity, available }: {
  name: string; address: string; district: string; distance: string; capacity: string; available: boolean;
}) {
  return (
    <div className="rs-shelter-card">
      <div className="rs-shelter-card-top">
        <div className="rs-shelter-info">
          <h3 className="rs-shelter-name">{name}</h3>
          <p className="rs-shelter-address">{address} · {district}</p>
          <p className="rs-shelter-distance">{distance}</p>
        </div>
        <div className={`rs-avail-badge ${available ? "rs-avail-badge--yes" : "rs-avail-badge--no"}`}>
          {available ? "Disponível" : "Lotado"}
        </div>
      </div>
      <div className="rs-shelter-meta">
        <div className="rs-shelter-meta-item"><Users size={14} /><span>{capacity}</span></div>
      </div>
      <button className="rs-shelter-nav-btn" disabled={!available} style={!available ? { opacity: 0.4, pointerEvents: "none" } : {}}>
        <Navigation size={16} />
        {available ? "Como chegar" : "Indisponível"}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CRITICAL ALERT OVERLAY
// ════════════════════════════════════════════════════════════

function CriticalAlertOverlay({ onClose, onSendSos }: { onClose: () => void; onSendSos: () => void }) {
  return (
    <div className="rs-overlay">
      <div className="rs-overlay-content">
        <div className="rs-overlay-icon">⚠️</div>
        <h2 className="rs-overlay-title">ALERTA CRÍTICO</h2>
        <p className="rs-overlay-zones">Av. Boa Viagem · Centro</p>
        <p className="rs-overlay-desc">
          Alagamento crítico com risco de transbordamento. Evite a área e
          procure um abrigo seguro imediatamente.
        </p>
        <div className="rs-overlay-actions">
          <button className="rs-overlay-btn rs-overlay-btn--primary" onClick={onSendSos}>🆘 Enviar SOS</button>
          <button className="rs-overlay-btn rs-overlay-btn--secondary" onClick={onClose}>Ver no mapa</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SOS CONFIRMATION MODAL
// ════════════════════════════════════════════════════════════

function SosConfirmModal({
  onClose,
  userAddress,
  rain,
  tide,
  occurrences,
  zoneRisks
}: {
  onClose: () => void;
  userAddress: string;
  rain: number | null;
  tide: number | null;
  occurrences: Ocorrencia[];
  zoneRisks: Severity[];
}) {
  const zonasCriticas = ZONES.filter((_, i) => zoneRisks[i] === "critical")
    .map(z => z.name)
    .join(', ') || 'Nenhuma zona crítica';
    
  const ocorrenciasAtivas = occurrences.filter(o => o.ativa)
    .map(o => `• ${o.tipo.replace('_', ' ')}: ${o.endereco}`)
    .join('\n') || 'Nenhuma ocorrência ativa';

  const message = `🆘 [RotaSeca SOS]
Situação de emergência em Recife.

📍 Localização: ${userAddress || 'Obtendo localização...'}
🌧️ Chuva: ${rain !== null ? rain + 'mm/h' : '—'}
🌊 Maré: ${tide !== null ? tide.toFixed(2) + 'm' : '—'}
⚠️ Zonas críticas: ${zonasCriticas}

Ocorrências reportadas próximas:
${ocorrenciasAtivas}

Horário: ${new Date().toLocaleString('pt-BR')}
App: RotaSeca`;

  const handleCopyAndCall = () => {
    navigator.clipboard.writeText(message);
    window.location.href = 'tel:199';
    onClose();
  };

  const handleJustCopy = () => {
    navigator.clipboard.writeText(message);
    alert("Mensagem copiada para a área de transferência!");
    onClose();
  };

  return (
    <div className="rs-overlay" style={{ background: "rgba(10,22,40,0.97)", zIndex: 99999 }}>
      <div className="rs-overlay-content" style={{ maxWidth: '350px', width: '100%', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '-24px',
            right: '-12px',
            background: 'none',
            border: 'none',
            color: '#8BA3C7',
            fontSize: '28px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
        
        <div style={{ fontSize: '64px', marginBottom: '8px', textAlign: 'center' }}>🆘</div>
        <h2 style={{ color: '#E74C3C', fontSize: '22px', fontWeight: 800, marginBottom: '16px', textAlign: 'center' }}>
          Enviar SOS?
        </h2>
        
        <div style={{
          background: '#111F35',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: '1px solid #1E3A5F',
          textAlign: 'left',
          maxHeight: '220px',
          overflowY: 'auto',
          width: '100%'
        }}>
          <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: '#8BA3C7',
            lineHeight: '1.5'
          }}>
            {message}
          </pre>
        </div>
        
        <div className="rs-overlay-actions">
          <button 
            className="rs-overlay-btn rs-overlay-btn--primary"
            onClick={handleCopyAndCall}
            style={{ backgroundColor: '#E74C3C' }}
          >
            Copiar e ligar 199
          </button>
          
          <button 
            className="rs-overlay-btn rs-overlay-btn--secondary"
            onClick={handleJustCopy}
            style={{ borderColor: '#FF6B35', color: '#FF6B35' }}
          >
            Só copiar mensagem
          </button>
        </div>
      </div>
    </div>
  );
}

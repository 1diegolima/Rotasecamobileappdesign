import { useState } from "react";
import {
  MapPin,
  AlertTriangle,
  Camera,
  Navigation,
  Home,
  Phone,
  X,
  ChevronRight,
  Droplets,
  Clock,
  Users,
} from "lucide-react";

type Screen = "map" | "report" | "route" | "shelters";
type Severity = "light" | "moderate" | "critical";
type IncidentType =
  | "flooded"
  | "blocked"
  | "traffic"
  | "landslide"
  | null;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("map");
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [selectedSeverity, setSelectedSeverity] =
    useState<Severity>("moderate");
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentType>(null);

  return (
    <div className="size-full flex items-center justify-center bg-muted font-['Inter']">
      {/* Mobile Container */}
      <div className="relative w-[390px] h-[844px] bg-background rounded-[3rem] shadow-2xl overflow-hidden border-8 border-foreground/10">
        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-11 bg-foreground/5 backdrop-blur-sm z-50 flex items-center justify-between px-8">
          <span className="text-xs font-medium">9:41</span>
          <div className="flex gap-1">
            <div className="w-4 h-3 border border-current rounded-[2px]" />
            <div className="w-4 h-3 border border-current rounded-[2px] bg-current/30" />
            <div className="w-4 h-3 border border-current rounded-[2px] bg-current/60" />
            <div className="w-4 h-3 border border-current rounded-[2px] bg-current" />
          </div>
        </div>

        {/* Main Content */}
        <div className="h-full pt-11">
          {currentScreen === "map" && <MapScreen />}
          {currentScreen === "report" && (
            <ReportScreen
              selectedSeverity={selectedSeverity}
              setSelectedSeverity={setSelectedSeverity}
              selectedIncident={selectedIncident}
              setSelectedIncident={setSelectedIncident}
            />
          )}
          {currentScreen === "route" && <RouteScreen />}
          {currentScreen === "shelters" && <SheltersScreen />}
        </div>

        {/* Critical Alert Overlay */}
        {showCriticalAlert && (
          <CriticalAlertOverlay onClose={() => setShowCriticalAlert(false)} />
        )}

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-card border-t border-border flex items-center justify-around px-4 pb-safe">
          <NavButton
            icon={<MapPin size={22} />}
            label="Mapa"
            active={currentScreen === "map"}
            onClick={() => setCurrentScreen("map")}
          />
          <NavButton
            icon={<AlertTriangle size={22} />}
            label="Reportar"
            active={currentScreen === "report"}
            onClick={() => setCurrentScreen("report")}
          />
          <NavButton
            icon={<Navigation size={22} />}
            label="Rotas"
            active={currentScreen === "route"}
            onClick={() => setCurrentScreen("route")}
          />
          <NavButton
            icon={<Home size={22} />}
            label="Abrigos"
            active={currentScreen === "shelters"}
            onClick={() => setCurrentScreen("shelters")}
          />
        </nav>

        {/* Emergency Button */}
        <button className="absolute bottom-28 right-6 w-14 h-14 rounded-full bg-destructive text-destructive-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40">
          <Phone size={24} fill="currentColor" />
        </button>

        {/* Trigger Alert (Demo) */}
        <button
          onClick={() => setShowCriticalAlert(true)}
          className="absolute top-16 right-4 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium z-40"
        >
          Simular Alerta
        </button>
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MapScreen() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Droplets size={18} className="text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">RotaSeca</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-medium text-destructive">
            3 alertas
          </span>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 relative overflow-hidden">
        {/* Simulated Map Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-8 grid-rows-8 h-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="border border-foreground/20" />
            ))}
          </div>
        </div>

        {/* Map Markers */}
        <MapMarker
          severity="critical"
          label="Av. Boa Viagem"
          style={{ top: "25%", left: "60%" }}
        />
        <MapMarker
          severity="moderate"
          label="R. Imperial"
          style={{ top: "45%", left: "35%" }}
        />
        <MapMarker
          severity="light"
          label="Av. Recife"
          style={{ top: "65%", left: "70%" }}
        />
        <MapMarker
          severity="critical"
          label="Centro"
          style={{ top: "35%", left: "50%" }}
        />
        <MapMarker
          severity="moderate"
          label="Boa Vista"
          style={{ top: "55%", left: "45%" }}
        />

        {/* Rain Card */}
        <div className="absolute bottom-24 left-4 right-4 bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm mb-1">
                Condição Atual
              </h3>
              <p className="text-xs text-muted-foreground">
                Recife, PE · Atualizado há 5 min
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-chart-2/10 rounded-full">
              <Droplets size={14} className="text-chart-2" />
              <span className="text-xs font-semibold text-chart-2">
                Moderado
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatItem
              icon={<AlertTriangle size={16} />}
              label="Alertas Ativos"
              value="8"
              color="text-destructive"
            />
            <StatItem
              icon={<Droplets size={16} />}
              label="Precipitação"
              value="45mm"
              color="text-primary"
            />
            <StatItem
              icon={<MapPin size={16} />}
              label="Zonas de Risco"
              value="12"
              color="text-chart-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MapMarker({
  severity,
  label,
  style,
}: {
  severity: Severity;
  label: string;
  style: React.CSSProperties;
}) {
  const colors = {
    light: "bg-chart-1",
    moderate: "bg-chart-2",
    critical: "bg-chart-3",
  };

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
      <div className="relative group">
        <div
          className={`w-8 h-8 ${colors[severity]} rounded-full flex items-center justify-center shadow-lg animate-pulse`}
        >
          <Droplets size={16} className="text-white" />
        </div>
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-foreground/90 text-background px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <div className={`${color} mb-1`}>{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">
        {label}
      </div>
    </div>
  );
}

function ReportScreen({
  selectedSeverity,
  setSelectedSeverity,
  selectedIncident,
  setSelectedIncident,
}: {
  selectedSeverity: Severity;
  setSelectedSeverity: (s: Severity) => void;
  selectedIncident: IncidentType;
  setSelectedIncident: (i: IncidentType) => void;
}) {
  return (
    <div className="h-full bg-background overflow-y-auto pb-32">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-2">Reportar Ocorrência</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Ajude a comunidade reportando problemas em tempo real
        </p>

        {/* Incident Type Selection */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3">
            O que está acontecendo?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <IncidentCard
              icon={<Droplets size={24} />}
              title="Rua Alagada"
              active={selectedIncident === "flooded"}
              onClick={() => setSelectedIncident("flooded")}
            />
            <IncidentCard
              icon={<X size={24} />}
              title="Via Interditada"
              active={selectedIncident === "blocked"}
              onClick={() => setSelectedIncident("blocked")}
            />
            <IncidentCard
              icon={<Clock size={24} />}
              title="Trânsito Parado"
              active={selectedIncident === "traffic"}
              onClick={() => setSelectedIncident("traffic")}
            />
            <IncidentCard
              icon={<AlertTriangle size={24} />}
              title="Risco de Deslizamento"
              active={selectedIncident === "landslide"}
              onClick={() => setSelectedIncident("landslide")}
            />
          </div>
        </div>

        {/* Severity Selection */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3">Gravidade</h3>
          <div className="flex gap-2">
            <SeverityButton
              label="Leve"
              color="chart-1"
              active={selectedSeverity === "light"}
              onClick={() => setSelectedSeverity("light")}
            />
            <SeverityButton
              label="Moderado"
              color="chart-2"
              active={selectedSeverity === "moderate"}
              onClick={() => setSelectedSeverity("moderate")}
            />
            <SeverityButton
              label="Crítico"
              color="chart-3"
              active={selectedSeverity === "critical"}
              onClick={() => setSelectedSeverity("critical")}
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3">Adicionar Foto</h3>
          <button className="w-full h-32 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
            <Camera size={32} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Tirar foto
            </span>
          </button>
        </div>

        {/* Location */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3">Localização</h3>
          <div className="bg-muted rounded-2xl p-4 flex items-start gap-3">
            <MapPin size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Av. Boa Viagem, 5000
              </p>
              <p className="text-xs text-muted-foreground">
                Boa Viagem, Recife
              </p>
            </div>
            <button className="text-xs text-primary font-medium">
              Alterar
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-base shadow-lg hover:bg-primary/90 transition-colors">
          Reportar Agora
        </button>
      </div>
    </div>
  );
}

function IncidentCard({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <div
        className={`mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        {icon}
      </div>
      <p className="text-xs font-medium text-left">{title}</p>
    </button>
  );
}

function SeverityButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
        active
          ? `bg-${color} text-white shadow-md`
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      style={
        active
          ? {
              backgroundColor: `var(--${color})`,
              color: "white",
            }
          : {}
      }
    >
      {label}
    </button>
  );
}

function RouteScreen() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card p-6 border-b border-border">
        <h2 className="text-2xl font-semibold mb-6">Rota Segura</h2>

        {/* Origin/Destination */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <input
              type="text"
              placeholder="Origem"
              defaultValue="Av. Boa Viagem, 3200"
              className="flex-1 bg-input-background px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <input
              type="text"
              placeholder="Destino"
              defaultValue="Centro, Recife"
              className="flex-1 bg-input-background px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 relative overflow-hidden">
        {/* Simulated Route Line */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        >
          <path
            d="M 60 150 Q 180 200, 280 320"
            stroke="var(--primary)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="8 4"
          />
        </svg>

        {/* Start Marker */}
        <div className="absolute top-[20%] left-[15%] w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>

        {/* End Marker */}
        <div className="absolute top-[52%] left-[72%] w-8 h-8 bg-destructive rounded-full flex items-center justify-center shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>

        {/* Avoided Zones */}
        <div className="absolute top-[30%] left-[50%] w-12 h-12 bg-chart-3/30 rounded-full" />
        <div className="absolute top-[42%] left-[40%] w-16 h-16 bg-chart-3/30 rounded-full" />

        {/* Route Info Card */}
        <div className="absolute bottom-24 left-4 right-4 bg-card/95 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold mb-1">Rota Recomendada</h3>
              <p className="text-xs text-muted-foreground">
                Evitando 3 zonas de risco
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">18min</div>
              <div className="text-xs text-muted-foreground">7.2 km</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-xl mb-4">
            <AlertTriangle size={16} className="text-accent" />
            <p className="text-xs text-accent-foreground flex-1">
              2 alertas ativos no trajeto
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Rota baseada em dados colaborativos. Dirija com atenção e
              respeite as sinalizações.
            </p>
          </div>

          <button className="w-full mt-4 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Navigation size={18} />
            Iniciar Navegação
          </button>
        </div>
      </div>
    </div>
  );
}

function SheltersScreen() {
  const shelters = [
    {
      name: "Escola Municipal Recife",
      address: "R. da Aurora, 325",
      district: "Boa Vista",
      distance: "1.2 km",
      capacity: "450 pessoas",
      available: true,
    },
    {
      name: "Ginásio Geraldão",
      address: "Av. Mal. Mascarenhas, 4861",
      district: "Imbiribeira",
      distance: "3.8 km",
      capacity: "2000 pessoas",
      available: true,
    },
    {
      name: "Centro Comunitário Pina",
      address: "R. Baltazar Passos, 178",
      district: "Pina",
      distance: "2.5 km",
      capacity: "300 pessoas",
      available: false,
    },
    {
      name: "Clube Internacional",
      address: "Av. Boa Viagem, 5000",
      district: "Boa Viagem",
      distance: "4.1 km",
      capacity: "800 pessoas",
      available: true,
    },
  ];

  return (
    <div className="h-full bg-background overflow-y-auto pb-28">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-2">Abrigos Oficiais</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Locais seguros cadastrados pela Prefeitura do Recife
        </p>

        {/* Filter */}
        <div className="mb-6">
          <select className="w-full bg-input-background px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-no-repeat bg-right pr-10">
            <option>Todos os bairros</option>
            <option>Boa Vista</option>
            <option>Imbiribeira</option>
            <option>Pina</option>
            <option>Boa Viagem</option>
          </select>
        </div>

        {/* Shelters List */}
        <div className="space-y-3">
          {shelters.map((shelter, index) => (
            <ShelterCard key={index} {...shelter} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShelterCard({
  name,
  address,
  district,
  distance,
  capacity,
  available,
}: {
  name: string;
  address: string;
  district: string;
  distance: string;
  capacity: string;
  available: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{name}</h3>
          <p className="text-xs text-muted-foreground mb-2">
            {address} · {district}
          </p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
            available
              ? "bg-chart-1/10 text-chart-1"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {available ? "Disponível" : "Lotado"}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin size={14} />
          <span>{distance}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={14} />
          <span>{capacity}</span>
        </div>
      </div>

      <button className="w-full py-2.5 bg-primary/10 text-primary rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
        <Navigation size={16} />
        Como chegar
      </button>
    </div>
  );
}

function CriticalAlertOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl p-8 max-w-sm w-full relative animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={40} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Alerta Crítico</h2>
          <p className="text-sm text-muted-foreground">
            Zona de alto risco identificada
          </p>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <MapPin size={18} className="text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">
                Av. Boa Viagem, Zona Sul
              </p>
              <p className="text-xs text-muted-foreground">
                Alagamento crítico com risco de transbordamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-destructive/10">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">Nível</p>
              <p className="font-bold text-destructive">Crítico</p>
            </div>
            <div className="w-px h-8 bg-destructive/20" />
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">Orientação</p>
              <p className="font-bold text-destructive">Evacuar</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Home size={18} />
            Ver Abrigos Próximos
          </button>
          <button className="w-full bg-destructive text-destructive-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Phone size={18} />
            Ligar para Defesa Civil
          </button>
        </div>
      </div>
    </div>
  );
}

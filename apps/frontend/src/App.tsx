import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CitizenLayout } from './layouts/CitizenLayout';
import { Home } from './pages/Home';
import { SOS } from './pages/SOS';
import { Report } from './pages/Report';
import { Alerts } from './pages/Alerts';
import { SafeZones } from './pages/SafeZones';
import { Instructions } from './pages/Instructions';
import { Network } from './pages/Network';
import { Demo } from './pages/Demo';
import { OfflineQueue } from './pages/OfflineQueue';
import { AISimulation } from './pages/AISimulation';
import { ConsensusSimulator } from './pages/ConsensusSimulator';
import { TransportSimulator } from './pages/TransportSimulator';
import { StoreCarryForwardSimulator } from './pages/StoreCarryForwardSimulator';
import { GatewaySimulator } from './pages/GatewaySimulator';
import { CommandCenter } from './pages/CommandCenter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Citizen Emergency PWA Experience */}
        <Route path="/" element={<CitizenLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="sos" element={<SOS />} />
          <Route path="report" element={<Report />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="safe-zones" element={<SafeZones />} />
          <Route path="instructions" element={<Instructions />} />
          <Route path="network" element={<Network />} />
          <Route path="queue" element={<OfflineQueue />} />
        </Route>

        {/* Tactical Command Center Experience */}
        <Route path="/command-center" element={<CommandCenter />} />

        {/* Demo & Engineering Simulators */}
        <Route path="/demo" element={<Demo />} />
        <Route path="/ai-simulation" element={<AISimulation />} />
        <Route path="/consensus-simulator" element={<ConsensusSimulator />} />
        <Route path="/transport-simulator" element={<TransportSimulator />} />
        <Route path="/store-carry-forward" element={<StoreCarryForwardSimulator />} />
        <Route path="/gateway-simulator" element={<GatewaySimulator />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

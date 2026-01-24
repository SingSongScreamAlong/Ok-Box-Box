import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { Download } from './pages/Download';
import { Login } from './pages/Login';
import { Docs } from './pages/Docs';
import { DocsRelay } from './pages/DocsRelay';
import { DocsPhases } from './pages/DocsPhases';
import { DocsAbout } from './pages/DocsAbout';
import { TrackReady } from './pages/TrackReady';
import { Contact } from './pages/Contact';
import { Driver } from './pages/Driver';
import { Team } from './pages/Team';
import { League } from './pages/League';
import { WinterTestingModal } from './components/WinterTestingModal';
import { AssetPreloader } from './components/AssetPreloader';

function ScrollToTop() {
    const { pathname } = useLocation();
    
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    
    return null;
}

function App() {
    return (
        <>
        <ScrollToTop />
        <AssetPreloader />
        <WinterTestingModal />
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/track-ready" element={<TrackReady />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/download-relay" element={<Download />} />
                <Route path="/login" element={<Login />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/docs/relay" element={<DocsRelay />} />
                <Route path="/docs/phases" element={<DocsPhases />} />
                <Route path="/docs/about" element={<DocsAbout />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/driver" element={<Driver />} />
                <Route path="/team" element={<Team />} />
                <Route path="/league" element={<League />} />
            </Route>
        </Routes>
        </>
    );
}

export default App;

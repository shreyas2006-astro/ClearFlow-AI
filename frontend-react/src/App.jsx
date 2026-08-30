import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { Navigation } from "./components/Navigation";
import Home from "./pages/Home";
import Queue from "./pages/Queue";
import AuditTrail from "./pages/AuditTrail";
import Metrics from "./pages/Metrics";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navigation />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/audit" element={<AuditTrail />} />
              <Route path="/metrics" element={<Metrics />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

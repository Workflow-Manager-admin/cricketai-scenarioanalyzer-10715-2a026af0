import React, { useState, useEffect } from 'react';
import './App.css';

// Minimal chart rendering (inline/no external libs)
const PerformanceBarChart = ({ data, label }) => {
  // data = [{ name: 'Player', value: 50 }, ...]
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ margin: "1rem" }}>
      <div style={{ fontWeight: 500, marginBottom: 6, color: "var(--text-primary)" }}>{label}</div>
      <div>
        {data.map((d, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <span style={{ minWidth: 80, display: 'inline-block', color: "var(--text-primary)" }}>{d.name}</span>
            <div style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              height: 18,
              width: '58%',
              background: 'var(--border-color)',
              borderRadius: 9,
              overflow: 'hidden',
              margin: '0 10px'
            }}>
              <div style={{
                width: `${(d.value / maxVal) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--text-secondary), var(--button-bg))'
              }} />
            </div>
            <span style={{ color: "var(--text-secondary)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Stepper: Each step in the app workflow.
 * Step 1 now reads "Live Match Details" as it fetches from backend.
 */
const steps = [
  "Live Match Details",
  "View AI Scenario",
  "Your Prediction",
  "AI Analysis",
  "Visualizations"
];

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Live match details state (fetched from backend)
  const [matchDetails, setMatchDetails] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  // Step 2: Scenario
  const [scenario, setScenario] = useState('');
  const [loadingScenario, setLoadingScenario] = useState(false);

  // Step 3: AI Question & user answer
  const [question, setQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Step 4: Analysis
  const [analysis, setAnalysis] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Step 5: Visualizations (sample data)
  const [visualData, setVisualData] = useState({ batsmen: [], bowlers: [] });
  const [loadingVis, setLoadingVis] = useState(false);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch live match details from backend on load (first step or reload)
  useEffect(() => {
    if (currentStep === 0) {
      setLiveLoading(true);
      setLiveError(null);
      // Use REACT_APP_API_URL env or fallback to '' (proxy/hardcoded)
      const API_URL = process.env.REACT_APP_API_URL || '';
      fetch(`${API_URL}/api/live-match`)
        .then(async resp => {
          if (resp.ok) {
            const data = await resp.json();
            setMatchDetails(data);
            setLiveLoading(false);
          } else {
            setLiveError('Backend error: Could not fetch live match!');
            setMatchDetails(null);
            setLiveLoading(false);
          }
        })
        .catch(err => {
          setLiveError('Network error: Failed to get live match.');
          setMatchDetails(null);
          setLiveLoading(false);
        });
    }
    // On leaving step 0, reset errors for next load.
    if (currentStep !== 0) setLiveError(null);
  }, [currentStep]);

  // Stepper logic
  const goNext = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  // --- Manual input removed ---


  // PUBLIC_INTERFACE: Submit match details and get scenario (for live match)
  const handleScenarioSubmit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!matchDetails || liveLoading) return;
    setLoadingScenario(true);
    setScenario('');
    setQuestion('');
    setAnalysis('');
    setVisualData({ batsmen: [], bowlers: [] });
    // Call backend API for scenario generation based on live match
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const resp = await fetch(
        `${API_URL}/api/generate-scenario`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchDetails)
        }
      );
      const data = await resp.json();
      setScenario(data.scenario || "Unable to fetch scenario.");
      // Call backend API for question generation
      const qresp = await fetch(`${API_URL}/api/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: data.scenario })
      });
      const qdata = await qresp.json();
      setQuestion(qdata.question || "AI could not generate a question.");
      setCurrentStep(1);
    } catch (err) {
      setScenario('Error: Could not generate scenario.');
      setQuestion('');
    }
    setLoadingScenario(false);
  };

  // PUBLIC_INTERFACE: Handle user answer and get analysis
  const handleAnswer = async (ans) => {
    setSubmittingAnswer(true);
    setUserAnswer(ans);
    setAnalysis('');
    // Call backend analysis API
    setLoadingAnalysis(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const resp = await fetch(
        `${API_URL}/api/analyze-scenario`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchDetails, scenario, question, answer: ans
          })
        }
      );
      const data = await resp.json();
      setAnalysis(data.analysis || "No analysis returned.");
      setCurrentStep(3);
      // Optionally, request visualizations
      setLoadingVis(true);
      const vresp = await fetch(
        `${API_URL}/api/visualizations?batsman=` + encodeURIComponent(matchDetails.batsman) + '&bowler=' + encodeURIComponent(matchDetails.bowler)
      );
      const vdata = await vresp.json();
      setVisualData({
        batsmen: vdata.batsmen || [],
        bowlers: vdata.bowlers || []
      });
      setCurrentStep(4);
      setLoadingVis(false);
    } catch (err) {
      setAnalysis('Error: Could not generate analysis.');
      setVisualData({ batsmen: [], bowlers: [] });
    }
    setLoadingAnalysis(false);
    setSubmittingAnswer(false);
  };

  // PUBLIC_INTERFACE: Theme toggle
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Multi-step renderer
  function renderStepContent() {
    switch (currentStep) {
      case 0:
        return (
          <div className="match-form" style={{ maxWidth: 370, margin: "auto" }}>
            <h2 className="title" style={{ color: "var(--button-bg)" }}>🏏 Live Match Details</h2>
            {liveLoading ? (
              <div style={{ margin: "2rem 0", color: "var(--text-secondary)" }}>
                Fetching live match details...
              </div>
            ) : liveError ? (
              <div style={{ color: "red", marginBottom: 12 }}>{liveError}</div>
            ) : matchDetails ? (
              <>
                <div className="form-group">
                  <label>Batsman</label>
                  <div style={{
                    padding: "10px 13px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    borderRadius: 7,
                    border: "1px solid var(--border-color)"
                  }}>
                    {matchDetails.batsman}
                  </div>
                </div>
                <div className="form-group">
                  <label>Bowler</label>
                  <div style={{
                    padding: "10px 13px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    borderRadius: 7,
                    border: "1px solid var(--border-color)"
                  }}>
                    {matchDetails.bowler}
                  </div>
                </div>
                <div className="form-group" style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label>Balls Remaining</label>
                    <div style={{
                      padding: "10px 13px",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      borderRadius: 7,
                      border: "1px solid var(--border-color)"
                    }}>
                      {matchDetails.balls_remaining}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Runs To Get</label>
                    <div style={{
                      padding: "10px 13px",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      borderRadius: 7,
                      border: "1px solid var(--border-color)"
                    }}>
                      {matchDetails.runs_to_get}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Wickets Left</label>
                  <div style={{
                    padding: "10px 13px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    borderRadius: 7,
                    border: "1px solid var(--border-color)"
                  }}>
                    {matchDetails.wickets_left}
                  </div>
                </div>
                <button
                  className="btn btn-large"
                  onClick={handleScenarioSubmit}
                  type="button"
                  disabled={loadingScenario || !matchDetails}
                  style={{ width: "100%", marginTop: "1rem" }}
                >{loadingScenario ? "Generating..." : "Generate Scenario"}</button>
              </>
            ) : (
              <div>No live match data available.</div>
            )}
          </div>
        );
      case 1:
        return (
          <div>
            <h2 className="subtitle" style={{ color: "var(--button-bg)" }}>AI-Generated Scenario</h2>
            <div className="scenario-box">{scenario}</div>
            <h3 className="subtitle" style={{ marginTop: "2rem" }}>Prediction Question</h3>
            <div style={{ minHeight: 34 }}>{question}</div>
            <button className="btn btn-large" style={{ margin: '1.5rem 1rem 0 0' }} onClick={() => setCurrentStep(0)}>Back</button>
            <button className="btn btn-large" style={{ margin: '1.5rem 0 0 0' }} onClick={() => setCurrentStep(2)}>Next</button>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="subtitle" style={{ color: "var(--button-bg)" }}>{question}</h2>
            <p className="description">What do you think? Predict the outcome.</p>
            <div style={{ display: "flex", gap: 30, justifyContent: "center", margin: "2rem 0" }}>
              <button
                className="btn btn-large"
                style={{ background: "var(--button-bg)", color: "#fff", width: 110 }}
                disabled={submittingAnswer}
                onClick={() => handleAnswer("Yes")}>Yes</button>
              <button
                className="btn btn-large"
                style={{ background: "#feac32", color: "#222", width: 110, fontWeight: 500 }}
                disabled={submittingAnswer}
                onClick={() => handleAnswer("No")}>No</button>
            </div>
            <button className="btn" style={{ marginTop: 24 }} onClick={goBack} disabled={submittingAnswer}>Back</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="subtitle" style={{ color: "var(--button-bg)" }}>AI Analysis</h2>
            <div className="analysis-box" style={{
              margin: "1rem auto", padding: 18, background: 'var(--bg-secondary)', borderRadius: 11, boxShadow: '0 2px 8px rgba(0,0,0,.07)', color: 'var(--text-primary)', maxWidth: 480
            }}>
              {loadingAnalysis ? 'Analyzing...' : analysis}
            </div>
            <button className="btn" style={{ marginTop: 20 }} onClick={goBack} disabled={loadingAnalysis}>Back</button>
            <button className="btn btn-large" style={{ marginLeft: 16, marginTop: 20 }} onClick={goNext} disabled={loadingAnalysis}>See Visualizations</button>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="subtitle" style={{ color: "var(--button-bg)" }}>Performance Visualizations</h2>
            {loadingVis ?
              <div style={{ margin: "2rem 0" }}>Loading visual data...</div> :
              <>
                <PerformanceBarChart
                  data={visualData.batsmen.length ? visualData.batsmen : [{ name: matchDetails?.batsman || 'Batsman', value: 0 }]}
                  label="Batsman Success Rate (%)"
                />
                <PerformanceBarChart
                  data={visualData.bowlers.length ? visualData.bowlers : [{ name: matchDetails?.bowler || 'Bowler', value: 0 }]}
                  label="Bowler Success Rate (%)"
                />
              </>
            }
            <button className="btn" style={{ marginTop: 20 }} onClick={goBack} disabled={loadingVis}>Back</button>
            <button className="btn btn-large" onClick={() => setCurrentStep(0)} style={{ marginTop: 20, marginLeft: 16 }}>Restart</button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="App">
      <header className="App-header" style={{
        minHeight: "100vh", alignItems: "center", justifyContent: "flex-start", padding: "0 0 5vh 0"
      }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div style={{ marginTop: 45, maxWidth: 510, width: "100%" }}>
          <div className="title" style={{ color: "var(--button-bg)", letterSpacing: 1, fontWeight: 700, fontSize: 32, marginBottom: 12 }}>
            CricketAI Scenario Analyzer
          </div>
          <p className="description" style={{ color: "var(--text-secondary)", marginBottom: 18, fontSize: 15 }}>
            Analyze cricket match outcomes using AI-driven scenarios and visual analytics.
          </p>
          {/* Stepper */}
          <ol style={{
            display: "flex", flexDirection: "column",
            margin: "0 auto 30px auto", alignItems: "flex-start",
            listStyleType: "none", padding: 0, maxWidth: 430
          }}>
            {steps.map((step, i) => (
              <li key={step}
                  style={{
                    display: "flex", alignItems: "center",
                    opacity: i <= currentStep ? 1 : 0.45,
                    fontWeight: i === currentStep ? 700 : 400,
                    color: i === currentStep ? "var(--button-bg)" : "var(--text-primary)",
                    fontSize: 16,
                    marginBottom: 3
                  }}>
                <span style={{
                  display: "inline-block", borderRadius: "50%",
                  width: 24, height: 24, background: i === currentStep ? "var(--button-bg)" : "var(--border-color)",
                  color: i === currentStep ? "#fff" : "var(--text-primary)", textAlign: "center",
                  lineHeight: "24px", marginRight: 10, fontSize: 14, fontWeight: 600
                }}>{i + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>
        <main style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 6,
        }}>
          <div style={{ width: "100%", maxWidth: 510 }}>
            {renderStepContent()}
          </div>
        </main>
        <footer style={{ position: "absolute", bottom: 30, width: "100%", textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
          &copy; {new Date().getFullYear()} CricketAI · Built with <span style={{ color: "var(--button-bg)" }}>React</span>
        </footer>
      </header>
    </div>
  );
}

export default App;

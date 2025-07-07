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

// Stepper
const steps = [
  "Enter Match Details",
  "View AI Scenario",
  "Your Prediction",
  "AI Analysis",
  "Visualizations"
];

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Match details state
  const [matchDetails, setMatchDetails] = useState({
    batsman: '', bowler: '', balls_remaining: '', runs_to_get: '', wickets_left: ''
  });

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

  // Stepper logic
  const goNext = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  // PUBLIC_INTERFACE: Handle match details input
  const handleInputChange = (e) => {
    setMatchDetails({ ...matchDetails, [e.target.name]: e.target.value });
  };

  // PUBLIC_INTERFACE: Submit match details and get scenario
  const handleScenarioSubmit = async (e) => {
    e.preventDefault();
    setLoadingScenario(true);
    setScenario('');
    setQuestion('');
    setAnalysis('');
    setVisualData({ batsmen: [], bowlers: [] });
    // Call backend API for scenario generation
    try {
      const resp = await fetch(
        '/api/generate-scenario',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchDetails)
        }
      );
      const data = await resp.json();
      setScenario(data.scenario || "Unable to fetch scenario.");
      // Call backend API for question generation
      const qresp = await fetch('/api/generate-question', {
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
      const resp = await fetch(
        '/api/analyze-scenario',
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
        '/api/visualizations?batsman=' + encodeURIComponent(matchDetails.batsman) + '&bowler=' + encodeURIComponent(matchDetails.bowler)
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
          <form
            className="match-form"
            onSubmit={handleScenarioSubmit}
            autoComplete="off"
            style={{ maxWidth: 370, margin: "auto" }}>
            <h2 className="title" style={{ color: "var(--button-bg)" }}>🏏 Enter Match Details</h2>
            <div className="form-group">
              <label>Batsman</label>
              <input name="batsman" value={matchDetails.batsman} onChange={handleInputChange} required placeholder="e.g., Virat Kohli" />
            </div>
            <div className="form-group">
              <label>Bowler</label>
              <input name="bowler" value={matchDetails.bowler} onChange={handleInputChange} required placeholder="e.g., Jasprit Bumrah" />
            </div>
            <div className="form-group" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>Balls Remaining</label>
                <input
                  name="balls_remaining"
                  type="number"
                  value={matchDetails.balls_remaining}
                  onChange={handleInputChange}
                  min={1}
                  required
                  placeholder="12" />
              </div>
              <div style={{ flex: 1 }}>
                <label>Runs To Get</label>
                <input
                  name="runs_to_get"
                  type="number"
                  value={matchDetails.runs_to_get}
                  onChange={handleInputChange}
                  min={1}
                  required
                  placeholder="25" />
              </div>
            </div>
            <div className="form-group">
              <label>Wickets Left</label>
              <input
                name="wickets_left"
                type="number"
                value={matchDetails.wickets_left}
                onChange={handleInputChange}
                min={1}
                required
                placeholder="5" />
            </div>
            <button
              className="btn btn-large"
              type="submit"
              disabled={loadingScenario}
              style={{ width: "100%", marginTop: "1rem" }}
            >{loadingScenario ? "Generating..." : "Generate Scenario"}</button>
          </form>
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
                  data={visualData.batsmen.length ? visualData.batsmen : [{ name: matchDetails.batsman || 'Batsman', value: 0 }]}
                  label="Batsman Success Rate (%)"
                />
                <PerformanceBarChart
                  data={visualData.bowlers.length ? visualData.bowlers : [{ name: matchDetails.bowler || 'Bowler', value: 0 }]}
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

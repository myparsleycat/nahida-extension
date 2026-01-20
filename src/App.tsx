import { useState, useEffect } from "react";
import { validateApiKey } from "./services/api";
import { getApiKey, setApiKey, getApiKeyValid, setApiKeyValid } from "./services/storage";
import "./App.css";

function App() {
  const [apiKey, setApiKeyInput] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadApiKey() {
      const storedKey = await getApiKey();
      const valid = await getApiKeyValid();

      if (storedKey) {
        setApiKeyInput(storedKey);
        setIsValid(valid);
        setMessage(valid ? "API key is valid" : "API key needs validation");
      }
    }

    loadApiKey();
  }, []);

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setMessage("Please enter an API key");
      return;
    }

    setIsValidating(true);
    setMessage("Validating...");

    const valid = await validateApiKey(apiKey);

    if (valid) {
      await setApiKey(apiKey);
      await setApiKeyValid(true);
      setIsValid(true);
      setMessage("API key is valid and saved!");
    } else {
      await setApiKeyValid(false);
      setIsValid(false);
      setMessage("Invalid API key. Please check and try again.");
    }

    setIsValidating(false);
  };

  return (
    <div className="app-container">
      <h1>GameBanana Enhanced</h1>

      <div className="api-key-section">
        <label htmlFor="api-key">Nahida.live API Key</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="Enter your API key"
          className="api-key-input"
        />

        <button onClick={handleValidate} disabled={isValidating} className="validate-button">
          {isValidating ? "Validating..." : "Validate & Save"}
        </button>

        {message && (
          <div
            className={`message ${isValid === true ? "success" : isValid === false ? "error" : "info"}`}
          >
            {message}
          </div>
        )}

        {isValid && <div className="info-text">Extension is ready to use on gamebanana.com</div>}
      </div>
    </div>
  );
}

export default App;

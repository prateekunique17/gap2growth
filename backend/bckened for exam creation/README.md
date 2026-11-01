# Java Exam Portal

## Run locally

Requires Node.js 18 or newer. In PowerShell:

```powershell
$env:GEMINI_API_KEY = "your Gemini API key"
npm start
```

Open `http://localhost:3000`. The server keeps the Gemini key out of the browser. Submitted results are appended to `data/results.jsonl`.

Choose 10–50 questions. Gemini 3.5 Flash-Lite generates them as parallel batches of up to 10, each as JSON containing the question, four options, and answer index. The server parses and validates each batch before combining them; answer keys stay on the server.

## Safe Exam Browser

Install Safe Exam Browser on the candidate device once. After question generation, click **Start exam in Safe Exam Browser** and approve the browser's open-app prompt. The server generates a per-exam SEB configuration with the exam start URL and a quit URL. After submission, SEB closes and returns to the portal. See the [SEB integration guide](https://safeexambrowser.org/developer/seb-integration.html).

This flow works on the same device as the portal. For networked candidates, deploy the app at a public HTTPS URL with a trusted TLS certificate so SEB can reach it. A web app cannot install SEB or suppress the operating system's confirmation prompt.

The app checks for SEB's user-agent string before loading or submitting the exam. SEB documents this as a basic, spoofable check; this starter is not sufficient by itself for high-stakes or proctored examinations.

## Deployment note

This is a starter app. The server keeps answer keys off the browser and computes scores itself. Before using it for a high stakes exam, add candidate authentication, administrator controls, rate limits, backups, and a managed database; the current result lookup uses the candidate ID as its only lookup credential.

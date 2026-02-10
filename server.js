const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ---------------- GEMINI SETUP ----------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ---------------- FALLBACK AI ----------------
function fallbackSuggestion(emp){
  if(emp.attendance < 15)
    return "Attendance is low. Encourage improvement.";

  if(emp.lateCount > 5)
    return "Frequent late entries detected.";

  if(emp.points > 85)
    return "Excellent performance. Promotion recommended.";

  return "Performance is stable.";
}

// ---------------- GEMINI AI FUNCTION ----------------
async function getAISuggestion(emp){
  try {
    const prompt = `
You are an HR assistant.

Employee performance:
Name: ${emp.name}
Attendance: ${emp.attendance}
Late count: ${emp.lateCount}
Points: ${emp.points}

Give one short HR suggestion.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (error) {
    console.log("AI error, using fallback");
    return fallbackSuggestion(emp);
  }
}

// ---------------- HR LOGIN ----------------
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM hr WHERE username=? AND password=?",
        [username, password],
        (err, row) => {
            if (row) res.send({ success: true });
            else res.send({ success: false });
        }
    );
});

// ---------------- EMPLOYEES ----------------
app.get('/employees', (req, res) => {
    db.all("SELECT * FROM employees", (err, rows) => {
        res.send(rows);
    });
});

// ---------------- REPORTS WITH GEMINI AI ----------------
app.get('/reports', (req, res) => {

    db.all(`
        SELECT 
            e.empId,
            e.name,
            e.teamLeader,
            e.attendance,
            e.lateCount,
            e.points,
            r.teamLeaderReport
        FROM employees e
        LEFT JOIN reports r 
        ON e.empId = r.empId
        GROUP BY e.empId
    `, async (err, rows) => {

        const grouped = {};

        for (const emp of rows) {

            const suggestion = await getAISuggestion(emp);

            if (!grouped[emp.teamLeader])
                grouped[emp.teamLeader] = [];

            grouped[emp.teamLeader].push({
                ...emp,
                suggestion
            });
        }

        res.send(grouped);
    });
});

// ---------------- OVERVIEW ----------------
app.get('/overview', (req, res) => {

    db.all("SELECT * FROM employees ORDER BY points DESC", (err, rows) => {

        const result = rows.map(emp => ({
            ...emp,
            aiScore: emp.points + (emp.attendance - emp.lateCount)
        }));

        res.send(result);
    });
});

// ---------------- BEST EMPLOYEE ----------------
app.get('/best-employee', (req, res) => {
    db.get(
        "SELECT * FROM employees ORDER BY points DESC LIMIT 1",
        (err, row) => res.send(row)
    );
});

// ---------------- SERVER START ----------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

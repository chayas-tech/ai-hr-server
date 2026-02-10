const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));


// ---------------- AI SUGGESTION ENGINE ----------------
function getAISuggestion(emp){
  if(emp.attendance < 15)
    return "Attendance is low. Encourage regular participation.";

  if(emp.lateCount > 5)
    return "Frequent late entries detected. Improve punctuality.";

  if(emp.points > 85)
    return "Excellent performance. Consider promotion.";

  return "Performance is stable.";
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


// ---------------- REPORTS WITH AI ----------------
app.get('/reports', (req, res) => {

    db.all(`
        SELECT e.empId,
               e.name,
               e.teamLeader,
               e.attendance,
               e.lateCount,
               e.points,
               r.teamLeaderReport
        FROM employees e
        JOIN reports r ON e.empId = r.empId
    `, (err, rows) => {

        const grouped = {};

        rows.forEach(emp => {

            const suggestion = getAISuggestion(emp);

            if (!grouped[emp.teamLeader])
                grouped[emp.teamLeader] = [];

            grouped[emp.teamLeader].push({
                ...emp,
                suggestion
            });
        });

        res.send(grouped);
    });
});


// ---------------- OVERVIEW ----------------
app.get('/overview', (req, res) => {

    db.all("SELECT * FROM employees ORDER BY points DESC", (err, rows) => {

        const result = rows.map(emp => {
            return {
                ...emp,
                aiScore: emp.points + (emp.attendance - emp.lateCount)
            };
        });

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

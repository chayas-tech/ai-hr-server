const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hr.db');

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS hr(
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )`);

  // UPDATED EMPLOYEE TABLE (added teamLeader)
  db.run(`CREATE TABLE IF NOT EXISTS employees(
    empId INTEGER PRIMARY KEY,
    name TEXT,
    teamLeader TEXT,
    attendance INTEGER,
    lateCount INTEGER,
    points INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reports(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empId INTEGER,
    teamLeaderReport TEXT
  )`);

  db.run(`INSERT OR IGNORE INTO hr VALUES(1,'admin','1234')`);

  // UPDATED SAMPLE DATA
  db.run(`INSERT OR IGNORE INTO employees VALUES
    (101,'Arun','Ravi',22,1,85),
    (102,'Priya','Ravi',18,6,60),
    (103,'Kumar','Suresh',25,0,92)
  `);

  db.run(`INSERT OR IGNORE INTO reports(empId,teamLeaderReport) VALUES
    (101,'Consistent performer'),
    (102,'Needs improvement in punctuality'),
    (103,'Excellent leadership')
  `);

});

module.exports = db;

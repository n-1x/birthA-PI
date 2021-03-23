const sqlite3 = require("sqlite3").verbose();

const readline = require("readline");
const fs = require("fs");

const fileStream = fs.createReadStream('kbday.txt');
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

const rx = /(.*?) (?:\((.*)\)|-) ?-?(.*)/;
/* TEST DATA FOR REGEX
Jean Paul (BTL) – Jan 1, 1991
PSY – Dec 31, 1977
Sungmin (Bigflo) – Dec 31, 1990
Siyoon (A-Prince) – Dec 31, 1995
A.M (Limitless) – Dec 31, 1996
Chan (A.C.E, UNB) – Dec 31, 1997
Sohee (ELRIS) – Dec 31, 1999
SeungHyun (TheEastLight.) – Dec 31, 2001
Taeil (NCT U, NCT 127) June 14, 1994
*/

const idols = [];

rl.on("line", line => {
    if (line.length < 2) return;

    const res = rx.exec(line);
    
    const name = res[1];
    const role = res[2];
    const dob = res[3];
    
    console.log(name, role, dob);
    idols.push({name, role, dob});

});

rl.on("close", () => {
    console.log(`Finished reading data of ${idols.length} idols`);

    let db = new sqlite3.Database("./kbday.db");
    
    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS idols(name text, role text, birthDay integer, birthMonth integer, birthYear integer)');
    });

    for (const idol of idols) {
        const date = new Date(idol.dob);
        const sql = `INSERT INTO idols(name, role, birthDay, birthMonth, birthYear) 
        VALUES('${idol.name}', '${idol.role}', ${date.getDate()}, ${date.getMonth() + 1}, ${date.getFullYear()})`;

        db.serialize(() => {
            db.run(sql, err => {
                if (err) {
                    console.log("Error inserting: " + err);
                }
            });
        })
    }
    db.close();
});

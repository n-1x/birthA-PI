const http = require("http");
const sqlite3 = require("sqlite3");

function success(res) {
    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    });
    console.log("Success.");
}

function badRequest(res) {
    res.writeHead(400);
    console.log("Bad request.");
}

function internalServerError(res) {
    res.writeHead(500);
    console.error("Internal server error.");
}

function extractValidDate(searchParams, requireYear) {
    const dateArray = ["y", "m", "d"].map(name => searchParams.get(name));
    const isYearSpecified = dateArray[0] !== null;

    let result = null;
    
    if (!requireYear || isYearSpecified) {
        const date = new Date(dateArray);
        
        const validYear = date.getFullYear();
        const validMonth = date.getMonth() + 1;
        const validDay = date.getDate();
        
        const [year, month, day] = dateArray;
        let isValid = validMonth.toString() === month
          && validDay.toString() === day;
        
        if (isYearSpecified) {
            const now = new Date();
            isValid &= validYear.toString() === year
                && validYear <= now.getFullYear();
        }

        if (isValid) {
            result = [isYearSpecified ? validYear : null, validMonth, validDay];
        }
    }

    return result;
}

function getBirthday(res, searchParams) {
    const includeIDs = searchParams.get("id") === "true";
    
    const nameMap = {"y": "birthYear", "m": "birthMonth", "d": "birthDay"};

    let sql = `SELECT ${includeIDs ? "rowid, " : ""}name, role, birthYear, birthMonth, birthDay FROM idols WHERE `;

    let addedOne = false;
    const params = {};
    for (const dateQuery of Object.keys(nameMap)) {
        const val = searchParams.get(dateQuery);

        if (val) {
            if (addedOne) {
                sql += " AND";
            }
            const paramString = `:${dateQuery}`;
            sql += ` ${nameMap[dateQuery]}=${paramString}`;
            addedOne = true;
            params[paramString] = val;
        }
    }

    if (addedOne) {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error("DB error getting: " + err);
                badRequest(res);
            }
            else {
                success(res);
                res.write(JSON.stringify(rows));
            }
            res.end();
        });
    }
}

function addBirthday(res, searchParams) {
    const date = extractValidDate(searchParams, true);
    
    if (date) {
        const [name, role] = ["n", "r"].map(name => searchParams.get(name).trim());
        const [year, month, day] = date;
        const params = {
            ":name": name,
            ":role": role,
            ":year": year,
            ":month": month,
            ":day": day
        };
        const sql = "INSERT INTO idols(name, role, birthYear, birthMonth, birthDay) VALUES(:name, :role, :year, :month, :day)";

        db.run(sql, params, err => {
            if (err) {
                console.error("DB error adding: " + err);
                internalServerError(res);
            }
            else {
                console.log("success");
                success(res);
            }
            res.end();
        });
    }
    else {
        badRequest(res);
        res.end();
    }
}

function delBirthday(res, searchParams) {
    const id = parseInt(searchParams.get("id"));

    if (isNaN(id) || id < 0) {
        badRequest(res);
        res.end();
        return;
    }

    console.log("DELETING rowid " + id);
    const sql = `DELETE FROM idols WHERE rowid=:id`;

    db.run(sql, {":id": id}, err => {
        if (err) {
            console.log("DB error deleting: " + err);
            badRequest(res);
        }
        else {
            console.log("Success");
            success(res);
        }
        res.end();
    });
}

const db = new sqlite3.Database("./kbday.db");
const handlers = {
    "GET": getBirthday,
    "POST": addBirthday,
    "DELETE": delBirthday
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    const handler = handlers[req.method];

    if (handler) {
        const searchParams = new URLSearchParams(req.url.substr(1));
        handler(res, searchParams);
    }
    else {
        badRequest(res);
        res.end();
    }
});

server.on('clientError', (err, socket) => {
    console.error("Client error: " + err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(42000);
console.log("Server started");
